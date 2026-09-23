import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { adminHeaders, createAdminUser, createStoreUser } from "../../utils/admin";
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../utils/seeder";
import { generatePublishableKey, generateStoreHeaders } from "../../utils/store";

jest.setTimeout(120 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: { JWT_SECRET: "supersecret" },
  testSuite: ({ api, getContainer }) => {
    let headers: ReturnType<typeof generateStoreHeaders>;
    let customerId: string;
    let regionId: string;
    let channelId: string;
    let variantId: string;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const key = await generatePublishableKey(container);
      headers = generateStoreHeaders({ publishableKey: key });
      const { customer, token } = await createStoreUser({ api, storeHeaders: headers });
      customerId = customer.id;
      headers.headers["Authorization"] = `Bearer ${token}`;

      const region = await regionSeeder({
        api,
        adminHeaders,
        data: { payment_providers: ["pp_system_default"] },
      });
      regionId = region.id;
      const channel = await salesChannelSeeder({ api, adminHeaders, data: {} });
      channelId = channel.id;
      const product = await productSeeder({
        api,
        adminHeaders,
        data: { sales_channels: [{ id: channelId }] },
      });
      variantId = product.variants[0].id;
      await api.post(
        `/admin/api-keys/${key.id}/sales-channels`,
        { add: [channelId] },
        adminHeaders
      );
    });

    const registerCompany = async () => {
      const { data } = await api.post(
        "/store/companies",
        { name: "Buyer Co", email: "buyer@example.com", currency_code: "usd" },
        headers
      );
      return data.companies[0];
    };

    const createBuyerCart = async (companyId?: string) =>
      cartSeeder({
        api,
        storeHeaders: headers,
        data: {
          region_id: regionId,
          sales_channel_id: channelId,
          email: "test@email.com",
          ...(companyId ? { metadata: { company_id: companyId } } : {}),
          items: [{ variant_id: variantId, quantity: 1 }],
        },
      });

    it("registers a company administrator and lets the employee sign in", async () => {
      const company = await registerCompany();
      expect(company).toMatchObject({
        id: expect.any(String),
        name: "Buyer Co",
        approval_settings: expect.objectContaining({
          requires_admin_approval: false,
        }),
      });

      const { data: created } = await api.get(
        `/store/companies/${company.id}/employees`,
        headers
      );
      expect(created.employees[0]).toMatchObject({
        id: expect.any(String),
        company_id: company.id,
        is_admin: true,
      });

      const { data: login } = await api.post("/auth/customer/emailpass", {
        email: "test@email.com",
        password: "password",
      });
      expect(login.token).toEqual(expect.any(String));
      const signedIn = {
        headers: { ...headers.headers, Authorization: `Bearer ${login.token}` },
      };
      const { data: profile } = await api.get(
        "/store/customers/me?fields=+employee.*,+employee.company.*",
        signedIn
      );
      expect(profile.customer.employee).toMatchObject({
        id: created.employees[0].id,
        company_id: company.id,
      });
    });

    it("creates a quote from a cart and only accepts it after it is sent", async () => {
      const cart = await createBuyerCart();
      const { data: created } = await api.post(
        "/store/quotes",
        { cart_id: cart.id },
        headers
      );
      expect(created.quote).toMatchObject({
        cart_id: cart.id,
        draft_order_id: expect.any(String),
        draft_order: expect.objectContaining({ status: "draft" }),
      });

      const premature = await api
        .post(`/store/quotes/${created.quote.id}/accept`, {}, headers)
        .catch((error) => error.response);
      expect(premature.status).toBeGreaterThanOrEqual(400);

      await api.post(`/admin/quotes/${created.quote.id}/send`, {}, adminHeaders);
      const { data: accepted } = await api.post(
        `/store/quotes/${created.quote.id}/accept?fields=+draft_order.status`,
        {},
        headers
      );
      expect(accepted.quote.draft_order.status).toBe("pending");
    });

    it("blocks checkout while a company approval is pending and releases it when approved", async () => {
      const company = await registerCompany();
      const settings = await api.post(
        `/store/companies/${company.id}/approval-settings`,
        { requires_admin_approval: true },
        headers
      );
      expect(settings.status).toBe(201);

      const cart = await createBuyerCart(company.id);
      expect(cart.items).toEqual([
        expect.objectContaining({ variant_id: variantId, quantity: 1 }),
      ]);
      const { data: submitted } = await api.post(
        `/store/carts/${cart.id}/approvals`,
        {},
        headers
      );
      const approval = submitted.approvals[0];
      expect(approval).toMatchObject({
        cart_id: cart.id,
        status: "pending",
        type: "admin",
      });

      const { data: payment } = await api.post(
        "/store/payment-collections",
        { cart_id: cart.id },
        headers
      );
      expect(payment.payment_collection.id).toEqual(expect.any(String));
      await api.post(
        `/store/payment-collections/${payment.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        headers
      );

      const checkout = await api
        .post(`/store/carts/${cart.id}/complete`, {}, headers)
        .catch((error) => error.response);
      expect(checkout.status).toBeGreaterThanOrEqual(400);
      expect(checkout.data.type).toBe("unknown_error");

      const { data: updated } = await api.post(
        `/store/approvals/${approval.id}`,
        { status: "approved" },
        headers
      );
      expect(updated.approval).toMatchObject({
        id: approval.id,
        status: "approved",
        handled_by: customerId,
      });
      const { data: refreshed } = await api.get(
        `/store/carts/${cart.id}?fields=+approval_status.*,+approvals.*`,
        headers
      );
      expect(refreshed.cart.approval_status.status).toBe("approved");

      const afterApproval = await api.post(
        `/store/carts/${cart.id}/complete`,
        {},
        headers
      );
      expect(afterApproval.status).toBe(200);
      expect(afterApproval.data.type).toBe("order");
      expect(afterApproval.data.order.id).toEqual(expect.any(String));
    });
  },
});