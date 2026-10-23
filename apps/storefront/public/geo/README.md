The bundled IP ranges are derived from the public-domain IPtoASN country files
at https://iptoasn.com/ . Only ranges for Türkiye, Bulgaria, and Arab League
countries (the non-English languages configured in `src/lib/i18n/config.ts`)
are included. Visitors outside those countries use English. The compressed
TSV files retain the original ascending range order and tab-separated
`start	end	country` format; IPv4 starts and ends are unsigned integers.

Refresh these files periodically from `ip2country-v4-u32.tsv.gz` and
`ip2country-v6.tsv.gz` using the current country list. This is an offline
snapshot, so recently reassigned IP ranges may be classified incorrectly
until refreshed. No visitor IP is sent to IPtoASN.