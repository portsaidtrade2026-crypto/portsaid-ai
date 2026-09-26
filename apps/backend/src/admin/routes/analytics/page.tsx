import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChartBar } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/client";

// Simple monthly rollups for orders and new customers, built with plain CSS
// bars rather than a charting library - the project doesn't have one
// installed, and adding one just for this would mean a new dependency and
// a full rebuild for a handful of bars.
type MonthBucket = { key: string; label: string; count: number; total: number };

const LAST_N_MONTHS = 6;

function monthBuckets(): MonthBucket[] {
  const out: MonthBucket[] = [];
  const now = new Date();
  for (let i = LAST_N_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    out.push({ key, label, count: 0, total: 0 });
  }
  return out;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const Bars = ({
  buckets,
  valueOf,
  formatValue,
}: {
  buckets: MonthBucket[];
  valueOf: (b: MonthBucket) => number;
  formatValue: (n: number) => string;
}) => {
  const max = Math.max(1, ...buckets.map(valueOf));
  return (
    <div className="flex items-end gap-4 h-48 px-6 pb-6">
      {buckets.map((b) => {
        const v = valueOf(b);
        const heightPct = Math.round((v / max) * 100);
        return (
          <div key={b.key} className="flex flex-col items-center gap-2 flex-1">
            <Text size="small" className="text-ui-fg-subtle">
              {formatValue(v)}
            </Text>
            <div className="w-full bg-ui-bg-subtle rounded-t-md flex items-end" style={{ height: 120 }}>
              <div
                className="w-full bg-ui-tag-blue-icon rounded-t-md"
                style={{ height: `${Math.max(heightPct, v > 0 ? 4 : 0)}%` }}
              />
            </div>
            <Text size="small" className="text-ui-fg-muted">
              {b.label}
            </Text>
          </div>
        );
      })}
    </div>
  );
};

const Analytics = () => {
  const buckets = monthBuckets();
  const earliest = buckets[0].key + "-01";

  const { data: orderData, isLoading: ordersLoading } = useQuery({
    queryKey: ["analytics-orders", earliest],
    queryFn: () =>
      sdk.admin.order.list({
        fields: "id,created_at,total,currency_code",
        limit: 1000,
        order: "-created_at",
      }),
  });

  const { data: customerData, isLoading: customersLoading } = useQuery({
    queryKey: ["analytics-customers", earliest],
    queryFn: () =>
      sdk.admin.customer.list({
        fields: "id,created_at,has_account",
        limit: 1000,
        order: "-created_at",
      }),
  });

  const orderBuckets = buckets.map((b) => ({ ...b }));
  for (const o of orderData?.orders || []) {
    const k = monthKey(o.created_at as unknown as string);
    const bucket = orderBuckets.find((b) => b.key === k);
    if (bucket) {
      bucket.count += 1;
      bucket.total += Number(o.total || 0);
    }
  }

  const customerBuckets = buckets.map((b) => ({ ...b }));
  for (const c of customerData?.customers || []) {
    const k = monthKey(c.created_at as unknown as string);
    const bucket = customerBuckets.find((b) => b.key === k);
    if (bucket) bucket.count += 1;
  }

  const totalOrders = orderData?.count ?? 0;
  const totalCustomers = customerData?.count ?? 0;
  const accountsClaimed =
    customerData?.customers?.filter((c: any) => c.has_account).length ?? 0;

  return (
    <Container className="flex flex-col p-0 overflow-hidden">
      <Heading className="p-6 pb-0 font-sans font-medium h1-core">
        Analytics
      </Heading>
      <div className="grid grid-cols-3 gap-4 px-6 pt-6">
        <div className="p-4 border rounded-lg">
          <Text size="small" className="text-ui-fg-subtle">
            Total orders
          </Text>
          <Heading level="h2">{totalOrders}</Heading>
        </div>
        <div className="p-4 border rounded-lg">
          <Text size="small" className="text-ui-fg-subtle">
            Total customers
          </Text>
          <Heading level="h2">{totalCustomers}</Heading>
        </div>
        <div className="p-4 border rounded-lg">
          <Text size="small" className="text-ui-fg-subtle">
            Accounts claimed
          </Text>
          <Heading level="h2">{accountsClaimed}</Heading>
        </div>
      </div>

      <Heading level="h2" className="px-6 pt-8 pb-2">
        Orders per month
      </Heading>
      {ordersLoading ? (
        <Text className="px-6 pb-6 text-ui-fg-subtle">Loading...</Text>
      ) : (
        <Bars
          buckets={orderBuckets}
          valueOf={(b) => b.count}
          formatValue={(n) => String(n)}
        />
      )}

      <Heading level="h2" className="px-6 pt-4 pb-2">
        New customers per month
      </Heading>
      {customersLoading ? (
        <Text className="px-6 pb-6 text-ui-fg-subtle">Loading...</Text>
      ) : (
        <Bars
          buckets={customerBuckets}
          valueOf={(b) => b.count}
          formatValue={(n) => String(n)}
        />
      )}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Analytics",
  icon: ChartBar,
});

export default Analytics;
