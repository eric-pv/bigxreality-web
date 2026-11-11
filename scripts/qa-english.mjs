// English solutions and product pages (/en/): complete localization of the Traditional Chinese master —
// each page renders its content file, keeps the Chinese page's sections and item counts, the five FAQs
// and their scope statements, with no Chinese or placeholder text. Shared checks: lib/qa-localized.mjs.
import { runLocalizedQa } from "./lib/qa-localized.mjs";

await runLocalizedQa({
  lang: "en",
  port: 4339,
  htmlLang: "en",
  foreign: /[぀-ヿ㐀-鿿]/,
  nav: { top: ["Solutions", "Products", "Core Technology", "Resources", "About BXR"], resources: ["News", "Insights", "Case Studies"], contact: "Contact BXR" },
  scope: {
    sut: ["One integration application confirmed so far is that image information from the USV system can be sent to the SUT training environment."],
    uav: ["is not equivalent to deployed drone detection, jamming or interception equipment"],
    usv: ["cannot be claimed to provide remote control of an actual unmanned vessel", "does not mean that all functions of the two systems are interoperable"],
    "wargaming-table": ["this does not mean they have a default connection capability"],
    "mortar-observation": ["should not be understood as a complete simulation of physically firing a mortar"],
    "full-scale-police-training": ["should not be regarded as equipment with actual law-enforcement use"],
    "fire-extinguisher-simulator": ["Actual use must still follow local fire regulations and equipment labelling."],
  },
});
