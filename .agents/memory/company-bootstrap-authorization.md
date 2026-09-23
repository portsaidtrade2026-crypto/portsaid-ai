---
name: Company bootstrap authorization
description: Why the initial company-admin enrollment needs an exception to normal membership checks.
---

Company registration is a two-request process: create the company, then enroll its first employee. A blanket membership requirement on employee creation blocks the first administrator because no membership exists yet. The enrollment exception is deliberately limited to an unclaimed company whose email matches the authenticated customer, with that same customer enrolling themselves as admin; existing admins of a different company cannot use the exception.

**Why:** The original empty-company bypass let any authenticated user claim a company with no employees. There is no persisted company creator identity to check instead. An email match is a pragmatic constraint, not a full ownership proof if future creation flows permit arbitrary company emails.

**How to apply:** Preserve this narrow exception when changing signup. If registration gains a persisted creator/owner relationship or verified invitation, authorize the bootstrap from that relationship instead of relying on the company email. Keep every other company route scoped to actual employee membership.