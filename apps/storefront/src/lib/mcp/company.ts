// Company facts served by the public MCP server's `get_company_info` tool. Everything here is already public (website
// footer / info pages) or was approved by the owner for customers (delivery area, lead times, payment terms). Prices are
// NOT listed anywhere on the site (quote-based B2B), so none are exposed here either.

export const COMPANY = {
  name: "PORTSAID PLASTİK",
  brand: "PS PORT",
  description:
    "Beylikdüzü / İstanbul merkezli ambalaj ve endüstriyel tedarik firması; işletmelere toptan tedarik yapar.",
  website: "https://portsaid.com.tr",
  address: "PORTSAİD PLASTİK — deposu ve ofisi Beylikdüzü / İstanbul",
  hours: "Hafta içi 08:30–17:30",
  phone: "+90 212 875 06 05",
  whatsapp: "https://wa.me/902128750605",
  email: "info@portsaid.com.tr",
  languages: ["tr", "en", "bg", "ar"],
} as const

export const TOPICS = ["about", "products", "delivery", "payment", "quote", "contact"] as const
export type Topic = (typeof TOPICS)[number]

const SECTIONS: Record<Topic, Record<string, unknown>> = {
  about: {
    summary: COMPANY.description,
    sells: [
      "Streç film (endüstriyel, jumbo, gıda, pre-streç)",
      "Balonlu naylon",
      "Koli bantları",
      "Ambalaj makineleri ve sarf malzemeleri",
      "Ofis kırtasiye ve mobilya",
    ],
    customers: "İşletmeler (B2B, toptan). Perakende / bireysel satış yapılmaz.",
    languages: "Web sitesi Türkçe, İngilizce, Bulgarca ve Arapça sunulur.",
  },
  products: {
    note: "Katalog sitede yayınlanır; search_products / get_product / list_categories araçlarıyla taranabilir.",
    pricing: "Ürün fiyatları sitede listelenmez; her sipariş için teklif verilir.",
    samples: "Numune verilebilir; ayrıntı için iletişime geçin.",
  },
  delivery: {
    area: "İstanbul Avrupa yakasına teslimat yapılır. Bunun dışındaki yerler için teslimat imkânı sipariş sonrası teyit edilir.",
    lead_times: {
      "stoktaki ürünler ve 1 tona kadar siparişler": "1–3 iş günü",
      "1 tonun üzerindeki siparişler": "1 gün ile 1 hafta arası",
      "Pat Pat (özel üretim)": "1 hafta ile 10 gün arası",
    },
    pickup: "Küçük miktarlar depodan (Beylikdüzü / İstanbul) elden teslim alınabilir.",
  },
  payment: {
    methods: "Havale/EFT ve nakit.",
    credit: "Vadeli çalışma satış sorumlusunun onayına bağlıdır.",
  },
  quote: {
    how: [
      "Web sitesinde ürünleri sepete ekleyip hesabınızdan “Teklif iste” ile teklif talep edin; veya",
      "WhatsApp / telefon / e-posta ile ürün adı, miktar ve teslimat adresini iletin.",
    ],
    response: "Teklifler satış ekibi tarafından hazırlanır; fiyatlar bu MCP sunucusunda yayınlanmaz.",
  },
  contact: {
    phone: COMPANY.phone,
    whatsapp: COMPANY.whatsapp,
    email: COMPANY.email,
    hours: COMPANY.hours,
    address: COMPANY.address,
    website: COMPANY.website,
  },
}

/** One topic, or every topic when none is given. */
export function companyInfo(topic?: string): Record<string, unknown> {
  const base = { name: COMPANY.name, brand: COMPANY.brand, website: COMPANY.website }
  if (topic && (TOPICS as readonly string[]).includes(topic)) return { ...base, topic, ...SECTIONS[topic as Topic] }
  return { ...base, ...SECTIONS }
}
