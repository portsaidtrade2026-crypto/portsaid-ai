import re

path = "apps/storefront/src/lib/i18n/dictionaries/product-titles.ts"
with open(path, encoding="utf-8") as f:
    content = f.read()

UNIT_MAP = {"Mic": "мкм", "kg": "кг", "gr": "г", "mm": "мм", "cm": "см", "m": "м"}
UNIT_PATTERN = re.compile(r"(\d[\d.,]*) (Mic|kg|gr|mm|cm|m)\b")

def fix_units(text: str) -> str:
    return UNIT_PATTERN.sub(lambda m: f"{m.group(1)} {UNIT_MAP[m.group(2)]}", text)

def fix_bg_field(line_match: "re.Match") -> str:
    prefix, bg_value, suffix = line_match.group(1), line_match.group(2), line_match.group(3)
    return prefix + fix_units(bg_value) + suffix

pattern = re.compile(r'(bg: ")([^"]*)(")')
new_content, count = pattern.subn(fix_bg_field, content)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("processed", count, "bg entries")
