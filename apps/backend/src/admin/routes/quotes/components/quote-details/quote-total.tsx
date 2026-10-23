import { AdminOrder, AdminOrderPreview } from "@medusajs/framework/types";
import { Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { formatAmount } from "../../../../utils";

export const QuoteTotal = ({
  order,
  preview,
}: {
  order: AdminOrder;
  preview: AdminOrderPreview;
}) => {
  const { t } = useTranslation();

  // Ahmed: the customer must see the 20% KDV called out as its own line, not just folded
  // silently into the total - preview.summary only carries the final current_order_total
  // (the pending-edit total), with no subtotal/tax split of its own, so the breakdown is
  // summed here from each line's own post-edit subtotal/tax_total (the real values Medusa
  // just computed for this edit, not a hand-rolled *1.2 guess - robust even if a future
  // product ever gets a different tax rule).
  const previewSubtotal = preview.items.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const previewTax = preview.items.reduce(
    (sum, item) => sum + item.tax_total,
    0
  );

  return (
    <div className=" flex flex-col gap-y-2 px-6 py-4">
      <div className="text-ui-fg-base flex items-center justify-between">
        <Text
          weight="plus"
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          Original Total
        </Text>
        <Text
          weight="plus"
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          {formatAmount(order.total, order.currency_code)}
        </Text>
      </div>

      <div className="text-ui-fg-base flex items-center justify-between">
        <Text
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          Ürün bedeli (KDV hariç)
        </Text>
        <Text
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          {formatAmount(previewSubtotal, order.currency_code)}
        </Text>
      </div>

      <div className="text-ui-fg-base flex items-center justify-between">
        <Text
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          KDV (%20)
        </Text>
        <Text
          className="text-ui-fg-subtle"
          size="small"
          leading="compact"
        >
          {formatAmount(previewTax, order.currency_code)}
        </Text>
      </div>

      <div className="text-ui-fg-base flex items-center justify-between">
        <Text
          className="text-ui-fg-subtle text-semibold"
          size="small"
          leading="compact"
          weight="plus"
        >
          Quote Total (KDV dahil)
        </Text>
        <Text
          className="text-ui-fg-subtle text-bold"
          size="small"
          leading="compact"
          weight="plus"
        >
          {formatAmount(preview.summary.current_order_total, order.currency_code)}
        </Text>
      </div>
    </div>
  );
};
