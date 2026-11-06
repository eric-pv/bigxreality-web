/**
 * Home page (/[lang]/): selection settings and home-only marketing copy.
 * Names, summaries, images and routes of products, solutions and technologies are NOT
 * kept here; the page reads them from their collections / data modules, so later
 * edits there show up on the home page automatically. Chinese (tw) is the source copy;
 * en and jp are translated from it and must keep the same structure.
 */
import type { Lang } from "../i18n";
import type { TechnologyId } from "../lib/technologies";

/** Display settings shared by all three languages (same items, same order). */
export const homeConfig = {
  /** Product slugs in src/content/products, in display order. The first one is shown large. */
  featuredProducts: ["sut", "police-box", "uav", "fire-extinguisher-simulator"],
  /** Technology ids shown in Section 04 (of the seven in src/lib/technologies.ts). */
  featuredTechnologies: ["xr", "ai-simulation", "digital-simulation", "system-integration"] as TechnologyId[],
  /** The four solution categories (top-level entries of src/content/solutions). MUM-T / NOVA stay under military. */
  solutions: ["military", "police", "fire-rescue", "smart-city"],
  /**
   * Case studies: these slugs first (when published in the language), then the newest
   * published cases fill the remaining places.
   */
  featuredCases: [] as string[],
  caseCount: 2,
  newsCount: 3,
} as const;

interface Point { title: string; description: string }
export interface HomeCopy {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; subtitle: string; description: string; primary: string; secondary: string; videoLabel: string; pause: string; play: string; posterAlt: string };
  value: { eyebrow: string; title: string; paragraphs: string[]; points: Point[] };
  products: { eyebrow: string; title: string; description: string; viewAll: string; more: string; items: Record<string, Point> };
  technologies: { eyebrow: string; title: string; paragraphs: string[]; button: string; items: Record<string, string> };
  solutions: { eyebrow: string; title: string; description: string; viewAll: string; items: Record<string, string> };
  cases: { eyebrow: string; title: string; description: string; viewAll: string; placeholder: string };
  news: { eyebrow: string; title: string; description: string; viewAll: string; placeholder: string };
  cta: { title: string; description: string; primary: string; secondary: string };
}

