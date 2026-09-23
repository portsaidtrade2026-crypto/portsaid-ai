import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../utils/admin";
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../utils/seeder";
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../utils/store";

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    JWT_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    let storeHeaders, cart, product, salesChannel, region, customerToken;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const publishableKey = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey });
      const res = await createStoreUser({ api, storeHeaders });
      customerToken = res.token;
      storeHeaders.headers["Authorization"] = `Bearer ${customerToken}`;
      region = await regionSeeder({ api, adminHeaders, data: {} });

      salesChannel = await salesChannelSeeder({
        api,
        adminHeaders,
        data: {},
      });

      product = await productSeeder({
        api,
        adminHeaders,
        data: {
          sales_channels: [{ id: salesChannel.id }],
        },
      });

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders
      );

      cart = await cartSeeder({
        api,
        storeHeaders,
        data: {
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          items: [{ quantity: 1, variant_id: product.variants[0].id }],
        },
      });
    });

    describe("POST /store/companies", () => {
      it("successfully creates a company", async () => {
        const response = await api.post(
          "/store/companies",
          {
            name: "Test Company",
            email: "test@company.com",
            phone: "1234567890",
            address: "123 Test St",
            city: "Test City",
            state: "Test State",
            zip: "12345",
            country: "Test Country",
            logo_url: "http://test.com/logo.png",
            currency_code: "USD",
            spending_limit_reset_frequency: "monthly",
          },
          storeHeaders
        );

        expect(response.status).toEqual(200);
        expect(response.data.companies[0]).toMatchObject({
          id: expect.any(String),
          name: "Test Company",
          email: "test@company.com",
          phone: "1234567890",
          address: "123 Test St",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "Test Country",
          logo_url: "http://test.com/logo.png",
          currency_code: "USD",
        });
      });
    });

    describe("GET /store/companies/:id", () => {
      it("successfully retrieves a company", async () => {
        const response1 = await api.post(
          "/store/companies",
          {
            name: "Test Company",
            email: "test@company.com",
            phone: "1234567890",
            address: "123 Test St",
            city: "Test City",
            state: "Test State",
            zip: "12345",
            country: "Test Country",
            logo_url: "http://test.com/logo.png",
            currency_code: "USD",
            spending_limit_reset_frequency: "monthly",
          },
          storeHeaders
        );

        const response2 = await api.get(
          `/store/companies/${response1.data.companies[0].id}`,
          storeHeaders
        );

        expect(response2.data.company).toMatchObject({
          id: expect.any(String),
          name: "Test Company",
          email: "test@company.com",
          phone: "1234567890",
          address: "123 Test St",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "Test Country",
          logo_url: "http://test.com/logo.png",
          currency_code: "USD",
        });
      });

      it("should throw error when company does not exist", async () => {
        const { response } = await api
          .get(`/store/companies/does-not-exist`, storeHeaders)
          .catch((e) => e);

        expect(response.data).toMatchObject({
          type: "not_found",
        });
      });
    });

    describe("POST /store/companies/:id", () => {
      let company1;

      beforeEach(async () => {
        const response = await api.post(
          "/store/companies",
          {
            name: "Test Company",
            email: "test@company.com",
            phone: "1234567890",
            address: "123 Test St",
            city: "Test City",
            state: "Test State",
            zip: "12345",
            country: "Test Country",
            logo_url: "http://test.com/logo.png",
            currency_code: "USD",
            spending_limit_reset_frequency: "monthly",
          },
          storeHeaders
        );

        company1 = response.data.companies[0];
      });

      it("successfully updates a company", async () => {
        const response = await api.post(
          `/store/companies/${company1.id}`,
          {
            name: "Updated Company",
            email: "updated@company.com",
            phone: "0987654321",
            address: "456 Updated Ave",
            city: "Updated City",
            state: "Updated State",
            zip: "54321",
            country: "Updated Country",
            logo_url: "http://updated.com/logo.png",
            currency_code: "EUR",
            spending_limit_reset_frequency: "yearly",
          },
          storeHeaders
        );

        expect(response.data.company).toMatchObject({
          id: company1.id,
          name: "Updated Company",
          email: "updated@company.com",
          phone: "0987654321",
          address: "456 Updated Ave",
          city: "Updated City",
          state: "Updated State",
          zip: "54321",
          country: "Updated Country",
          logo_url: "http://updated.com/logo.png",
          currency_code: "EUR",
        });
      });

      it("should throw an error when company does not exist", async () => {
        const { response } = await api
          .post(
            `/store/companies/does-not-exist`,
            { name: "Nonexistent Company" },
            storeHeaders
          )
          .catch((e) => e);

        expect(response.data).toMatchObject({
          type: "not_found",
        });
      });
    });

    describe("DELETE /store/companies/:id", () => {
      let company1;

      beforeEach(async () => {
        const response = await api.post(
          "/store/companies",
          {
            name: "Test Company",
            email: "test@company.com",
            phone: "1234567890",
            address: "123 Test St",
            city: "Test City",
            state: "Test State",
            zip: "12345",
            country: "Test Country",
            logo_url: "http://test.com/logo.png",
            currency_code: "USD",
            spending_limit_reset_frequency: "monthly",
          },
          storeHeaders
        );

        company1 = response.data.companies[0];
      });

      it("successfully deletes a company", async () => {
        const response = await api.delete(
          `/store/companies/${company1.id}`,
          storeHeaders
        );

        expect(response.status).toEqual(204);
      });

      it("should throw an error when company does not exist", async () => {
        const response = await api
          .delete(`/store/companies/does-not-exist`, storeHeaders)
          .catch((e) => e);

        expect(response.response.status).toEqual(404);
      });
    });

    describe("company access", () => {
      const createCompany = async (headers, name) => {
        const { data } = await api.post(
          "/store/companies",
          { name, email: `${name.toLowerCase()}@example.com`, currency_code: "usd" },
          headers
        );
        return data.companies[0];
      };

      const createCustomer = async (email) => {
        const registerToken = (await api.post("/auth/customer/emailpass/register", {
          email,
          password: "password",
        })).data.token;
        const headers = {
          headers: {
            ...storeHeaders.headers,
            Authorization: `Bearer ${registerToken}`,
          },
        };
        const customer = (await api.post("/store/customers", { email }, headers)).data.customer;
        const token = (await api.post("/auth/customer/emailpass", {
          email,
          password: "password",
        })).data.token;
        headers.headers.Authorization = `Bearer ${token}`;
        return { customer, headers };
      };

      it("blocks another company's administrator and employee from reading or changing its records", async () => {
        const companyA = await createCompany(storeHeaders, "Alpha");
        const ownerB = await createCustomer("owner-b@example.com");
        const companyB = await createCompany(ownerB.headers, "Bravo");
        const employeeA = await createCustomer("employee-a@example.com");
        await api.post(
          `/store/companies/${companyA.id}/employees`,
          { customer_id: employeeA.customer.id, is_admin: false },
          storeHeaders
        );
        const { data: employeesB } = await api.get(
          `/store/companies/${companyB.id}/employees`,
          ownerB.headers
        );
        const targetId = employeesB.employees[0].id;

        const forbidden = async (promise) => {
          const { response } = await promise.catch((error) => error);
          expect(response.status).toBe(403);
        };

        for (const headers of [storeHeaders, employeeA.headers]) {
          await forbidden(api.get(`/store/companies/${companyB.id}`, headers));
          await forbidden(api.get(`/store/companies/${companyB.id}/employees`, headers));
          await forbidden(api.get(`/store/companies/${companyB.id}/employees/${targetId}`, headers));
          await forbidden(api.post(`/store/companies/${companyB.id}`, { name: "Hijacked" }, headers));
          await forbidden(api.post(`/store/companies/${companyB.id}/employees`, {
            customer_id: employeeA.customer.id,
          }, headers));
          await forbidden(api.post(`/store/companies/${companyB.id}/employees/${targetId}`, {
            spending_limit: 100,
          }, headers));
          await forbidden(api.delete(`/store/companies/${companyB.id}/employees/${targetId}`, headers));
          await forbidden(api.post(`/store/companies/${companyB.id}/approval-settings`, {
            requires_admin_approval: true,
          }, headers));
          await forbidden(api.delete(`/store/companies/${companyB.id}`, headers));
        }

        const { data: after } = await api.get(`/store/companies/${companyB.id}`, ownerB.headers);
        expect(after.company.name).toBe("Bravo");
        expect(after.company.approval_settings.requires_admin_approval).toBe(false);
        const { data: employeeAfter } = await api.get(
          `/store/companies/${companyB.id}/employees/${targetId}`,
          ownerB.headers
        );
        expect(Number(employeeAfter.employee.spending_limit)).toBe(0);
      });

      it("allows members to read their own company but reserves writes for its admins", async () => {
        const company = await createCompany(storeHeaders, "Alpha");
        const member = await createCustomer("member@example.com");
        await api.post(`/store/companies/${company.id}/employees`, {
          customer_id: member.customer.id,
        }, storeHeaders);

        expect((await api.get(`/store/companies/${company.id}`, member.headers)).status).toBe(200);
        expect((await api.get(`/store/companies/${company.id}/employees`, member.headers)).status).toBe(200);
        const { response } = await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: true },
          member.headers
        ).catch((error) => error);
        expect(response.status).toBe(403);
        expect((await api.post(
          `/store/companies/${company.id}/approval-settings`,
          { requires_admin_approval: true },
          storeHeaders
        )).status).toBe(201);
      });
    });
  },
});
