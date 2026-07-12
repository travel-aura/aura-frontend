export type Language = "en" | "zh-CN" | "zh-TW";

const STORAGE_KEY = "aura_language";

export function getLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "zh-CN" || v === "zh-TW") return v;
  return "en";
}

export function setLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new Event("aura:languagechange"));
}

export function cycleLanguage() {
  const cur = getLanguage();
  const next: Language = cur === "en" ? "zh-CN" : cur === "zh-CN" ? "zh-TW" : "en";
  setLanguage(next);
  return next;
}

export function languageLabel(lang: Language) {
  if (lang === "zh-CN") return "简";
  if (lang === "zh-TW") return "繁";
  return "EN";
}

// ── Tag groups ─────────────────────────────────────────────────────────────────

export interface TagGroup {
  key: string;
  label: { en: string; "zh-CN": string; "zh-TW": string };
  tags: string[];
}

export const TAG_GROUPS: TagGroup[] = [
  {
    key: "frame",
    label: { en: "Frame", "zh-CN": "构图", "zh-TW": "構圖" },
    tags: ["Portrait", "Landscape", "Both"],
  },
  {
    key: "light",
    label: { en: "Light & Time", "zh-CN": "光线 & 时间", "zh-TW": "光線 & 時間" },
    tags: ["Sunrise", "Golden hour", "Sunset", "Twilight", "Blue hour", "Night", "Midday"],
  },
  {
    key: "season",
    label: { en: "Season", "zh-CN": "季节", "zh-TW": "季節" },
    tags: ["Spring", "Summer", "Autumn", "Winter"],
  },
  {
    key: "place",
    label: { en: "Place", "zh-CN": "地点", "zh-TW": "地點" },
    tags: [
      "Café", "Bakery", "Restaurant", "Bar", "Rooftop", "Bookshop", "Museum", "Gallery",
      "Market", "Garden", "Park", "Beach", "Viewpoint", "Old town", "Village", "Street",
      "Alley", "Plaza", "Courtyard", "Church", "Castle", "Ruins", "Lighthouse", "Bridge",
      "Waterfall", "Lake", "Hot spring", "Pier",
    ],
  },
  {
    key: "view",
    label: { en: "View", "zh-CN": "景观", "zh-TW": "景觀" },
    tags: ["Ocean view", "Mountain view", "City view", "Skyline", "Rooftop view", "Lookout", "Sunset spot", "Waterfront"],
  },
  {
    key: "vibe",
    label: { en: "Vibe", "zh-CN": "氛围", "zh-TW": "氛圍" },
    tags: [
      "Cozy", "Hidden", "Quiet", "Peaceful", "Romantic", "Dreamy", "Moody",
      "Vintage", "Rustic", "Charming", "Lively", "Minimal", "Elegant", "Scenic", "Authentic",
    ],
  },
  {
    key: "aesthetic",
    label: { en: "Aesthetic", "zh-CN": "美学", "zh-TW": "美學" },
    tags: ["Euro summer", "Mediterranean", "Tropical", "Coastal", "Countryside", "Cottagecore", "Fairytale", "Pastel"],
  },
  {
    key: "colour",
    label: { en: "Colour", "zh-CN": "色彩", "zh-TW": "色彩" },
    tags: ["Blue", "Terracotta", "Golden", "White", "Green"],
  },
];

export const ALL_TAGS: string[] = TAG_GROUPS.flatMap((g) => g.tags);

// ── Translations ───────────────────────────────────────────────────────────────

type Translations = Record<string, { "zh-CN": string; "zh-TW": string }>;

