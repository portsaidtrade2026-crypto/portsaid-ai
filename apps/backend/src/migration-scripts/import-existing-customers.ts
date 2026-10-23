import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows";

// Imports Ahmed's existing business customers (from his CRM export) as
// has_account=false records - real business contacts, not yet able to log
// in. Each one can later use the storefront's "Already a customer? Set your
// password" flow (see workflows/customer/claim-existing-customer.ts) to
// claim their own record by email and set a password themselves.
//
// The source file is deliberately NOT committed to git (real customer PII -
// see .gitignore) - it must be uploaded directly into the Replit workspace
// at apps/backend/private-data/customers.json before running this script.
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const CUSTOMERS_JSON = path.join(
  REPO_ROOT,
  "apps/backend/private-data/customers.json"
);

type SourceCustomer = {
  company_name: string;
  email: string;
  contact_name: string;
  phone: string;
  address: string;
  sales_class: string;
  product_class: string;
  erp_id: string;
};

export default async function import_existing_customers({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  if (!fs.existsSync(CUSTOMERS_JSON)) {
    logger.info(
      `No file at apps/backend/private-data/customers.json - upload it first, then re-run this script.`
    );
    return;
  }

  const source: SourceCustomer[] = JSON.parse(
    fs.readFileSync(CUSTOMERS_JSON, "utf8")
  );

  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  });
  const existingEmails = new Set(
    (existing as any[]).map((c) => String(c.email || "").toLowerCase())
  );

  const toCreate = source.filter(
    (c) => !existingEmails.has(c.email.toLowerCase())
  );
  const skippedExisting = source.length - toCreate.length;

  if (!toCreate.length) {
    logger.info(
      `Nothing to import - all ${source.length} customers already exist (matched by email).`
    );
    return;
  }

  const customersData = toCreate.map((c) => ({
    email: c.email,
    first_name: c.contact_name || c.company_name,
    company_name: c.company_name,
    phone: c.phone || undefined,
    has_account: false,
    metadata: {
      address: c.address,
      sales_class: c.sales_class,
      product_class: c.product_class,
      erp_id: c.erp_id,
      source: "crm_import",
    },
  }));

  // Batch to keep each workflow run a reasonable size.
  const BATCH = 50;
  let created = 0;
  const errors: Array<{ email: string; error: string }> = [];
  for (let i = 0; i < customersData.length; i += BATCH) {
    const batch = customersData.slice(i, i + BATCH);
    try {
      const { result } = await createCustomersWorkflow(container).run({
        input: { customersData: batch },
      });
      created += result.length;
    } catch (e: any) {
      for (const c of batch) {
        errors.push({ email: c.email, error: String(e?.message || e) });
      }
    }
  }

  logger.info(
    `Customer import: ${created} created, ${skippedExisting} already existed (skipped), ${errors.length} failed.`
  );
  if (errors.length) {
    logger.info(`First failures: ${JSON.stringify(errors.slice(0, 5))}`);
  }
}
