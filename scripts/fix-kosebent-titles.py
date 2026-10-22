import re

path = "apps/storefront/src/lib/i18n/dictionaries/product-titles.ts"
with open(path, encoding="utf-8") as f:
    content = f.read()

repl = {
    "karton-köşebent-10-mt-5050-5mm": ("Cardboard Edge Protector — Length 1.0 m, Width 5 mm", "Картонен ъглов протектор — Дължина 1.0 m, Широчина 5 mm", "واقي حواف كرتوني — الطول 1.0 m, العرض 5 mm"),
    "karton-köşebent-1000-mm-40403": ("Cardboard Edge Protector — Width 1000 mm", "Картонен ъглов протектор — Широчина 1000 mm", "واقي حواف كرتوني — العرض 1000 mm"),
    "karton-köşebent-1100-mm-40403": ("Cardboard Edge Protector — Width 1100 mm", "Картонен ъглов протектор — Широчина 1100 mm", "واقي حواف كرتوني — العرض 1100 mm"),
    "karton-köşebent-2-mt-4040-4mm": ("Cardboard Edge Protector — Length 2 m, Width 4 mm", "Картонен ъглов протектор — Дължина 2 m, Широчина 4 mm", "واقي حواف كرتوني — الطول 2 m, العرض 4 mm"),
    "karton-köşebent-210mt-9595-5mm": ("Cardboard Edge Protector — Length 2.10 m, Width 5 mm", "Картонен ъглов протектор — Дължина 2.10 m, Широчина 5 mm", "واقي حواف كرتوني — الطول 2.10 m, العرض 5 mm"),
    "karton-köşebent-25-mt-4040-4mm": ("Cardboard Edge Protector — Length 2.5 m, Width 4 mm", "Картонен ъглов протектор — Дължина 2.5 m, Широчина 4 mm", "واقي حواف كرتوني — الطول 2.5 m, العرض 4 mm"),
    "karton-köşebent-3-mt-5090-4mm": ("Cardboard Edge Protector — Length 3 m, Width 4 mm", "Картонен ъглов протектор — Дължина 3 m, Широчина 4 mm", "واقي حواف كرتوني — الطول 3 m, العرض 4 mm"),
    "l5-polietilen-mavi-köşebent": ("PE Edge Protector — Blue", "PE ъглов протектор — Син", "واقي حواف PE — أزرق"),
}

count = 0
for handle, (en, bg, ar) in repl.items():
    pattern = re.compile(r'("' + re.escape(handle) + r'": \{ en: ")[^"]*(", bg: ")[^"]*(", ar: ")[^"]*("\s*\},?)')
    new_content, n = pattern.subn(lambda m: m.group(1) + en + m.group(2) + bg + m.group(3) + ar + m.group(4), content)
    if n != 1:
        print("WARNING: handle not matched exactly once:", handle, n)
    content = new_content
    count += n

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("updated", count, "entries")
