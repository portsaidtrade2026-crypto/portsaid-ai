import * as fs from "fs";
import * as path from "path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows";

// Imports Ahmed's real customer list (name + email only, no phone/address -
// see MÜŞTERİ BİLGİ / musteri-listesi export) as has_account=false records,
// same claim-account flow as import-existing-customers.ts. Source file is
// gitignored (apps/backend/private-data/) - real customer PII, never
// committed.
const REPO_ROOT = path.resolve(__dirname, "../../../../");
const CUSTOMERS_CSV = path.join(
  REPO_ROOT,
  "apps/backend/private-data/customers-474-name-email.csv"
);

// Minimal CSV line parser - handles our file's simple "quoted,quoted" shape
// (no embedded quotes or newlines inside a field).
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

export default async function import_customers_name_email({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  if (!fs.existsSync(CUSTOMERS_CSV)) {
    logger.info(
      `No file at apps/backend/private-data/customers-474-name-email.csv - upload it first, then re-run this script.`
    );
    return;
  }

  const lines = fs
    .readFileSync(CUSTOMERS_CSV, "utf8")
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);

  // First line is the header ("الاسم,البريد الإلكتروني") - skip it.
  const rows = lines.slice(1).map(parseCsvLine);
  const source = rows
    .filter((r) => r.length >= 2 && r[1])
    .map((r) => ({ name: r[0], email: r[1] }));

  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  });
  const existingEmails = new Set(
    (existing as any[]).map((c) => String(c.email || "").toLowerCase())
  );

  const seen = new Set<string>();
  const toCreate = source.filter((c) => {
    const key = c.email.toLowerCase();
    if (existingEmails.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const skippedExisting = source.length - toCreate.length;

  if (!toCreate.length) {
    logger.info(
      `Nothing to import - all ${source.length} customers already exist or were duplicates.`
    );
    return;
  }

  const customersData = toCreate.map((c) => ({
    email: c.email,
    first_name: c.name,
    has_account: false,
    metadata: { source: "crm_import_name_email" },
  }));

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
    `Customer import: ${created} created, ${skippedExisting} already existed/duplicate (skipped), ${errors.length} failed, ${source.length} total in file.`
  );
  if (errors.length) {
    logger.info(`First failures: ${JSON.stringify(errors.slice(0, 5))}`);
  }
}
