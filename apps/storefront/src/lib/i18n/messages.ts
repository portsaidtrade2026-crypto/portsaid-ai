import { Locale } from "./config"
import { accountCartTranslations } from "./dictionaries/account-cart"
import { catalogTranslations } from "./dictionaries/catalog"
import { commerceTranslations } from "./dictionaries/commerce"
import { routeTranslations } from "./dictionaries/routes"

const layoutMessages: Record<Locale, Record<string, string>> = {
  en: {
    Products: "Products", Quote: "Quote", "Search for products": "Search for products",
    "Build your own B2B store with this starter:": "Build your own B2B store with this starter:",
    "Deploy to Medusa Cloud": "Deploy to Medusa Cloud", Categories: "Categories",
    Collections: "Collections", Medusa: "Medusa", Documentation: "Documentation",
    "Source code": "Source code", "All rights reserved.": "All rights reserved.",
    "Be light on your feet": "Be light on your feet", "Portable Bestsellers": "Portable Bestsellers",
    "See our widest selection of electronics": "See our widest selection of electronics",
    "Github Repository": "Github Repository", Language: "Language",
    "Install a search provider to enable product search": "Install a search provider to enable product search",
  },
  tr: {
    Products: "Ürünler", Quote: "Teklif", "Search for products": "Ürünlerde ara",
    "Build your own B2B store with this starter:": "Bu başlangıçla kendi B2B mağazanızı oluşturun:",
    "Deploy to Medusa Cloud": "Medusa Cloud'a dağıtın", Categories: "Kategoriler",
    Collections: "Koleksiyonlar", Medusa: "Medusa", Documentation: "Dokümantasyon",
    "Source code": "Kaynak kodu", "All rights reserved.": "Tüm hakları saklıdır.",
    "Be light on your feet": "Hafif adımlarla ilerleyin", "Portable Bestsellers": "Taşınabilir çok satanlar",
    "See our widest selection of electronics": "En geniş elektronik ürün seçkimizi keşfedin",
    "Github Repository": "Github deposu", Language: "Dil",
    "Install a search provider to enable product search": "Ürün aramasını etkinleştirmek için bir arama sağlayıcısı yükleyin",
  },
  bg: {
    Products: "Продукти", Quote: "Оферта", "Search for products": "Търсене на продукти",
    "Build your own B2B store with this starter:": "Създайте свой B2B магазин с този шаблон:",
    "Deploy to Medusa Cloud": "Публикувайте в Medusa Cloud", Categories: "Категории",
    Collections: "Колекции", Medusa: "Medusa", Documentation: "Документация",
    "Source code": "Изходен код", "All rights reserved.": "Всички права запазени.",
    "Be light on your feet": "Бъдете леки на крака", "Portable Bestsellers": "Преносими хитови продукти",
    "See our widest selection of electronics": "Разгледайте най-широкия ни избор от електроника",
    "Github Repository": "Github хранилище", Language: "Език",
    "Install a search provider to enable product search": "Инсталирайте доставчик за търсене, за да активирате търсенето",
  },
  ar: {
    Products: "المنتجات", Quote: "عرض سعر", "Search for products": "البحث عن المنتجات",
    "Build your own B2B store with this starter:": "أنشئ متجر B2B الخاص بك باستخدام هذا القالب:",
    "Deploy to Medusa Cloud": "النشر على Medusa Cloud", Categories: "الفئات",
    Collections: "المجموعات", Medusa: "Medusa", Documentation: "التوثيق",
    "Source code": "المصدر البرمجي", "All rights reserved.": "جميع الحقوق محفوظة.",
    "Be light on your feet": "خفيف وسريع", "Portable Bestsellers": "أفضل المنتجات المحمولة",
    "See our widest selection of electronics": "اكتشف أوسع تشكيلة من الإلكترونيات",
    "Github Repository": "مستودع Github", Language: "اللغة",
    "Install a search provider to enable product search": "ثبّت مزود بحث لتفعيل البحث عن المنتجات",
  },
}

export const messages: Record<Locale, Record<string, string>> = {
  en: layoutMessages.en,
  tr: { ...layoutMessages.tr, ...accountCartTranslations.tr, ...catalogTranslations.tr, ...commerceTranslations.tr, ...routeTranslations.tr },
  bg: { ...layoutMessages.bg, ...accountCartTranslations.bg, ...catalogTranslations.bg, ...commerceTranslations.bg, ...routeTranslations.bg },
  ar: { ...layoutMessages.ar, ...accountCartTranslations.ar, ...catalogTranslations.ar, ...commerceTranslations.ar, ...routeTranslations.ar },
}

export function translate(locale: Locale, english: string) {
  return messages[locale][english] ?? messages.en[english] ?? english
}