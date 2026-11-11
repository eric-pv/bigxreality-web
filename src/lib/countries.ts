import type { Lang } from "../i18n";

/** ISO 3166-1 alpha-2 countries/regions. Source: IANA tzdb iso3166.tab,
 * ISO/TC 46 N1127 (2024-02-29), public-domain table dated 2025-07-01.
 * https://data.iana.org/time-zones/tzdb/iso3166.tab
 * Labels are generated at build time using ICU; no external API or geolocation.
 */
export const COUNTRY_CODES: readonly string[] = Object.freeze(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ")
);
const locales = {tw:"zh-TW",en:"en",jp:"ja"} as const;
/** Owner-specified names (2026-11-04); the receiver stores the TW-language form. */
const SPECIAL: Record<string, Record<Lang, string>> = {
  TW: {tw:"台灣(中華民國)", en:"Taiwan(ROC)", jp:"台湾（中華民国）"},
  CN: {tw:"中國(中華人民共和國)", en:"China(PRC)", jp:"中国（中華人民共和国）"},
};
const cache = new Map<Lang, {code:string;label:string}[]>();
/** Taiwan first, then every other country/region sorted by its localized name. */
export function countryOptions(lang: Lang): readonly {code:string;label:string}[] {
  if (!cache.has(lang)) {
    const names = new Intl.DisplayNames([locales[lang]], {type:"region"});
    const collator = new Intl.Collator(locales[lang]);
    const label = (code: string) => SPECIAL[code]?.[lang] ?? names.of(code) ?? code;
    const rest = COUNTRY_CODES.filter(code => code !== "TW").map(code => ({code,label:label(code)}))
      .sort((a,b) => collator.compare(a.label,b.label));
    cache.set(lang, [{code:"TW",label:label("TW")}, ...rest]);
  }
  return cache.get(lang)!;
}
