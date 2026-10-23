# Dependency finding classification (before remediation)

**Scope.** This is a read-only classification of all 130 records in
`reports/security-dependency-before.json` against the two application manifests,
`pnpm-lock.yaml`, and the application source tree. Findings with the same GHSA
are one advisory even when the scanner reports multiple installed versions;
the report retains every affected `package@version` and every GHSA so the
scanner total is auditable. “Reachable” means reachable in a normal deployed
application process, not merely present in the lockfile. “Uncertain” means the
package is in a production dependency closure or a framework has a conditional
loader, but the repository does not prove that the vulnerable function/path is
called.

## Executive summary

* **130 scanner records, 43 package@version groups, 107 distinct GHSAs.** The
  repeated records are primarily the same advisory against several versions
  (AJV, brace-expansion, PostCSS, protobufjs, qs, etc.).
* **Critical:** Next.js 15.5.21 is a direct storefront production dependency
  and is **production reachable** through `next start` (both critical GHSAs).
  `protobufjs@7.5.4` and `immutable@3.7.6` are transitive backend/runtime
  candidates and are **uncertain**; their critical findings must not be
  dismissed without tracing the Medusa modules that load them. Turbo's
  critical finding is build/developer-only.
* **High production/reachable or production-uncertain:** Next.js, sharp,
  lodash, protobufjs, immutable, axios, fast-uri, js-yaml, qs, uuid,
  path-to-regexp, and the gRPC entry are flagged below. “Uncertain” is
  deliberately conservative: it does not claim exploitability, only that the
  package is in the production graph and a conditional/framework path needs
  confirmation.
