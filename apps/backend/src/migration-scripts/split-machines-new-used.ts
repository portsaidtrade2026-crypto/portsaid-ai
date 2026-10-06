import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Ahmed's call (2026-10-03): split machines into new vs. used, nested as
//   Makineler > Ambalaj Makineleri > Yeni / İkinci
// (not siblings directly under Makineler). Ahmed confirmed the products
// currently filed directly under "Ambalaj Makineleri" are ALL used
// machines ("الثلاثة مستعملين وليس هناك جديد الان" - there is no new stock
// right now) - so they move into "İkinci", not "Yeni". "Yeni" is created
// empty, ready for whenever new-machine stock exists.
const PARENT_NAME = "Ambalaj Makineleri";
const NEW_CHILD_NAME = "Yeni";
const USED_CHILD_NAME = "İkinci";

export default async function split_machines_new_used({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
  });
  const byName = new Map((categories as any[]).map((c) => [c.name, c]));

  const parent = byName.get(PARENT_NAME);
  if (!parent) {
    logger.info(`Skip: category "${PARENT_NAME}" not found.`);
    return;
  }

  const toCreate = [NEW_CHILD_NAME, USED_CHILD_NAME].filter(
    (name) => !byName.has(name)
  );
  if (toCreate.length) {
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: toCreate.map((name) => ({
          name,
          is_active: true,
          parent_category_id: parent.id,
        })),
      },
    });
    for (const c of created as any[]) byName.set(c.name, c);
    logger.info(`Created: ${toCreate.join(", ")} under "${PARENT_NAME}".`);
  } else {
    logger.info(`"${NEW_CHILD_NAME}" and "${USED_CHILD_NAME}" already exist - skipping creation.`);
  }

  const usedCategory = byName.get(USED_CHILD_NAME);

  // Move every product tagged directly on "Ambalaj Makineleri" into
  // "İkinci" ONLY (not both). The sidebar's product count is a recursive
  // rollup (parent count = own direct products + every descendant's), so
  // tagging a product on both the parent AND the child double-counts it;
  // the parent page already shows descendant products on its own via that
  // same recursive listing, so direct parent tagging isn't needed for
  // visibility - only for counting correctly.
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "categories.id", "categories.name"],
  });
  const toMove = (products as any[]).filter((p) =>
    (p.categories || []).some((c: any) => c.id === parent.id) &&
    !(p.categories || []).some((c: any) => c.id === usedCategory.id)
  );

  if (!toMove.length) {
    logger.info(`No products directly under "${PARENT_NAME}" to move into "${USED_CHILD_NAME}".`);
  } else {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: toMove.map((p) => p.id) },
        update: { category_ids: [usedCategory.id] },
      },
    });
    logger.info(`Moved ${toMove.length} product(s) into "${PARENT_NAME} > ${USED_CHILD_NAME}".`);
  }

  // Also fix any product already dual-tagged from a prior run of this
  // script (parent + İkinci) - strip the now-redundant parent tag.
  const dualTagged = (products as any[]).filter(
    (p) =>
      (p.categories || []).some((c: any) => c.id === parent.id) &&
      (p.categories || []).some((c: any) => c.id === usedCategory.id)
  );
  if (dualTagged.length) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: dualTagged.map((p) => p.id) },
        update: { category_ids: [usedCategory.id] },
      },
    });
    logger.info(`Fixed ${dualTagged.length} product(s) that were double-tagged (parent + İkinci) from an earlier run.`);
  }

  logger.info(
    `Done. "${PARENT_NAME} > ${NEW_CHILD_NAME}" is empty and ready for whenever new-machine stock exists.`
  );
}
