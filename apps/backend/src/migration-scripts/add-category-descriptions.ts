import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

// Ahmed asked for a professional description for every real product line /
// category, in all 4 storefront languages (tr/en/bg/ar), written fresh (not
// copied from any competitor site). Sets category.description (Turkish,
// the canonical default used when no translation matches) plus
// metadata.translations.{en,bg,ar}.description, matching the same shape
// already used for product descriptions (see lib/i18n/catalog.ts ->
// localizeCategory / translateCatalogValue).
type Copy = { tr: string; en: string; bg: string; ar: string };

const DESCRIPTIONS: Record<string, Copy> = {
  "Ambalaj Malzemeleri": {
    tr: "Sanayi ve lojistik firmalarının günlük ambalajlama ihtiyaçlarını karşılayan streç film, çember, bant, köpük ve kutu çözümlerinin tamamı bu kategoride toplanmıştır.",
    en: "The full range of stretch film, strapping, tape, foam and box solutions that keep industrial and logistics operations packaging their goods every day.",
    bg: "Пълната гама от стреч фолио, лента за стягане, опаковъчна лента, пяна и кутии, които покриват ежедневните нужди от опаковане на индустриални и логистични фирми.",
    ar: "كل حلول التغليف اللي محتاجها أي مصنع أو مستودع يوميًا: فيلم استرتش، أشرطة تربيط، لواصق، فوم، وكراتين - كلها مجمعة في قسم واحد.",
  },
  Makineler: {
    tr: "Ambalajlama hattınızı hızlandıracak yeni ve ikinci el makineler, eski ekipmanınızı yenisiyle değiştirme hizmetiyle birlikte sunulur.",
    en: "New and second-hand packaging line machinery, offered alongside a trade-in service for replacing your existing equipment.",
    bg: "Нови и втора употреба машини за опаковъчната линия, заедно с услуга за замяна на старото ви оборудване с ново.",
    ar: "ماكينات تغليف جديدة ومستعملة لتسريع خط الإنتاج، مع خدمة استبدال الماكينة القديمة بواحدة جديدة.",
  },
  "Fabrika ve Depo Malzemeleri": {
    tr: "Fabrika ve depo işletmelerinin sahada ihtiyaç duyduğu sarf malzemeleri ve donanımlar, tek kaynaktan hızlı temin imkanıyla.",
    en: "The consumables and hardware factory floors and warehouses rely on day to day, sourced quickly from a single supplier.",
    bg: "Консумативите и оборудването, от които се нуждаят фабриките и складовете всеки ден, доставени бързо от един източник.",
    ar: "المستلزمات والمعدات اللي محتاجها أي مصنع أو مستودع في شغله اليومي، بتوريد سريع من مصدر واحد موثوق.",
  },
  "Ofis Kırtasiye": {
    tr: "İşletmenizin ofis kırtasiye ihtiyaçlarını karşılamak için yakında bu kategoride ürünler yer alacak.",
    en: "Office stationery for your business - products for this category are coming soon.",
    bg: "Офис консумативи за вашия бизнес - продуктите в тази категория предстои да бъдат добавени.",
    ar: "أدوات مكتبية لشركتك - منتجات هذا القسم قريبًا.",
  },
  "Ofis Mobilya": {
    tr: "Ofisiniz için dayanıklı ve fonksiyonel mobilya çözümleri, talebe özel fiyatlandırmayla sunulur.",
    en: "Durable, functional office furniture, priced on request to match your project's scale.",
    bg: "Издръжливи и функционални мебели за офиси, с цена по запитване според мащаба на проекта ви.",
    ar: "أثاث مكتبي عملي ومتين، بالسعر حسب الطلب على حسب حجم مشروعك.",
  },
  "Ofis Temizlik": {
    tr: "Ofis ve işletmenizin hijyen ihtiyaçlarını karşılamak için yakında bu kategoride ürünler yer alacak.",
    en: "Cleaning supplies for your office and business - products for this category are coming soon.",
    bg: "Почистващи препарати за вашия офис и бизнес - продуктите в тази категория предстои да бъдат добавени.",
    ar: "مستلزمات تنظيف لمكتبك وشركتك - منتجات هذا القسم قريبًا.",
  },
  "Kartuş ve Toner": {
    tr: "Yazıcı ve fotokopi makineleriniz için orijinal ve uyumlu kartuş/toner ürünleri yakında bu kategoride yer alacak.",
    en: "Original and compatible cartridges/toner for your printers and copiers - products for this category are coming soon.",
    bg: "Оригинални и съвместими касети/тонер за вашите принтери и копирни машини - продуктите в тази категория предстои да бъдат добавени.",
    ar: "خراطيش وحبر أصلي ومتوافق لطابعاتك وآلات التصوير - منتجات هذا القسم قريبًا.",
  },
  "Endüstriyel Streç Film": {
    tr: "Palet ve yüklerin taşıma sırasında sabitlenmesi için yüksek gerilme dayanımlı endüstriyel streç film, farklı mikron ve renk seçenekleriyle.",
    en: "High-tensile industrial stretch film for securing pallets and loads in transit, available in a range of micron thicknesses and colours.",
    bg: "Индустриално стреч фолио с високо съпротивление на опън за фиксиране на палети и товари по време на транспорт, в различни дебелини и цветове.",
    ar: "فيلم استرتش صناعي عالي المقاومة لتثبيت البالتات والشحنات أثناء النقل، بمقاسات وألوان مختلفة.",
  },
  "Jumbo Streç Film": {
    tr: "Yüksek hacimli paketleme hatları için geniş rulo çaplı jumbo streç film, sarım makineleriyle uyumlu.",
    en: "Wide-diameter jumbo stretch film rolls for high-volume packing lines, compatible with wrapping machines.",
    bg: "Джъмбо стреч фолио с голям диаметър на ролката за високообемни опаковъчни линии, съвместимо с машини за увиване.",
    ar: "فيلم استرتش جامبو بقطر رول كبير لخطوط التعبئة عالية الإنتاجية، متوافق مع ماكينات اللف.",
  },
  "Pre-Streç Film": {
    tr: "Ön germe teknolojisiyle üretim sırasında elde daha az kuvvetle daha fazla sarım sağlayan pre-streç film.",
    en: "Pre-stretched film that lets you wrap more per roll with less hand force, thanks to pre-stretch manufacturing.",
    bg: "Пред-разтегнато фолио, което позволява повече увивания на ролка с по-малко усилие благодарение на технологията за пред-разтягане.",
    ar: "فيلم ما قبل الشد اللي بيدّيك عدد لفات أكتر بمجهود أقل بفضل تقنية التمديد المسبق.",
  },
  "Gıda Streç Film": {
    tr: "Gıdayla temasa uygun sertifikalı hammaddeden üretilen streç film, gıda ambalajlama ve muhafaza işlemleri için.",
    en: "Food-contact-certified stretch film for food packaging and preservation.",
    bg: "Стреч фолио от сертифицирана суровина за контакт с храни, за опаковане и съхранение на хранителни продукти.",
    ar: "فيلم استرتش غذائي مصنّع من مواد خام معتمدة للتلامس مع الطعام، للتغليف والحفظ.",
  },
  "PP Çember": {
    tr: "Koli ve paletlerin taşıma sırasında güvenle bağlanması için yüksek mukavemetli PP (polipropilen) çember, farklı genişlik ve renk seçenekleriyle.",
    en: "High-strength PP (polypropylene) strapping for securely bundling boxes and pallets in transit, in a range of widths and colours.",
    bg: "Здрава PP (полипропиленова) лента за стягане на кашони и палети по време на транспорт, в различни широчини и цветове.",
    ar: "شريط تربيط PP (بولي بروبيلين) عالي المتانة لربط الكراتين والبالتات بأمان أثناء النقل، بمقاسات وألوان مختلفة.",
  },
  "Hotmelt Koli Bandı": {
    tr: "Sıcak eritme yapıştırıcı teknolojisiyle üretilen, düşük ve yüksek sıcaklıklarda tutunma gücünü koruyan koli bandı.",
    en: "Hotmelt-adhesive packing tape that holds its grip across both low and high temperatures.",
    bg: "Опаковъчна лента с термотопимо лепило, която запазва здравото си захващане както при ниски, така и при високи температури.",
    ar: "شريط لاصق هوتميلت بيحافظ على قوة اللصق سواء في الحرارة العالية أو المنخفضة.",
  },
  "Akrilik Koli Bandı": {
    tr: "UV ışığa ve zamana karşı dayanıklı, sararmayan akrilik bazlı koli bandı - uzun süreli depolama ve nakliye için ideal.",
    en: "UV- and ageing-resistant acrylic packing tape that won't yellow over time - ideal for long-term storage and shipping.",
    bg: "Акрилна опаковъчна лента, устойчива на UV лъчи и стареене, без пожълтяване - идеална за дългосрочно съхранение и транспорт.",
    ar: "شريط لاصق أكريليك مقاوم للأشعة فوق البنفسجية ولا يصفرّ مع الوقت - مثالي للتخزين والشحن الطويل.",
  },
  "Maskeleme Bandı": {
    tr: "Boyama, kaplama ve endüstriyel işlemler sırasında kolay uygulanan ve iz bırakmadan sökülen maskeleme bandı.",
    en: "Masking tape that applies easily and removes cleanly for painting, coating and industrial process work.",
    bg: "Маскираща лента, която се поставя лесно и се сваля чисто, без следи, при боядисване, покритие и индустриални процеси.",
    ar: "شريط لاصق للطلاء يتركب بسهولة وينزع من غير أي أثر - مناسب للدهانات والطلاء والأعمال الصناعية.",
  },
  "Balonlu Naylon": {
    tr: "Kırılabilir ürünlerin darbe ve çizilmelere karşı korunması için hava kabarcıklı naylon, farklı kabarcık boyutlarında.",
    en: "Air-bubble wrap that protects fragile goods from impact and scratches, available in different bubble sizes.",
    bg: "Балонено фолио, което предпазва чупливите стоки от удари и надрасквания, в различни размери на балончетата.",
    ar: "نايلون فقاعي بيحمي المنتجات القابلة للكسر من الصدمات والخدوش، بمقاسات فقاعات مختلفة.",
  },
  "PE Köpük": {
    tr: "Hafif, esnek ve nem tutmayan PE (polietilen) köpük, hassas ürünlerin ambalajlanmasında ekstra koruma katmanı sağlar.",
    en: "Lightweight, flexible, moisture-resistant PE (polyethylene) foam that adds an extra layer of protection when packing delicate items.",
    bg: "Лека, гъвкава и водоустойчива PE (полиетиленова) пяна, която добавя допълнителен защитен слой при опаковане на чувствителни изделия.",
    ar: "فوم بولي إيثيلين خفيف ومرن ومقاوم للرطوبة، بيضيف طبقة حماية إضافية عند تغليف المنتجات الحساسة.",
  },
  "Karton Kutu ve Kağıt Çantalar": {
    tr: "Standart ve özel ölçülerde oluklu mukavva kutular ile kağıt çantalar, e-ticaret ve toptan sevkiyat için hazır.",
    en: "Corrugated cardboard boxes and paper bags in standard and custom sizes, ready for e-commerce and wholesale shipping.",
    bg: "Гофрирани картонени кутии и хартиени торби в стандартни и по поръчка размери, готови за онлайн търговия и едро изпращане.",
    ar: "كراتين مقوّاة وأكياس ورقية بمقاسات قياسية أو حسب الطلب، جاهزة للشحن التجاري والبيع بالجملة.",
  },
  "Ambalaj Makineleri": {
    tr: "Streç sarma, çemberleme ve bantlama işlemlerini otomatikleştiren yarı otomatik ve tam otomatik ambalaj makineleri.",
    en: "Semi-automatic and fully automatic packaging machines that automate stretch wrapping, strapping and taping.",
    bg: "Полуавтоматични и напълно автоматични опаковъчни машини, които автоматизират стреч увиване, стягане с лента и опаковъчна лента.",
    ar: "ماكينات تغليف نص أوتوماتيك وأوتوماتيك بالكامل بتخلي لف الاسترتش والتربيط واللصق يتم أوتوماتيكيًا.",
  },
};

export default async function add_category_descriptions({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "description", "metadata"],
  });

  let updated = 0;
  let skippedNoMatch = 0;
  for (const category of categories as any[]) {
    const copy = DESCRIPTIONS[category.name];
    if (!copy) {
      skippedNoMatch++;
      continue;
    }

    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: category.id },
        update: {
          description: copy.tr,
          metadata: {
            ...(category.metadata || {}),
            translations: {
              ...((category.metadata as any)?.translations || {}),
              tr: {
                ...((category.metadata as any)?.translations?.tr || {}),
                description: copy.tr,
              },
              en: {
                ...((category.metadata as any)?.translations?.en || {}),
                description: copy.en,
              },
              bg: {
                ...((category.metadata as any)?.translations?.bg || {}),
                description: copy.bg,
              },
              ar: {
                ...((category.metadata as any)?.translations?.ar || {}),
                description: copy.ar,
              },
            },
          },
        },
      },
    });
    updated++;
  }

  logger.info(
    `Category descriptions: ${updated} updated, ${skippedNoMatch} categories had no matching copy (left unchanged).`
  );
}
