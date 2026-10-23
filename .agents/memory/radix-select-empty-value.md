---
name: Radix Select empty-value submission
description: Controlled dependent selects may submit an unintended first option after reset
---

After clearing a dependent Radix Select that participates in a native form, its generated hidden native select may report the first available option even while the React-controlled value is empty.

**Why:** An automated browser check found the first district in a list serialized immediately after switching from manual entry back to the unselected dropdown. That could silently save a different location from the one the user chose.

**How to apply:** For dependent selects that must be cleared when a parent choice changes, submit an explicit hidden input bound to the controlled selection rather than relying on Radix's generated native select. Verify both the visible placeholder and the actual FormData value after resets.