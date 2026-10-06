import { notFound } from "next/navigation"

// Generic content page for footer links that don't have (or don't yet
// need) their own route - real copy for the two we can write ourselves
// (About/Contact use facts already in the codebase), a clearly-labelled
// "content coming soon" placeholder for the legal/compliance pages, since
// those need real legal text from Ahmed or a lawyer, not invented text -
// publishing a fabricated KVKK/ETBİS/distance-sales text would be a real
// compliance problem for a live Turkish e-commerce site, not just a
// cosmetic gap.
const PAGES: Record<string, { title: string; body: string[]; isLegalPlaceholder?: boolean }> = {
  hakkimizda: {
    title: "Hakkımızda",
    body: [
      "PS PORT (Portsaid Plastik), Beylikdüzü / İstanbul merkezli bir ambalaj ve endüstriyel tedarik firmasıdır.",
      "Streç film, balonlu naylon, koli bandı, ambalaj makineleri, ofis kırtasiye ve mobilya ürünlerini işletmelere toptan tedarik ediyoruz.",
    ],
  },
  "bize-ulasin": {
    title: "Bize Ulaşın",
    body: [
      "WhatsApp: +90 212 875 0605",
      "E-posta: info@portsaid.com.tr",
      "Sorularınız için yukarıdaki WhatsApp hattından veya hesabınızdan \"Teklif iste\" ile bize ulaşabilirsiniz.",
    ],
  },
}

const LEGAL_PLACEHOLDER_TITLES: Record<string, string> = {
  "odeme-secenekleri": "Ödeme Seçenekleri",
  "kargo-ve-teslimat": "Kargo ve Teslimat",
  "mesafeli-satis-sozlesmesi": "Mesafeli Satış Sözleşmesi",
  "iptal-ve-iade-kosullari": "İptal ve İade Koşulları",
  "ticari-elektronik-ileti-onay-metni": "Ticari Elektronik İleti Onay Metni",
  "gizlilik-ve-guvenlik": "Gizlilik ve Güvenlik",
  "uyelik-sozlesmesi": "Üyelik Sözleşmesi",
  "cerez-politikasi": "Çerez Politikası",
  "aydinlatma-metni": "Aydınlatma Metni",
}

export default async function InfoPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const page = PAGES[slug]

  if (page) {
    return (
      <div className="content-container py-16 max-w-2xl">
        <h1 className="text-3xl font-semibold mb-8">{page.title}</h1>
        {page.body.map((p, i) => (
          <p key={i} className="text-[var(--ps-muted)] leading-7 mb-4">
            {p}
          </p>
        ))}
      </div>
    )
  }

  const legalTitle = LEGAL_PLACEHOLDER_TITLES[slug]
  if (legalTitle) {
    return (
      <div className="content-container py-16 max-w-2xl">
        <h1 className="text-3xl font-semibold mb-8">{legalTitle}</h1>
        <p className="text-[var(--ps-muted)] leading-7">
          Bu sayfanın içeriği hazırlanıyor.
        </p>
      </div>
    )
  }

  notFound()
}
