# Dependency security remediation report

Date: 2026-09-23

## Executive result

- Before: **130 findings** — 5 Critical, 62 High, 55 Moderate, 8 Low.
- Deduplicated before: **43 vulnerable package/version combinations**.
- Final: **1 finding** — 0 Critical, 1 High, 0 Moderate, 0 Low.
- Remaining High: **uuid@9.0.1 / GHSA-w5hq-g745-h8pq**. It is reachable only from backend devDependency `@medusajs/test-utils` through `bullmq@5.13.0`; it is absent from production dependency paths. The scanner requires uuid 11, a major override outside BullMQ's declared UUID 9 line, so it was not forced.
- SAST: 0 findings before and after. HoundDog: 0 findings before and after.
- No unresolved Critical or High production-reachable finding remains.

## Classification method

- **Direct/transitive** comes from workspace manifests and `pnpm why -r`.
- **Runtime candidate** means at least one production dependency path exists and the package is not solely a compiler, bundler, linter, code generator, or test utility. This is conservative graph reachability; it does not claim the vulnerable function is invoked with attacker-controlled input.
- **Build/test only** means every path is dev-only or the package is tooling even when a parent exposes it through a production dependency declaration.
- Repeated advisories are grouped by package/version below; every original advisory ID is retained.

## Complete deduplicated classification

