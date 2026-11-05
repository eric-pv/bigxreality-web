/** Storage uses BCP-47 names for Sveltia. Public routes and logical Astro IDs stay tw/en/jp. */
export const CONTENT_LOCALES={tw:'zh-Hant',en:'en',jp:'ja'} as const;
export type SiteContentLanguage=keyof typeof CONTENT_LOCALES;
export const contentLocale=(lang:string): (typeof CONTENT_LOCALES)[SiteContentLanguage]=>{
 if(Object.hasOwn(CONTENT_LOCALES,lang))return CONTENT_LOCALES[lang as SiteContentLanguage];
 if((Object.values(CONTENT_LOCALES) as string[]).includes(lang))return lang as (typeof CONTENT_LOCALES)[SiteContentLanguage];
 throw new Error(`Unknown site language: ${lang}`);
};
export const routeLocale=(locale:string):SiteContentLanguage=>{
 const found=Object.entries(CONTENT_LOCALES).find(([,storage])=>storage===locale)?.[0];
 if(found)return found as SiteContentLanguage;
 throw new Error(`Unknown content locale: ${locale}`);
};
export const contentEntryId=(entry:string,{allowLegacy=false}={})=>{const [locale,...rest]=entry.replaceAll('\\','/').split('/');const route=allowLegacy&&['tw','jp'].includes(locale)?locale:routeLocale(locale);return `${route}/${rest.join('/').replace(/\.(md|json)$/,'')}`;};
