---
name: Company signup geography
description: Distinction between company profile location/currency and checkout shipping availability
---

At company signup, offer the full Medusa-supported country/territory list and TRY, USD, and EUR regardless of which store regions are configured. Do not infer that this enables checkout shipping or prices in every country or currency.

**Why:** The company record accepts a country name and currency code independently, while checkout country availability is constrained by active Medusa regions. Deriving the signup choices from regions incorrectly hid otherwise valid company locations and currencies.

**How to apply:** Keep company profile choice independent when editing signup; leave checkout region filtering intact unless fulfillment/payment setup is also explicitly requested.