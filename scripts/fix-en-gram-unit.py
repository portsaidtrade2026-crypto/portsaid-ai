import re

path = "apps/storefront/src/lib/i18n/dictionaries/product-titles.ts"
with open(path, encoding="utf-8") as f:
    content = f.read()

PATTERN = re.compile(r"(\d[\d.,]*) gr\b")

def fix_en_field(line_match: "re.Match") -> str:
    prefix, en_value, suffix = line_match.group(1), line_match.group(2), line_match.group(3)
    return prefix + PATTERN.sub(lambda m: f"{m.group(1)} g", en_value) + suffix

pattern = re.compile(r'(en: ")([^"]*)(")')
new_content, count = pattern.subn(fix_en_field, content)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("processed", count, "en entries")