* Direct runtime dependencies are `next`, `lodash` (storefront), and the
  application dependency closures containing the other listed packages.
  `@babel/core`, PostCSS, webpack, Rollup, browserslist, minimatch,
  picomatch, serialize-javascript, humanfs, flatted, diff, and Turbo are
  build/lint/test tooling paths (even where tooling is installed under a
  production package's dependency tree).

## Classification table

The IDs in each row are the complete scanner records for that installed
package@version. Severity is the scanner severity, not an independently
re-scored impact.

| package@version | records | direct/transitive; execution class | practical reachability and disposition |
|---|---:|---|---|
| `@babel/core@7.28.5` | 1: GHSA-4x5r-pxfx-6jf8 (low) | direct storefront dev; build-only | Loaded by `babel-loader`/Next build, not `next start`; requires attacker-controlled source and readable output map. **Not production reachable.** |
| `@grpc/grpc-js@1.14.3` | 2: GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq (high) | transitive; production-uncertain backend | Lockfile places it in the Medusa closure; no repository import or configured gRPC server was found. **Uncertain** only if an enabled Medusa integration creates a client/server; malformed network messages are then relevant. |
| `@humanfs/node@0.16.7` | 1: GHSA-p498-v437-472g (moderate) | transitive tooling; build-only | Humanfs is used by developer/build utilities, with no app import or attacker-controlled copy entry point. **Not production reachable.** |
| `@protobufjs/utf8@1.1.0` | 1: GHSA-q6x5-8v7m-xcrf (moderate) | transitive; production-uncertain | Nested protobufjs runtime. No direct import; only matters if a protobuf decode reaches the fallback UTF-8 path. **Uncertain.** |
| `ajv@6.12.6` | 1: GHSA-2g4f-4pwh-qvx6 (moderate) | transitive backend tooling/runtime-uncertain | Medusa/admin validation closure; repository does not enable `$data:true`. **Not reachable on the demonstrated path; uncertain for third-party/admin schemas.** |
| `ajv@8.13.0` | 1: GHSA-2g4f-4pwh-qvx6 (moderate) | transitive backend production-uncertain | Loaded by Medusa dashboard/admin validation and AJV formats. `$data` use is not present in application code. **Uncertain, conditional on `$data` and attacker schema/data.** |
| `ajv@8.17.1` | 1: GHSA-2g4f-4pwh-qvx6 (moderate) | transitive; production-uncertain | Same advisory/path as 8.13.0; deduplicate as one GHSA, retain version. |
| `axios@1.13.2` | 29: GHSA-35jp-ww65-95wh, -3g43-6gmg-66jw, -3p68-rc4w-qgx5, -3w6x-2g7m-8v23, -42h9-826w-cgv3, -43fc-jf86-j433, -445q-vr5w-6q77, -5c9x-8gcm-mpgx, -62hf-57xw-28j9, -6chq-wfr3-2hj9, -777c-7fjr-54vf, -7q8q-rj6j-mhjq, -898c-q2cr-xwhg, -fvcv-3m26-pcqx, -hfxv-24rg-xrqf, -j5f8-grm9-p9fc, -jqh4-m9w3-8hp9, -m7pr-hjqh-92cm, -mmx7-hfxf-jppx, -mwf2-3pr3-8698, -p92q-9vqr-4j8v, -pf86-5x62-jrwf, -pmv8-rq9r-6j72, -pmwg-cvhr-8vh7, -q8qp-cvcw-x6jj, -vf2m-468p-8v99, -w9j2-pvgh-6h63, -xhjh-pmcv-23jw, -xx6v-rp6x-q39c | transitive; production-uncertain | No application axios import was found. If Medusa's optional provider/module loads Axios for outbound requests, SSRF/header/prototype/DoS cases are reachable only through that provider and attacker-controlled URL/config. **High findings flagged uncertain; do not treat as direct.** |
| `baseline-browser-mapping@2.9.9` | 1: GHSA-w5vr-8v7q-w6rv (moderate) | transitive dev/build; build-only | Browserslist metadata processing during build; no runtime import. **Not production reachable.** |
| `body-parser@1.20.4` | 1: GHSA-v422-hmwv-36x6 (low) | transitive; production-uncertain | No Express/body-parser app import. Only a Medusa HTTP adapter route using an invalid limit could exercise it. **Uncertain, low.** |
| `brace-expansion@1.1.12` | 4: GHSA-3jxr-9vmj-r5cp, GHSA-f886-m6hf-6m8v, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 | transitive tooling; build/test-only | Glob/minimatch tooling; no runtime glob input in app. **Not production reachable.** |
| `brace-expansion@2.0.2` | 4: same four GHSAs | transitive tooling; build/test-only | Same deduplicated advisory set; **not production reachable**. |
| `brace-expansion@5.0.5` | 4: GHSA-3jxr-9vmj-r5cp, GHSA-jxxr-4gwj-5jf2, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 | transitive tooling; build-only | Loaded by build/lint globbing, not app request handling. **Not production reachable.** |
| `browserslist@4.28.1` | 2: GHSA-73wf-gq98-2v4g, GHSA-c83g-rgw3-j3cx (high) | transitive dev/build; build-only | Used to determine browser targets. **Not production reachable**; custom untrusted stats are not an application input. |
| `diff@4.0.2` | 1: GHSA-73rr-hh4g-fpgx (low) | transitive test tooling; test-only | Jest/test utility path; no production entry point. |
| `fast-uri@3.1.0` | 7: GHSA-4c8g-83qw-93j6, GHSA-7p8r-x3mc-p8w7, GHSA-f65p-4m7j-42xc, GHSA-jqff-g426-hqxp, GHSA-q3j6-qgpj-74h6, GHSA-v2hh-gcrm-f6hx, GHSA-v39h-62p7-jpjc (high) | transitive backend; production-uncertain | AJV URI format dependency. **Uncertain**: relevant if attacker-controlled URI is validated and then used for SSRF/path/security decisions; no such application import was found. |
| `flatted@3.3.3` | 2: GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh (high) | transitive lint/build; dev-only | ESLint/config serialization path, not a server request path. **Not production reachable.** |
| `follow-redirects@1.15.11` | 1: GHSA-r4q5-vmmm-2653 (moderate) | transitive; production-uncertain | HTTP client dependency. No direct Axios/app import; conditional outbound provider only. **Uncertain.** |
| `form-data@4.0.5` | 1: GHSA-hmw2-7cc7-3qxx (high) | transitive; production-uncertain | Multipart client dependency, likely conditional Axios/provider path. **High, uncertain** absent a repository import. |
| `immutable@3.7.6` | 3: GHSA-v56q-mh7h-f735 (high), GHSA-wf6x-7x77-mvgw (critical), GHSA-xvcm-6775-5m9r (high) | transitive Medusa/backend; production-uncertain | No app import. **Critical/high uncertain** if an enabled Medusa/admin route parses attacker-controlled Immutable structures; otherwise dormant dependency. |
| `js-yaml@3.14.2` | 4: GHSA-2883-xcg3-v3hh, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj (high), GHSA-h67p-54hq-rp68 (moderate) | transitive backend/build; production-uncertain | Medusa/config tooling closure. No app YAML endpoint or import. **High uncertain** only for attacker-controlled YAML parsed by a running backend. |
| `js-yaml@4.1.1` | 4: same four GHSAs | transitive; production-uncertain | Same advisory family; version-specific fixed releases differ. |
| `lodash@4.17.21` | 3: GHSA-f23m-r3pf-42rh, GHSA-r5fr-rjxr-66jc (high), GHSA-xxjr-mmjv-4gpg (moderate) | **direct storefront production** | Imported by storefront source (including server-rendered code); vulnerable `_.template`/path mutators are not shown in imports, but the package is runtime reachable. **High production-uncertain**; flag until call-site audit proves only safe functions. |
| `minimatch@9.0.5` | 3: GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj (high) | transitive build/lint; build-only | No application glob input. **Not production reachable.** |
| `nanoid@3.3.11` | 3: GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 (moderate), GHSA-xwg4-73v4-xw9w (high) | transitive; production-uncertain | ID generation may be used by Medusa/runtime, but vulnerable negative/zero/custom sizes are not evidenced. **High uncertain** pending runtime call-site trace. |
| `nanoid@3.3.16` | 1: GHSA-2v37-7h3g-55p8 (moderate) | transitive; production-uncertain | Same conditional custom-generator path. |
| `next@15.5.21` | 2: GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36 (critical) | **direct storefront production** | `apps/storefront` runs `next dev`/`next start`; `src/middleware.ts` and `next/image` are actual entry points. Image Optimization is enabled through `next/image`; Windows-hosted server condition is deployment-dependent. **CRITICAL, production reachable/conditional; upgrade is urgent.** |
| `path-to-regexp@0.1.12` | 1: GHSA-37ch-88jc-xwx2 (high) | transitive framework/backend; production-uncertain | No direct import. Relevant only if a running router compiles attacker-influenced route patterns. **High uncertain.** |
| `picomatch@2.3.1` | 2: GHSA-3v7f-55p6-f55p (moderate), GHSA-c2c7-rcm5-vvqj (high) | transitive build tooling; build-only | Glob matching in tooling; no production request path. |
| `picomatch@4.0.3` | 2: same GHSAs | transitive Medusa/Vite tooling; build-only | Admin bundler/Vite condition, not `medusa start` request data. |
| `postcss@8.4.31` | 4: GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-qx2v-qp2m-jg93, GHSA-r28c-9q8g-f849 | transitive storefront dev; build-only | Storefront PostCSS/Tailwind build; no runtime CSS parser entry. **Not production reachable.** |
| `postcss@8.5.22` | 1: GHSA-fxqj-rqcc-2cmp | transitive build-only | Same source-map condition; **not production reachable**. |
| `postcss@8.5.6` | 4: same four GHSAs | transitive storefront dev; build-only | **Not production reachable**; source CSS is repository-controlled. |
| `postcss-selector-parser@6.1.2` | 1: GHSA-w9m9-85wc-3x92 (moderate) | transitive build-only | Tailwind/PostCSS selector processing; no untrusted runtime selector entry. |
| `protobufjs@7.5.4` | 12: GHSA-2pr8-phx7-x9h3, GHSA-66ff-xgx4-vchm, GHSA-685m-2w69-288q, GHSA-75px-5xx7-5xc7, GHSA-f38q-mgvj-vph7, GHSA-fx83-v9x8-x52w, GHSA-j3f2-48v5-ccww, GHSA-jggg-4jg4-v7c6, GHSA-jvwf-75h9-cwgg, GHSA-q6x5-8v7m-xcrf, GHSA-wcpc-wj8m-hjx6, GHSA-xq3m-2v4x-88gg | transitive Medusa/backend; production-uncertain | No direct protobuf import. If Medusa's enabled gRPC/protobuf integration decodes attacker-controlled descriptors/messages, **critical RCE and high DoS/code-generation findings are production-uncertain and must be investigated**; otherwise dormant. |
| `qs@6.14.0` | 4: GHSA-4mjr-xmp4-gh2g, GHSA-6rw7-vpxm-498p, GHSA-q8mj-m7cp-5q26, GHSA-w7fw-mjwx-w883 | transitive backend HTTP; production-uncertain | Query parsing is a plausible server entry, but no direct qs import; depends on Medusa/adapter parser configuration. **Moderate/low uncertain.** |
| `qs@6.15.3` | 2: GHSA-4mjr-xmp4-gh2g, GHSA-x5fp-wj9c-mxmx | transitive backend HTTP; production-uncertain | Same query-string condition; **uncertain**. |
| `rollup@4.53.5` | 1: GHSA-mw96-cpmx-2vgc (high) | transitive build tooling; build-only | Vite/admin build dependency. No production import. |
| `serialize-javascript@6.0.2` | 2: GHSA-5c6j-r48x-rmvq (high), GHSA-qj8w-gfj5-8c6v (moderate) | transitive build/test tooling; build-only | Used for bundler/Jest serialization; no production serialization entry. **Not production reachable.** |
| `sharp@0.34.5` | 2: GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c (high) | transitive Next production server | Next's image optimizer conditionally loads sharp when installed/configured; `next/image` is imported in storefront pages. **High production reachable/conditional; flag urgently** for image processing of remote/user-controlled images. |
| `turbo@2.6.3` | 2: GHSA-3qcw-2rhx-2726 (critical), GHSA-hcf7-66rw-9f5r (moderate) | direct root devDependency; developer/build-only | Root scripts invoke Turbo (`dev`, `build`, `lint`, `test`), but deployed apps do not. **Critical build/developer-only**, requiring malicious local Yarn Berry detection context. |
| `uuid@9.0.1` | 1: GHSA-w5hq-g745-h8pq (high) | transitive; production-uncertain | No direct uuid import. Only v3/v5/v6 calls with caller-provided buffer are affected; **high uncertain** in Medusa runtime. |
| `webpack@5.104.0` | 1: GHSA-8fgc-7cc6-rx7x (low) | direct storefront devDependency; build-only | Explicitly used by the Next build, not the running server. BuildHttp requires attacker-controlled build configuration. **Not production reachable.** |

## Entry-point and evidence notes

The application entry points examined were `apps/storefront`'s `next dev`,
`next build`, `next start`, `src/middleware.ts`, pages/components using
`next/image`, and the backend `medusa develop/build/start` scripts. Source
search found no application imports of `axios`, `protobufjs`, `grpc`,
`immutable`, `qs`, `fast-uri`, `js-yaml`, `uuid`, or `path-to-regexp`; those
classifications therefore remain transitive and conditional on Medusa/framework
loaders. The storefront directly declares `next`, `lodash`, and webpack (the
last is dev-only). The backend directly declares Medusa framework packages,
whose nested dependencies account for most uncertain rows.

## Priority triage

1. Treat both Next.js critical records as **critical production reachable** and
   remediate before deployment; verify the Windows-hosted condition separately.
2. Treat `protobufjs@7.5.4`'s critical RCE and `immutable@3.7.6`'s critical
   prototype-pollution record as **critical production-uncertain**, not
   “dev-only”, until the backend's enabled Medusa modules and runtime imports
   are traced.
3. Treat sharp, lodash, and all high rows marked production-uncertain/reachable
   (Axios closure, fast-uri, js-yaml, qs, uuid, path-to-regexp, gRPC) as
   release blockers for a production-facing deployment until their call paths
   are confirmed or fixed.
4. Build-only findings still affect CI/developer workstations, but should not
   be conflated with production runtime exposure.

No dependency, manifest, or lockfile was modified.