| Package/version | Max severity | Directness | Application reachability | Final state | Advisory IDs | Example path |
|---|---:|---|---|---|---|---|
| @babel/core@7.28.5 | low | direct | build/test only | removed | GHSA-4x5r-pxfx-6jf8 | @babel/core@7.28.5 |
| @grpc/grpc-js@1.14.3 | high | transitive | runtime candidate | removed | GHSA-5375-pq7m-f5r2<br>GHSA-99f4-grh7-6pcq | @medusajs/cli@2.21.0 → @medusajs/deps@2.21.0 → @opentelemetry/sdk-node@0.220.0 → @opentelemetry/otlp-grpc-exporter-base@0.220.0 → @grpc/grpc-js@1.14.3 |
| @humanfs/node@0.16.7 | moderate | transitive | build/test only | removed | GHSA-p498-v437-472g | eslint@9.39.4 → @humanfs/node@0.16.7 |
| @protobufjs/utf8@1.1.0 | moderate | transitive | runtime candidate | removed | GHSA-q6x5-8v7m-xcrf | @medusajs/cli@2.21.0 → @medusajs/deps@2.21.0 → @opentelemetry/sdk-node@0.220.0 → @opentelemetry/otlp-grpc-exporter-base@0.220.0 → @grpc/grpc-js@1.14.3 → @grpc/proto-loader@0.8.0 → protobufjs@7.5.4 → @protobufjs/utf8@1.1.0 |
| ajv@6.12.6 | moderate | transitive | build/test only | removed | GHSA-2g4f-4pwh-qvx6 | babel-loader@8.4.1 → schema-utils@2.7.1 → ajv@6.12.6 |
| ajv@8.13.0 | moderate | transitive | runtime candidate | removed | GHSA-2g4f-4pwh-qvx6 | @hookform/resolvers@5.5.7 → ajv@8.13.0 |
| ajv@8.17.1 | moderate | transitive | runtime candidate | removed | GHSA-2g4f-4pwh-qvx6 | webpack@5.104.0 → schema-utils@4.3.3 → ajv@8.17.1 |
| axios@1.13.2 | high | transitive | runtime candidate | removed | GHSA-35jp-ww65-95wh<br>GHSA-3g43-6gmg-66jw<br>GHSA-3p68-rc4w-qgx5<br>GHSA-3w6x-2g7m-8v23<br>GHSA-42h9-826w-cgv3<br>GHSA-43fc-jf86-j433<br>GHSA-445q-vr5w-6q77<br>GHSA-5c9x-8gcm-mpgx<br>GHSA-62hf-57xw-28j9<br>GHSA-6chq-wfr3-2hj9<br>GHSA-777c-7fjr-54vf<br>GHSA-7q8q-rj6j-mhjq<br>GHSA-898c-q2cr-xwhg<br>GHSA-fvcv-3m26-pcqx<br>GHSA-hfxv-24rg-xrqf<br>GHSA-j5f8-grm9-p9fc<br>GHSA-jqh4-m9w3-8hp9<br>GHSA-m7pr-hjqh-92cm<br>GHSA-mmx7-hfxf-jppx<br>GHSA-mwf2-3pr3-8698<br>GHSA-p92q-9vqr-4j8v<br>GHSA-pf86-5x62-jrwf<br>GHSA-pmv8-rq9r-6j72<br>GHSA-pmwg-cvhr-8vh7<br>GHSA-q8qp-cvcw-x6jj<br>GHSA-vf2m-468p-8v99<br>GHSA-w9j2-pvgh-6h63<br>GHSA-xhjh-pmcv-23jw<br>GHSA-xx6v-rp6x-q39c | @medusajs/cli@2.21.0 → @medusajs/telemetry@2.21.0 → axios@1.13.2 |
| baseline-browser-mapping@2.9.9 | moderate | transitive | build/test only | removed | GHSA-w5vr-8v7q-w6rv | webpack@5.104.0 → browserslist@4.28.1 → baseline-browser-mapping@2.9.9 |
| body-parser@1.20.4 | low | transitive | runtime candidate | removed | GHSA-v422-hmwv-36x6 | @medusajs/cli@2.21.0 → express@4.22.1 → body-parser@1.20.4 |
| brace-expansion@1.1.12 | high | transitive | build/test only | removed | GHSA-3jxr-9vmj-r5cp<br>GHSA-f886-m6hf-6m8v<br>GHSA-mh99-v99m-4gvg<br>GHSA-rgw5-rvv9-x895 | eslint@9.39.4 → minimatch@3.1.5 → brace-expansion@1.1.12 |
| brace-expansion@2.0.2 | high | transitive | build/test only | removed | GHSA-3jxr-9vmj-r5cp<br>GHSA-f886-m6hf-6m8v<br>GHSA-mh99-v99m-4gvg<br>GHSA-rgw5-rvv9-x895 | @medusajs/eslint-plugin@2.21.0 → @typescript-eslint/parser@8.50.0 → @typescript-eslint/typescript-estree@8.50.0 → minimatch@9.0.5 → brace-expansion@2.0.2 |
| brace-expansion@5.0.5 | high | transitive | build/test only | removed | GHSA-3jxr-9vmj-r5cp<br>GHSA-jxxr-4gwj-5jf2<br>GHSA-mh99-v99m-4gvg<br>GHSA-rgw5-rvv9-x895 | @medusajs/cli@2.21.0 → glob@13.0.6 → minimatch@10.2.5 → brace-expansion@5.0.5 |
| browserslist@4.28.1 | high | transitive | build/test only | removed | GHSA-73wf-gq98-2v4g<br>GHSA-c83g-rgw3-j3cx | autoprefixer@10.4.23 → browserslist@4.28.1 |
| diff@4.0.2 | low | transitive | build/test only | removed | GHSA-73rr-hh4g-fpgx | ts-node@10.9.2 → diff@4.0.2 |
| fast-uri@3.1.0 | high | transitive | runtime candidate | removed | GHSA-4c8g-83qw-93j6<br>GHSA-7p8r-x3mc-p8w7<br>GHSA-f65p-4m7j-42xc<br>GHSA-jqff-g426-hqxp<br>GHSA-q3j6-qgpj-74h6<br>GHSA-v2hh-gcrm-f6hx<br>GHSA-v39h-62p7-jpjc | webpack@5.104.0 → schema-utils@4.3.3 → ajv@8.17.1 → fast-uri@3.1.0 |
| flatted@3.3.3 | high | transitive | build/test only | removed | GHSA-25h7-pfq9-p65f<br>GHSA-rf6f-7fwh-wjgh | eslint@9.39.4 → file-entry-cache@8.0.0 → flat-cache@4.0.1 → flatted@3.3.3 |
| follow-redirects@1.15.11 | moderate | transitive | runtime candidate | removed | GHSA-r4q5-vmmm-2653 | @medusajs/cli@2.21.0 → @medusajs/telemetry@2.21.0 → axios@1.13.2 → follow-redirects@1.15.11 |
| form-data@4.0.5 | high | transitive | runtime candidate | removed | GHSA-hmw2-7cc7-3qxx | @medusajs/cli@2.21.0 → @medusajs/telemetry@2.21.0 → axios@1.13.2 → form-data@4.0.5 |
| immutable@3.7.6 | critical | transitive | build/test only | removed | GHSA-v56q-mh7h-f735<br>GHSA-wf6x-7x77-mvgw<br>GHSA-xvcm-6775-5m9r | @medusajs/cli@2.21.0 → @medusajs/utils@2.21.0 → @graphql-codegen/typescript@4.1.6 → @graphql-codegen/visitor-plugin-common@5.8.0 → @graphql-tools/relay-operation-optimizer@7.0.26 → @ardatan/relay-compiler@12.0.3 → immutable@3.7.6 |
| js-yaml@3.14.2 | high | transitive | build/test only | removed | GHSA-2883-xcg3-v3hh<br>GHSA-52cp-r559-cp3m<br>GHSA-5p4m-2wfm-xmqj<br>GHSA-h67p-54hq-rp68 | jest@29.7.0 → @jest/core@29.7.0 → @jest/transform@29.7.0 → babel-plugin-istanbul@6.1.1 → @istanbuljs/load-nyc-config@1.1.0 → js-yaml@3.14.2 |
| js-yaml@4.1.1 | high | transitive | build/test only | removed | GHSA-2883-xcg3-v3hh<br>GHSA-52cp-r559-cp3m<br>GHSA-5p4m-2wfm-xmqj<br>GHSA-h67p-54hq-rp68 | eslint@9.39.4 → @eslint/eslintrc@3.3.5 → js-yaml@4.1.1 |
| lodash@4.17.21 | high | direct | runtime candidate | removed | GHSA-f23m-r3pf-42rh<br>GHSA-r5fr-rjxr-66jc<br>GHSA-xxjr-mmjv-4gpg | lodash@4.17.21 |
| minimatch@9.0.5 | high | transitive | build/test only | removed | GHSA-23c5-xmqv-rm74<br>GHSA-3ppc-4f35-3m26<br>GHSA-7r86-cg39-jmmj | @medusajs/eslint-plugin@2.21.0 → @typescript-eslint/parser@8.50.0 → @typescript-eslint/typescript-estree@8.50.0 → minimatch@9.0.5 |
| nanoid@3.3.11 | high | transitive | build/test only | removed | GHSA-28wg-ghj8-5hjv<br>GHSA-2v37-7h3g-55p8<br>GHSA-xwg4-73v4-xw9w | postcss@8.5.6 → nanoid@3.3.11 |
| nanoid@3.3.16 | moderate | transitive | runtime candidate | removed | GHSA-2v37-7h3g-55p8 | next@15.5.21 → postcss@8.4.31 → nanoid@3.3.16 |
| next@15.5.21 | critical | direct | runtime candidate | removed | GHSA-2xp9-vwfh-vxw4<br>GHSA-p293-qw3h-jr36 | next@15.5.21 |
| path-to-regexp@0.1.12 | high | transitive | runtime candidate | removed | GHSA-37ch-88jc-xwx2 | @medusajs/cli@2.21.0 → express@4.22.1 → path-to-regexp@0.1.12 |
| picomatch@2.3.1 | high | transitive | runtime candidate | removed | GHSA-3v7f-55p6-f55p<br>GHSA-c2c7-rcm5-vvqj | @medusajs/cli@2.21.0 → @medusajs/deps@2.21.0 → awilix@8.0.1 → fast-glob@3.3.3 → micromatch@4.0.8 → picomatch@2.3.1 |
| picomatch@4.0.3 | high | transitive | runtime candidate | removed | GHSA-3v7f-55p6-f55p<br>GHSA-c2c7-rcm5-vvqj | @medusajs/types@2.21.0 → vite@7.3.6 → picomatch@4.0.3 |
| postcss-selector-parser@6.1.2 | moderate | transitive | build/test only | removed | GHSA-w9m9-85wc-3x92 | tailwindcss@3.4.19 → postcss-selector-parser@6.1.2 |
| postcss@8.4.31 | high | transitive | runtime candidate | removed | GHSA-6g55-p6wh-862q<br>GHSA-fxqj-rqcc-2cmp<br>GHSA-qx2v-qp2m-jg93<br>GHSA-r28c-9q8g-f849 | next@15.5.21 → postcss@8.4.31 |
| postcss@8.5.22 | moderate | transitive | runtime candidate | removed | GHSA-fxqj-rqcc-2cmp | @medusajs/types@2.21.0 → vite@7.3.6 → postcss@8.5.22 |
| postcss@8.5.6 | high | direct | build/test only | removed | GHSA-6g55-p6wh-862q<br>GHSA-fxqj-rqcc-2cmp<br>GHSA-qx2v-qp2m-jg93<br>GHSA-r28c-9q8g-f849 | postcss@8.5.6 |
| protobufjs@7.5.4 | critical | transitive | runtime candidate | removed | GHSA-2pr8-phx7-x9h3<br>GHSA-66ff-xgx4-vchm<br>GHSA-685m-2w69-288q<br>GHSA-75px-5xx7-5xc7<br>GHSA-f38q-mgvj-vph7<br>GHSA-fx83-v9x8-x52w<br>GHSA-j3f2-48v5-ccww<br>GHSA-jggg-4jg4-v7c6<br>GHSA-jvwf-75h9-cwgg<br>GHSA-q6x5-8v7m-xcrf<br>GHSA-wcpc-wj8m-hjx6<br>GHSA-xq3m-2v4x-88gg | @medusajs/cli@2.21.0 → @medusajs/deps@2.21.0 → @opentelemetry/sdk-node@0.220.0 → @opentelemetry/otlp-grpc-exporter-base@0.220.0 → @grpc/grpc-js@1.14.3 → @grpc/proto-loader@0.8.0 → protobufjs@7.5.4 |
| qs@6.14.0 | moderate | transitive | runtime candidate | removed | GHSA-4mjr-xmp4-gh2g<br>GHSA-6rw7-vpxm-498p<br>GHSA-q8mj-m7cp-5q26<br>GHSA-w7fw-mjwx-w883 | @medusajs/cli@2.21.0 → express@4.22.1 → qs@6.14.0 |
| qs@6.15.3 | moderate | transitive | runtime candidate | removed | GHSA-4mjr-xmp4-gh2g<br>GHSA-x5fp-wj9c-mxmx | @medusajs/dashboard@2.21.0 → qs@6.15.3 |
| rollup@4.53.5 | high | transitive | build/test only | removed | GHSA-mw96-cpmx-2vgc | @medusajs/types@2.21.0 → vite@7.3.6 → rollup@4.53.5 |
| serialize-javascript@6.0.2 | high | transitive | build/test only | removed | GHSA-5c6j-r48x-rmvq<br>GHSA-qj8w-gfj5-8c6v | webpack@5.104.0 → terser-webpack-plugin@5.3.16 → serialize-javascript@6.0.2 |
| sharp@0.34.5 | high | transitive | runtime candidate | removed | GHSA-f88m-g3jw-g9cj<br>GHSA-rgj7-g3m4-5g8c | next@15.5.21 → sharp@0.34.5 |
| turbo@2.6.3 | critical | direct | build/test only | removed | GHSA-3qcw-2rhx-2726<br>GHSA-hcf7-66rw-9f5r | turbo@2.6.3 |
| uuid@9.0.1 | high | transitive | build/test only | remaining | GHSA-w5hq-g745-h8pq | @medusajs/test-utils@2.21.0 → @medusajs/medusa@2.21.0 → @medusajs/event-bus-redis@2.21.0 → bullmq@5.13.0 → uuid@9.0.1 |
| webpack@5.104.0 | low | transitive | build/test only | removed | GHSA-8fgc-7cc6-rx7x | babel-loader@8.4.1 → webpack@5.104.0 |