export const TAG_TRANSLATIONS: Translations = {
  // Frame
  Portrait:       { "zh-CN": "人像",      "zh-TW": "人像" },
  Landscape:      { "zh-CN": "风景",      "zh-TW": "風景" },
  Both:           { "zh-CN": "皆有",      "zh-TW": "皆有" },
  // Light & Time
  Sunrise:        { "zh-CN": "日出",      "zh-TW": "日出" },
  "Golden hour":  { "zh-CN": "黄金时刻",  "zh-TW": "黃金時刻" },
  Sunset:         { "zh-CN": "日落",      "zh-TW": "日落" },
  Twilight:       { "zh-CN": "暮光",      "zh-TW": "暮光" },
  "Blue hour":    { "zh-CN": "蓝调时刻",  "zh-TW": "藍調時刻" },
  Night:          { "zh-CN": "夜晚",      "zh-TW": "夜晚" },
  Midday:         { "zh-CN": "正午",      "zh-TW": "正午" },
  // Season
  Spring:         { "zh-CN": "春天",      "zh-TW": "春天" },
  Summer:         { "zh-CN": "夏天",      "zh-TW": "夏天" },
  Autumn:         { "zh-CN": "秋天",      "zh-TW": "秋天" },
  Winter:         { "zh-CN": "冬天",      "zh-TW": "冬天" },
  // Place
  Café:           { "zh-CN": "咖啡馆",    "zh-TW": "咖啡館" },
  Bakery:         { "zh-CN": "面包店",    "zh-TW": "麵包店" },
  Restaurant:     { "zh-CN": "餐厅",      "zh-TW": "餐廳" },
  Bar:            { "zh-CN": "酒吧",      "zh-TW": "酒吧" },
  Rooftop:        { "zh-CN": "屋顶",      "zh-TW": "屋頂" },
  Bookshop:       { "zh-CN": "书店",      "zh-TW": "書店" },
  Museum:         { "zh-CN": "博物馆",    "zh-TW": "博物館" },
  Gallery:        { "zh-CN": "美术馆",    "zh-TW": "美術館" },
  Market:         { "zh-CN": "市场",      "zh-TW": "市場" },
  Garden:         { "zh-CN": "花园",      "zh-TW": "花園" },
  Park:           { "zh-CN": "公园",      "zh-TW": "公園" },
  Beach:          { "zh-CN": "海滩",      "zh-TW": "海灘" },
  Viewpoint:      { "zh-CN": "观景台",    "zh-TW": "觀景台" },
  "Old town":     { "zh-CN": "老城区",    "zh-TW": "老城區" },
  Village:        { "zh-CN": "村庄",      "zh-TW": "村莊" },
  Street:         { "zh-CN": "街道",      "zh-TW": "街道" },
  Alley:          { "zh-CN": "小巷",      "zh-TW": "小巷" },
  Plaza:          { "zh-CN": "广场",      "zh-TW": "廣場" },
  Courtyard:      { "zh-CN": "庭院",      "zh-TW": "庭院" },
  Church:         { "zh-CN": "教堂",      "zh-TW": "教堂" },
  Castle:         { "zh-CN": "城堡",      "zh-TW": "城堡" },
  Ruins:          { "zh-CN": "遗址",      "zh-TW": "遺址" },
  Lighthouse:     { "zh-CN": "灯塔",      "zh-TW": "燈塔" },
  Bridge:         { "zh-CN": "桥",        "zh-TW": "橋" },
  Waterfall:      { "zh-CN": "瀑布",      "zh-TW": "瀑布" },
  Lake:           { "zh-CN": "湖泊",      "zh-TW": "湖泊" },
  "Hot spring":   { "zh-CN": "温泉",      "zh-TW": "溫泉" },
  Pier:           { "zh-CN": "码头",      "zh-TW": "碼頭" },
  // View
  "Ocean view":   { "zh-CN": "海景",      "zh-TW": "海景" },
  "Mountain view":{ "zh-CN": "山景",      "zh-TW": "山景" },
  "City view":    { "zh-CN": "城市景观",  "zh-TW": "城市景觀" },
  Skyline:        { "zh-CN": "天际线",    "zh-TW": "天際線" },
  "Rooftop view": { "zh-CN": "屋顶景观",  "zh-TW": "屋頂景觀" },
  Lookout:        { "zh-CN": "观景点",    "zh-TW": "觀景點" },
  "Sunset spot":  { "zh-CN": "日落观赏点","zh-TW": "日落觀賞點" },
  Waterfront:     { "zh-CN": "滨水区",    "zh-TW": "濱水區" },
  // Vibe
  Cozy:           { "zh-CN": "温馨",      "zh-TW": "溫馨" },
  Hidden:         { "zh-CN": "隐秘",      "zh-TW": "隱秘" },
  Quiet:          { "zh-CN": "安静",      "zh-TW": "安靜" },
  Peaceful:       { "zh-CN": "宁静",      "zh-TW": "寧靜" },
  Romantic:       { "zh-CN": "浪漫",      "zh-TW": "浪漫" },
  Dreamy:         { "zh-CN": "梦幻",      "zh-TW": "夢幻" },
  Moody:          { "zh-CN": "氛围感",    "zh-TW": "氛圍感" },
  Vintage:        { "zh-CN": "复古",      "zh-TW": "復古" },
  Rustic:         { "zh-CN": "乡村风",    "zh-TW": "鄉村風" },
  Charming:       { "zh-CN": "迷人",      "zh-TW": "迷人" },
  Lively:         { "zh-CN": "热闹",      "zh-TW": "熱鬧" },
  Minimal:        { "zh-CN": "极简",      "zh-TW": "極簡" },
  Elegant:        { "zh-CN": "优雅",      "zh-TW": "優雅" },
  Scenic:         { "zh-CN": "风景优美",  "zh-TW": "風景優美" },
  Authentic:      { "zh-CN": "地道",      "zh-TW": "道地" },
  // Aesthetic group
  "Euro summer":  { "zh-CN": "欧式夏日",  "zh-TW": "歐式夏日" },
  Mediterranean:  { "zh-CN": "地中海风",  "zh-TW": "地中海風" },
  Tropical:       { "zh-CN": "热带风情",  "zh-TW": "熱帶風情" },
  Coastal:        { "zh-CN": "海岸风",    "zh-TW": "海岸風" },
  Countryside:    { "zh-CN": "乡村风光",  "zh-TW": "鄉村風光" },
  Cottagecore:    { "zh-CN": "田园风",    "zh-TW": "田園風" },
  Fairytale:      { "zh-CN": "童话风",    "zh-TW": "童話風" },
  Pastel:         { "zh-CN": "马卡龙色",  "zh-TW": "馬卡龍色" },
  // Colour
  Blue:           { "zh-CN": "蓝色",      "zh-TW": "藍色" },
  Terracotta:     { "zh-CN": "陶土色",    "zh-TW": "陶土色" },
  Golden:         { "zh-CN": "金色",      "zh-TW": "金色" },
  White:          { "zh-CN": "白色",      "zh-TW": "白色" },
  Green:          { "zh-CN": "绿色",      "zh-TW": "綠色" },
};

export function translateTag(tag: string, lang: Language): string {
  if (lang === "en") return tag;
  return TAG_TRANSLATIONS[tag]?.[lang] ?? tag;
}

export function translateGroupLabel(group: TagGroup, lang: Language): string {
  return group.label[lang];
}
