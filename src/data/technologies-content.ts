// Canonical CMS-editable Git data. No parallel TS copy of the wording.
import type {TechnologyPageContent, TechnologyOverviewContent} from "./technology-types";
export type {TechnologySection, TechnologyPageContent, TechnologyOverviewContent} from "./technology-types";
import t0_tw from "../content/technologies/zh-Hant/xr.json" with {type:"json"};
import t0_en from "../content/technologies/en/xr.json" with {type:"json"};
import t0_jp from "../content/technologies/ja/xr.json" with {type:"json"};
import t1_tw from "../content/technologies/zh-Hant/ai-simulation.json" with {type:"json"};
import t1_en from "../content/technologies/en/ai-simulation.json" with {type:"json"};
import t1_jp from "../content/technologies/ja/ai-simulation.json" with {type:"json"};
import t2_tw from "../content/technologies/zh-Hant/digital-simulation.json" with {type:"json"};
import t2_en from "../content/technologies/en/digital-simulation.json" with {type:"json"};
import t2_jp from "../content/technologies/ja/digital-simulation.json" with {type:"json"};
import t3_tw from "../content/technologies/zh-Hant/training-design.json" with {type:"json"};
import t3_en from "../content/technologies/en/training-design.json" with {type:"json"};
import t3_jp from "../content/technologies/ja/training-design.json" with {type:"json"};
import t4_tw from "../content/technologies/zh-Hant/system-integration.json" with {type:"json"};
import t4_en from "../content/technologies/en/system-integration.json" with {type:"json"};
import t4_jp from "../content/technologies/ja/system-integration.json" with {type:"json"};
import t5_tw from "../content/technologies/zh-Hant/decision-visualization.json" with {type:"json"};
import t5_en from "../content/technologies/en/decision-visualization.json" with {type:"json"};
import t5_jp from "../content/technologies/ja/decision-visualization.json" with {type:"json"};
import t6_tw from "../content/technologies/zh-Hant/domain-expertise.json" with {type:"json"};
import t6_en from "../content/technologies/en/domain-expertise.json" with {type:"json"};
import t6_jp from "../content/technologies/ja/domain-expertise.json" with {type:"json"};
import overview_tw from "../content/technology-overview/zh-Hant/overview.json" with {type:"json"};
import overview_en from "../content/technology-overview/en/overview.json" with {type:"json"};
import overview_jp from "../content/technology-overview/ja/overview.json" with {type:"json"};
export interface TechnologyEntry extends TechnologyPageContent {translationStatus:string;draft:boolean;relatedProducts:string[];relatedSolutions:string[];primaryDestination:string;relationNotes:string[];body?:string}
const entry=(value:TechnologyEntry):TechnologyEntry=>({...value,draft:value.draft??false,intro:value.intro??[],faq:value.faq??[],relatedProducts:value.relatedProducts??[],relatedSolutions:value.relatedSolutions??[],relationNotes:value.relationNotes??[],sections:value.sections.map(section=>({...section,paragraphs:section.paragraphs??[],...(section.items?{items:section.items.map(item=>({...item,paragraphs:item.paragraphs??[]}))}:{})}))});
export const technologyContent = {
 "xr": {tw:entry(t0_tw as TechnologyEntry),en:entry(t0_en as TechnologyEntry),jp:entry(t0_jp as TechnologyEntry)},
 "ai-simulation": {tw:entry(t1_tw as TechnologyEntry),en:entry(t1_en as TechnologyEntry),jp:entry(t1_jp as TechnologyEntry)},
 "digital-simulation": {tw:entry(t2_tw as TechnologyEntry),en:entry(t2_en as TechnologyEntry),jp:entry(t2_jp as TechnologyEntry)},
 "training-design": {tw:entry(t3_tw as TechnologyEntry),en:entry(t3_en as TechnologyEntry),jp:entry(t3_jp as TechnologyEntry)},
 "system-integration": {tw:entry(t4_tw as TechnologyEntry),en:entry(t4_en as TechnologyEntry),jp:entry(t4_jp as TechnologyEntry)},
 "decision-visualization": {tw:entry(t5_tw as TechnologyEntry),en:entry(t5_en as TechnologyEntry),jp:entry(t5_jp as TechnologyEntry)},
 "domain-expertise": {tw:entry(t6_tw as TechnologyEntry),en:entry(t6_en as TechnologyEntry),jp:entry(t6_jp as TechnologyEntry)},
};
const overview=(value:TechnologyOverviewContent)=>({...value,intro:value.intro??[]});
export const overviewContent: Record<"tw"|"en"|"jp",TechnologyOverviewContent> = {tw:overview(overview_tw as TechnologyOverviewContent),en:overview(overview_en as TechnologyOverviewContent),jp:overview(overview_jp as TechnologyOverviewContent)};
