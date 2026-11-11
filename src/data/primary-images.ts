/** Approved uploads mapped to existing Hero (#1) / primary-card fields in docs/*-IMAGE-REQUIREMENTS.md.
 * No workflow, capability or scenario slots are filled from these primary images.
 */
import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n';
import image0 from '../assets/images/products/sut-squad-vr-tactical-training.webp';
import image1 from '../assets/images/products/uav-drone-training-operator-simulation.webp';
import image2 from '../assets/images/products/usv-vr-training-operation.webp';
import image3 from '../assets/images/products/wargaming-table-team-planning-discussion.webp';
import image4 from '../assets/images/products/mortar-observation-xr-training.webp';
import image5 from '../assets/images/products/sniper-simulator-trainee-operation.webp';
import image6 from '../assets/images/products/machine-gun-simulator-indoor-training-illustration.webp';
import image7 from '../assets/images/products/humvee-driving-simulator-instructor-illustration.webp';
import image8 from '../assets/images/products/speedboat-simulator-sea-training-illustration.webp';
import image9 from '../assets/images/products/full-scale-police-training-vr-facility.webp';
import image10 from '../assets/images/products/police-box-portable-training-unit-trainee.webp';
import image11 from '../assets/images/products/vr-fire-extinguisher-training-trainee.webp';
import image12 from '../assets/images/products/military-simulation-training.webp';
import image13 from '../assets/images/products/police-simulation-training.webp';
import image14 from '../assets/images/products/smart-city-3d-digital-twin.webp';

export const primaryImages = {
  'products/sut': { src: image0, file: "sut-squad-vr-tactical-training.webp", alt: {"tw":"SUT 小部隊 VR 戰術訓練","en":"SUT small-unit VR tactical training","jp":"SUT 小部隊 VR 戦術訓練"}, fit: 'cover', position: '50% 28%', illustration: false },
  'products/uav': { src: image1, file: "uav-drone-training-operator-simulation.webp", alt: {"tw":"UAV 訓練系統代表畫面","en":"UAV training system representative image","jp":"UAV 訓練システムの紹介画像"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/usv': { src: image2, file: "usv-vr-training-operation.webp", alt: {"tw":"USV 無人船訓練系統操作畫面","en":"USV training system operation","jp":"USV 訓練システムの操作画面"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/wargaming-table': { src: image3, file: "wargaming-table-team-planning-discussion.webp", alt: {"tw":"兵棋圖台訓練與規劃討論","en":"Wargaming table training and planning discussion","jp":"兵棋演習テーブルでの訓練と計画検討"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/mortar-observation': { src: image4, file: "mortar-observation-xr-training.webp", alt: {"tw":"迫擊砲觀測模擬訓練","en":"Mortar observation simulation training","jp":"迫撃砲観測シミュレーション訓練"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/sniper-simulator': { src: image5, file: "sniper-simulator-trainee-operation.webp", alt: {"tw":"狙擊模擬訓練操作","en":"Sniper simulation training operation","jp":"狙撃シミュレーション訓練の操作"}, fit: 'cover', position: '50% 60%', illustration: false },
  'products/machine-gun-simulator': { src: image6, file: "machine-gun-simulator-indoor-training-illustration.webp", alt: {"tw":"機槍模擬訓練情境示意","en":"Machine gun simulation training illustration","jp":"機関銃シミュレーション訓練のイメージ"}, fit: 'cover', position: '50% 50%', illustration: true },
  'products/hmmwv-simulator': { src: image7, file: "humvee-driving-simulator-instructor-illustration.webp", alt: {"tw":"悍馬車駕駛模擬器訓練","en":"HMMWV driving simulator training","jp":"HMMWV 運転シミュレーター訓練"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/tactical-boat-simulator': { src: image8, file: "speedboat-simulator-sea-training-illustration.webp", alt: {"tw":"快艇模擬器訓練","en":"Tactical boat simulator training","jp":"高速艇シミュレーター訓練"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/full-scale-police-training': { src: image9, file: "full-scale-police-training-vr-facility.webp", alt: {"tw":"全配式警勤 VR 訓練設施示意","en":"Full-scale police VR training facility illustration","jp":"据置型警察 VR 訓練施設のイメージ"}, fit: 'cover', position: '50% 50%', illustration: true },
  'products/police-box': { src: image10, file: "police-box-portable-training-unit-trainee.webp", alt: {"tw":"Police BOX 攜帶式警勤訓練設備","en":"Police BOX portable police training equipment","jp":"Police BOX 可搬型警察訓練機器"}, fit: 'cover', position: '50% 50%', illustration: false },
  'products/fire-extinguisher-simulator': { src: image11, file: "vr-fire-extinguisher-training-trainee.webp", alt: {"tw":"VR 滅火器訓練代表畫面","en":"VR fire extinguisher training representative image","jp":"VR 消火器訓練の紹介画像"}, fit: 'cover', position: '50% 50%', illustration: false },
  'solutions/fire-rescue': { src: image11, file: "vr-fire-extinguisher-training-trainee.webp", alt: {"tw":"VR 滅火器訓練代表畫面","en":"VR fire extinguisher training representative image","jp":"VR 消火器訓練の紹介画像"}, fit: 'cover', position: '50% 50%', illustration: false },
  'solutions/military': { src: image12, file: "military-simulation-training.webp", alt: {"tw":"軍事模擬訓練代表畫面","en":"Military simulation training","jp":"軍事シミュレーション訓練"}, fit: 'cover', position: '50% 28%', illustration: false },
  'solutions/police': { src: image13, file: "police-simulation-training.webp", alt: {"tw":"警勤模擬訓練代表畫面","en":"Police simulation training","jp":"警察業務シミュレーション訓練"}, fit: 'cover', position: '50% 35%', illustration: false },
  'solutions/smart-city': { src: image14, file: "smart-city-3d-digital-twin.webp", alt: {"tw":"智慧城市三維數位場景示意","en":"Smart city 3D digital environment illustration","jp":"スマートシティの3D デジタル環境イメージ"}, fit: 'contain', position: '50% 50%', illustration: true },
} as const;
export function primaryImage(collection: 'products' | 'solutions', slug: string, lang: Lang) {
  const entry = primaryImages[`${collection}/${slug}` as keyof typeof primaryImages];
  return entry ? { src: entry.src, alt: entry.alt[lang], illustration: entry.illustration } : undefined;
}
export function imagePresentation(src: ImageMetadata) {
  return Object.values(primaryImages).find(entry => entry.src.src === src.src) ?? { fit: 'contain', position: '50% 50%', file: undefined, illustration: false };
}