export const homeCopy: Record<Lang, HomeCopy> = {
  tw: {
    seo: {
      title: "沉浸式模擬訓練與 XR 系統整合",
      description: "Big x Reality 全球動力科技結合 XR 延展實境、AI 智慧模擬、互動設備與系統整合，提供軍事、警勤、消防防災及智慧城市的專業模擬訓練與數位化應用解決方案。",
    },
    hero: {
      eyebrow: "Big x Reality",
      title: "虛擬訓練，真實應變",
      subtitle: "讓演練更接近真實任務。",
      description: "從軍事、警勤到消防防災，Big x Reality 結合沉浸式模擬、互動設備與系統整合技術，將專業訓練需求轉化為可實際操作、反覆演練的訓練環境。",
      primary: "探索解決方案",
      secondary: "了解 BXR",
      videoLabel: "BXR 沉浸式警勤與戰術訓練實況影片",
      pause: "暫停背景影片",
      play: "播放背景影片",
      posterAlt: "三名身穿警察制服的學員頭戴 VR 頭盔、手持訓練用槍械進行沉浸式警勤訓練",
    },
    value: {
      eyebrow: "為什麼需要模擬訓練",
      title: "反覆演練，累積應變能力",
      paragraphs: [
        "面對複雜環境、突發狀況與高風險任務，專業訓練結合設備操作熟悉與持續的觀察、判斷及應變練習。",
        "透過模擬技術與實體操作設備的結合，讓原本受到場地、資源或安全條件限制的訓練，擁有更多實施與練習的可能。",
      ],
      points: [
        { title: "安全可控", description: "在可控的模擬環境中練習高風險情境，補充傳統實地訓練的限制。" },
        { title: "反覆演練", description: "依照不同任務目標與情境條件，持續熟悉操作流程與應變方式。" },
        { title: "彈性配置", description: "從個人操作、多人協同到大型系統整合，依實際需求規劃適合的訓練方式。" },
      ],
    },
    products: {
      eyebrow: "精選產品",
      title: "結合模擬情境與實體互動的專業訓練。",
      description: "從戰術行動、警勤應變到無人系統與消防操作，BXR 結合模擬環境與實體互動，提供操作、判斷與任務練習。",
      viewAll: "探索所有產品",
      more: "了解產品",
      items: {
        sut: { title: "戰術訓練，從觀察走向行動", description: "在多元模擬環境中，練習戰術操作與任務應變。" },
        "police-box": { title: "警勤應變，從操作走向判斷", description: "透過互動情境，延伸警具操作與勤務訓練的可能。" },
        uav: { title: "無人系統，從設備操作延伸至任務訓練", description: "結合無人機戰術及反制訓練，探索不同任務情境的模擬應用。" },
        "fire-extinguisher-simulator": { title: "消防教育，從知識走向實際操作", description: "結合擬真滅火器與虛擬火場，建立可反覆練習的學習環境。" },
      },
    },
    technologies: {
      eyebrow: "核心技術",
      title: "讓技術在實際應用中創造價值。",
      paragraphs: [
        "沉浸式畫面只是開始。",
        "從虛擬環境的建構、實體設備的互動，到訓練流程與系統資訊的整合，BXR 以不同技術能力相互配合，協助專業單位建立符合實際需求的模擬訓練應用。",
      ],
      button: "探索核心技術",
      items: {
        xr: "讓使用者進入模擬環境，透過沉浸式體驗參與不同任務情境。",
        "ai-simulation": "依適用系統與實際配置，延伸智慧化互動及模擬應用的可能。",
        "digital-simulation": "依據不同任務需求，建立對應的三維場域與模擬環境。",
        "system-integration": "依實際專案條件，串聯適用設備與資訊系統，延伸整體應用價值。",
      },
    },
    solutions: {
      eyebrow: "解決方案",
      title: "不同任務，同樣需要更好的準備。",
      description: "每個專業領域都有不同的任務環境與訓練挑戰。BXR 從實際使用需求出發，將模擬技術與系統整合能力應用於不同場域，協助使用單位探索更合適的訓練與數位化應用方式。",
      viewAll: "查看所有解決方案",
      items: {
        military: "從個人操作、戰術演練到跨系統整合，支援不同層級的軍事訓練需求。",
        police: "結合警具操作、言語溝通與勤務情境，協助警勤人員練習現場判斷與應變。",
        "fire-rescue": "透過沉浸式情境與擬真操作，讓消防及防災教育更具互動性與實作性。",
        "smart-city": "運用三維視覺化、數位模擬及整合技術，探索不同場域的智慧應用。",
      },
    },
    cases: {
      eyebrow: "成功案例",
      title: "從實際需求出發，讓技術走進應用現場。",
      description: "每一項專業訓練與數位化應用，都始於不同的任務需求。透過實際專案與應用經驗，持續探索模擬技術在不同場域中的可能性。",
      viewAll: "查看所有成功案例",
      placeholder: "【開發用佔位】成功案例資料尚未建立，正式網站不顯示此卡片",
    },
    news: {
      eyebrow: "最新消息",
      title: "持續探索，讓更多可能成為現實。",
      description: "從技術發展、專業展會到最新應用，掌握 BXR 在沉浸式模擬與專業訓練領域的最新動態。",
      viewAll: "查看所有最新消息",
      placeholder: "【開發用佔位】最新消息資料尚未建立，正式網站不顯示此卡片",
    },
    cta: {
      title: "下一次訓練，可以從更好的規劃開始。",
      description: "無論是單一設備訓練、專業情境模擬，或跨系統整合需求，BXR 都能從實際應用目標出發，共同評估適合的規劃方向。",
      primary: "聯絡 BXR",
      secondary: "探索解決方案",
    },
  },
  en: {
    seo: {
      title: "XR Simulation Training & System Integration",
      description: "Big x Reality delivers XR simulation training, AI-assisted simulation, interactive equipment, and system integration solutions for military, police, fire and disaster response, and smart city applications.",
    },
    hero: {
      eyebrow: "Big x Reality",
      title: "Train Today. Protect Tomorrow.",
      subtitle: "Bringing every drill closer to the real mission.",
      description: "From military and police to fire and disaster response, Big x Reality combines immersive simulation, interactive equipment and system integration to turn professional training needs into training environments that can be operated hands-on and practiced again and again.",
      primary: "Explore Solutions",
      secondary: "About BXR",
      videoLabel: "Footage of BXR immersive police and tactical training",
      pause: "Pause background video",
      play: "Play background video",
      posterAlt: "Three trainees in police uniforms wearing VR headsets and holding training firearms during immersive police training",
    },
    value: {
      eyebrow: "Why Simulation",
      title: "Build professional response skills through repeated practice.",
      paragraphs: [
        "Professional training for complex environments, sudden incidents and high-risk missions combines equipment familiarity with continuous practice in observation, judgment and response.",
        "By combining simulation technology with physical training equipment, training that was once limited by venue, resources or safety conditions gains more ways to be carried out and practiced.",
      ],
      points: [
        { title: "Safe and Controlled", description: "Practice high-risk scenarios in a controlled simulation environment, complementing the limits of traditional field training." },
        { title: "Repeatable Practice", description: "Build familiarity with procedures and responses under different mission objectives and scenario conditions." },
        { title: "Flexible Configuration", description: "From individual operation and team coordination to large-scale system integration, plan the training approach that fits actual needs." },
      ],
    },
    products: {
      eyebrow: "Featured Products",
      title: "Immersive simulation for hands-on training.",
      description: "From tactical operations and police response to unmanned systems and firefighting, BXR combines simulated environments with physical interaction, so training goes beyond watching and extends into operation, judgment and mission practice.",
      viewAll: "Explore All Products",
      more: "View product",
      items: {
        sut: { title: "Tactical training, from observation to action", description: "Practice tactical operations and mission response in diverse simulated environments." },
        "police-box": { title: "Police response, from operation to judgment", description: "Interactive scenarios extend the possibilities of equipment handling and duty training." },
        uav: { title: "Unmanned systems, from operating equipment to mission training", description: "Combining drone tactics and counter-drone training to explore simulation across different mission scenarios." },
        "fire-extinguisher-simulator": { title: "Fire safety education, from knowledge to hands-on practice", description: "Realistic extinguishers and virtual fire scenes create a learning environment for repeated practice." },
      },
    },
    technologies: {
      eyebrow: "Core Technologies",
      title: "Technology creates value through practical application.",
      paragraphs: [
        "Immersive visuals are only the beginning.",
        "From building virtual environments and interacting with physical equipment to integrating training workflows and system information, BXR brings different technical capabilities together to help professional organizations build simulation training applications that meet actual needs.",
      ],
      button: "Explore Core Technologies",
      items: {
        xr: "Lets users enter a simulated environment and take part in different mission scenarios through immersive experience.",
        "ai-simulation": "Depending on the applicable system and actual configuration, extends the possibilities of intelligent interaction and simulation.",
        "digital-simulation": "Builds the 3D spaces and simulated environments that different mission needs call for.",
        "system-integration": "Depending on actual project conditions, connects applicable equipment and information systems to extend overall value.",
      },
    },
    solutions: {
      eyebrow: "Solutions",
      title: "Different missions, the same need for better preparation.",
      description: "Every professional field has its own mission environments and training challenges. Starting from actual user needs, BXR applies simulation technology and system integration to different settings, helping organizations explore more suitable approaches to training and digital applications.",
      viewAll: "View All Solutions",
      items: {
        military: "From individual operation and tactical drills to cross-system integration, supporting military training needs at different levels.",
        police: "Combining equipment handling, verbal communication and duty scenarios to help officers practice on-scene judgment and response.",
        "fire-rescue": "Immersive scenarios and realistic operation make fire safety and disaster preparedness education more interactive and hands-on.",
        "smart-city": "Applying 3D visualization, digital simulation and integration technologies to explore smart applications in different settings.",
      },
    },
    cases: {
      eyebrow: "Case Studies",
      title: "Starting from real needs, bringing technology into the field.",
      description: "Professional training and digital applications begin with mission requirements. BXR draws on project and application experience to explore simulation technology across different settings.",
      viewAll: "View All Case Studies",
      placeholder: "[DEV PLACEHOLDER] No case studies yet. This card is not shown on the public site.",
    },
    news: {
      eyebrow: "Latest News",
      title: "Exploring further, turning more possibilities into reality.",
      description: "From technology development and professional exhibitions to new applications, follow the latest from BXR in immersive simulation and professional training.",
      viewAll: "View All News",
      placeholder: "[DEV PLACEHOLDER] No news yet. This card is not shown on the public site.",
    },
    cta: {
      title: "Effective training starts with considered planning.",
      description: "BXR evaluates single-device training, professional scenario simulation and cross-system integration around confirmed application goals and project requirements.",
      primary: "Contact BXR",
      secondary: "Explore Solutions",
    },
  },
  jp: {
    seo: {
      title: "XR シミュレーション訓練とシステム統合",
      description: "Big x Reality は、XR、AI シミュレーション、インタラクティブ機器、システム統合技術を活用し、軍事、警察、消防・防災、スマートシティ分野に向けた専門訓練・デジタル活用ソリューションを提供します。",
    },
    hero: {
      eyebrow: "Big x Reality",
      title: "仮想の訓練から、実際の対応力へ",
      subtitle: "演習を実際の任務に近づける。",
      description: "軍事・警察から消防防災まで、Big x Reality は没入型シミュレーション、インタラクティブ機器、システム統合技術を組み合わせ、専門訓練のニーズを、実際に操作し繰り返し演習できる訓練環境へと形にします。",
      primary: "ソリューションを見る",
      secondary: "BXR について",
      videoLabel: "BXR の没入型警察・戦術訓練の映像",
      pause: "背景動画を一時停止",
      play: "背景動画を再生",
      posterAlt: "警察の制服を着た 3 名の訓練生が VR ヘッドセットを装着し、訓練用銃器を構えて没入型警察訓練を行う様子",
    },
    value: {
      eyebrow: "シミュレーション訓練の意義",
      title: "反復演習で、対応力を育てる。",
      paragraphs: [
        "複雑な環境、突発的な事態、高リスクな任務に向き合う専門訓練では、機器操作の習熟と観察・判断・対応の継続的な練習を組み合わせます。",
        "シミュレーション技術と実機操作機器を組み合わせることで、これまで場所、資源、安全条件に制約されていた訓練に、より多くの実施と練習の可能性をもたらします。",
      ],
      points: [
        { title: "安全で制御可能", description: "制御されたシミュレーション環境で高リスクな状況を練習し、従来の実地訓練の制約を補います。" },
        { title: "繰り返し演習", description: "任務目標や状況条件に応じて、操作手順と対応方法への習熟を継続的に深めます。" },
        { title: "柔軟な構成", description: "個人操作、複数人での連携から大規模なシステム統合まで、実際のニーズに合った訓練方法を計画します。" },
      ],
    },
    products: {
      eyebrow: "主要製品",
      title: "単なるシミュレーション映像ではなく、実際に参加できる訓練へ。",
      description: "戦術行動、警察対応から無人システム、消防操作まで、BXR はシミュレーション環境と実機によるインタラクションを組み合わせ、訓練を「見る」だけで終わらせず、操作・判断・任務演習へと広げます。",
      viewAll: "すべての製品を見る",
      more: "製品を見る",
      items: {
        sut: { title: "戦術訓練を、観察から行動へ", description: "多様なシミュレーション環境で、戦術操作と任務対応を練習します。" },
        "police-box": { title: "警察対応を、操作から判断へ", description: "インタラクティブな状況設定により、警察装備の操作と勤務訓練の可能性を広げます。" },
        uav: { title: "無人システムを、機器操作から任務訓練へ", description: "ドローン戦術と対ドローン訓練を組み合わせ、さまざまな任務状況でのシミュレーション活用を探ります。" },
        "fire-extinguisher-simulator": { title: "消防教育を、知識から実際の操作へ", description: "リアルな消火器とバーチャル火災現場を組み合わせ、繰り返し練習できる学習環境をつくります。" },
      },
    },
    technologies: {
      eyebrow: "コア技術",
      title: "技術の価値は、見せることではなく、実際に活かすことにある。",
      paragraphs: [
        "没入型の映像は、始まりにすぎません。",
        "仮想環境の構築、実機とのインタラクションから、訓練プロセスとシステム情報の統合まで、BXR はさまざまな技術を連携させ、専門機関が実際のニーズに合ったシミュレーション訓練を構築できるよう支援します。",
      ],
      button: "コア技術を見る",
      items: {
        xr: "利用者をシミュレーション環境に導き、没入型体験を通じてさまざまな任務状況に参加できるようにします。",
        "ai-simulation": "対象システムと実際の構成に応じて、インテリジェントなインタラクションとシミュレーション活用の可能性を広げます。",
        "digital-simulation": "任務のニーズに応じて、対応する 3D 空間とシミュレーション環境を構築します。",
        "system-integration": "実際のプロジェクト条件に応じて、適用可能な機器と情報システムを連携させ、全体の活用価値を高めます。",
      },
    },
    solutions: {
      eyebrow: "ソリューション",
      title: "任務は違っても、より良い備えが必要なことは同じ。",
      description: "専門分野ごとに、任務環境と訓練の課題は異なります。BXR は実際の利用ニーズから出発し、シミュレーション技術とシステム統合力をさまざまな現場に活かし、利用機関がより適した訓練とデジタル活用の方法を見いだせるよう支援します。",
      viewAll: "すべてのソリューションを見る",
      items: {
        military: "個人操作、戦術演習からシステム横断の統合まで、さまざまなレベルの軍事訓練ニーズに対応します。",
        police: "警察装備の操作、言語によるコミュニケーション、勤務状況を組み合わせ、警察官が現場での判断と対応を練習できるよう支援します。",
        "fire-rescue": "没入型の状況設定とリアルな操作により、消防・防災教育をよりインタラクティブで実践的なものにします。",
        "smart-city": "3D 可視化、デジタルシミュレーション、統合技術を活用し、さまざまな現場でのスマートな活用を探ります。",
      },
    },
    cases: {
      eyebrow: "導入事例",
      title: "実際のニーズから出発し、技術を活用の現場へ。",
      description: "あらゆる専門訓練とデジタル活用は、それぞれの任務ニーズから始まります。実際のプロジェクトと活用経験を通じて、さまざまな現場におけるシミュレーション技術の可能性を探り続けています。",
      viewAll: "すべての導入事例を見る",
      placeholder: "【開発用プレースホルダー】導入事例データは未登録です。公開サイトには表示されません。",
    },
    news: {
      eyebrow: "ニュース",
      title: "探求を続け、より多くの可能性を現実に。",
      description: "技術開発や専門展示会から最新の活用事例まで、没入型シミュレーションと専門訓練の分野における BXR の最新情報をお届けします。",
      viewAll: "すべてのニュースを見る",
      placeholder: "【開発用プレースホルダー】ニュースデータは未登録です。公開サイトには表示されません。",
    },
    cta: {
      title: "次の訓練は、より良い計画から始められる。",
      description: "単一機器での訓練、専門的な状況シミュレーション、システム横断の統合まで、BXR は実際の活用目標から出発し、最適な計画の方向性を共に検討します。",
      primary: "お問い合わせ",
      secondary: "ソリューションを見る",
    },
  },
};