## Changes applied

- Direct secure versions: Next 15.5.24, ESLint config 15.5.24, Lodash 4.18.0, PostCSS 8.5.23, Turbo 2.9.14.
- Narrow pnpm overrides replace only the vulnerable package/version combinations with fixed compatible versions; no package-manager or lockfile migration was performed.
- Added a pnpm package extension declaring the missing Zod 3 peer for `@hookform/resolvers@3.9.1`, preventing the storefront resolver from binding to the backend's hoisted Zod 4 copy after a clean install.
- Next 15.5.24 rejects request-cookie access during `generateStaticParams`; collection pages now remain dynamic instead of enumerating localized collection routes during the build.

## Verification

- Clean pnpm 9.15 install: pass.
- Backend TypeScript: pass. Storefront TypeScript: pass.
- Production build: pass for backend and storefront.
- Company registration/authentication: 1/1 pass.
- Buyer journeys: 7/7 pass.
- Tenant isolation: 15/15 pass.
- Localization/language: 5/5 pass.
- Branding/responsive: 1/1 pass.
- Route matrix: failed one navigation readiness timeout at Arabic `/dk/store`, 320px after ~186 seconds; no runtime or console errors were observed. Other requests in the run returned 200.
- HTTP integration: infrastructure-blocked. With default settings it found no local PostgreSQL. With managed PostgreSQL connection fields supplied securely, temporary database setup exceeded each suite's fixed 60-second setup hook before assertions. Live API journeys above passed.

## Restore point

Pre-change Git tag: `pre-security-remediation-20260923-135342`.
