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

// ── UI text ────────────────────────────────────────────────────────────────────

type UIEntry = { en: string; "zh-CN": string; "zh-TW": string };

export const UI_TEXT = {
  // Global
  cancel:             { en: "Cancel",             "zh-CN": "取消",          "zh-TW": "取消" },
  save:               { en: "Save",               "zh-CN": "保存",          "zh-TW": "儲存" },
  done:               { en: "Done",               "zh-CN": "完成",          "zh-TW": "完成" },
  loading:            { en: "Loading...",          "zh-CN": "加载中...",     "zh-TW": "載入中..." },
  goBack:             { en: "Go Back",            "zh-CN": "返回",          "zh-TW": "返回" },
  copied:             { en: "Copied!",            "zh-CN": "已复制！",      "zh-TW": "已複製！" },
  change:             { en: "Change",             "zh-CN": "更换",          "zh-TW": "更換" },
  search:             { en: "Search",             "zh-CN": "搜索",          "zh-TW": "搜尋" },
  retry:              { en: "Retry",              "zh-CN": "重试",          "zh-TW": "重試" },

  // Auth
  signUp:             { en: "Sign up",            "zh-CN": "注册",          "zh-TW": "註冊" },
  logIn:              { en: "Log in",             "zh-CN": "登录",          "zh-TW": "登入" },
  loginTitle:         { en: "Welcome back",       "zh-CN": "欢迎回来",      "zh-TW": "歡迎回來" },
  loginSubtitle:      { en: "Log in to upload",   "zh-CN": "登录后开始上传", "zh-TW": "登入後開始上傳" },
  loginTagline:       { en: "Document and share your photo spots", "zh-CN": "记录并分享你的拍照地点", "zh-TW": "記錄並分享你的拍照地點" },
  registerTitle:      { en: "Create account",     "zh-CN": "创建账号",      "zh-TW": "建立帳號" },
  email:              { en: "Email",              "zh-CN": "邮箱",          "zh-TW": "電子郵件" },
  emailPlaceholder:   { en: "your@email.com",     "zh-CN": "your@email.com","zh-TW": "your@email.com" },
  password:           { en: "Password",           "zh-CN": "密码",          "zh-TW": "密碼" },
  passwordPlaceholder:{ en: "Enter your password","zh-CN": "输入密码",      "zh-TW": "輸入密碼" },
  createPassword:     { en: "Create a password",  "zh-CN": "设置密码",      "zh-TW": "設定密碼" },
  passwordHint:       { en: "At least 6 characters","zh-CN": "至少6个字符",  "zh-TW": "至少6個字元" },
  loggingIn:          { en: "Logging in...",      "zh-CN": "登录中...",     "zh-TW": "登入中..." },
  creating:           { en: "Creating...",        "zh-CN": "创建中...",     "zh-TW": "建立中..." },
  noAccount:          { en: "Don't have an account?", "zh-CN": "还没有账号？","zh-TW": "還沒有帳號？" },
  haveAccount:        { en: "Already have an account?","zh-CN": "已有账号？","zh-TW": "已有帳號？" },
  yourName:           { en: "Your name",          "zh-CN": "你的名字",      "zh-TW": "你的名字" },
  nameRequired:       { en: "Name is required",   "zh-CN": "请输入名字",    "zh-TW": "請輸入名字" },

  // Bottom nav
  home:               { en: "Home",               "zh-CN": "首页",          "zh-TW": "首頁" },
  create:             { en: "Create",             "zh-CN": "发布",          "zh-TW": "發布" },
  profileNav:         { en: "Profile",            "zh-CN": "我的",          "zh-TW": "我的" },

  // Feed
  all:                { en: "All",                "zh-CN": "全部",          "zh-TW": "全部" },
  following:          { en: "Following",          "zh-CN": "关注",          "zh-TW": "關注" },
  nearMe:             { en: "Near me",            "zh-CN": "附近",          "zh-TW": "附近" },
  advancedSearch:     { en: "Advanced search",    "zh-CN": "高级筛选",      "zh-TW": "進階搜尋" },
  loadMore:           { en: "Load more",          "zh-CN": "加载更多",      "zh-TW": "載入更多" },
  searchLocationOrTitle: { en: "Search location or post title…", "zh-CN": "搜索位置或标题…", "zh-TW": "搜尋位置或標題…" },
  bePioneer:          { en: "Be a Pioneer 🚩",    "zh-CN": "成为先锋 🚩",   "zh-TW": "成為先鋒 🚩" },
  beFirstCapture:     { en: "Be the first to capture this place.", "zh-CN": "成为第一个记录此地的人。", "zh-TW": "成為第一個記錄此地的人。" },
  noAurasYet:         { en: "No Auras here yet.", "zh-CN": "暂无帖子。",    "zh-TW": "暫無貼文。" },
  filterByTag:        { en: "Filter by Tag",      "zh-CN": "按标签筛选",    "zh-TW": "按標籤篩選" },
  clear:              { en: "Clear",              "zh-CN": "清除",          "zh-TW": "清除" },

  // Upload
  upload:             { en: "Upload",             "zh-CN": "发布",          "zh-TW": "發布" },
  uploading:          { en: "Uploading...",        "zh-CN": "上传中...",     "zh-TW": "上傳中..." },
  selectPhotos:       { en: "Select photos",      "zh-CN": "选择照片",      "zh-TW": "選擇照片" },
  maxPhotosHint:      { en: "(max 3 photos)",     "zh-CN": "（最多3张）",   "zh-TW": "（最多3張）" },
  gpsHintMulti:       { en: "Select one photo for GPS data (applied to all {n} photos)", "zh-CN": "选择一张照片作为GPS来源（应用于全部{n}张）", "zh-TW": "選擇一張照片作為GPS來源（應用於全部{n}張）" },
  gpsHintSingle:      { en: "GPS / Altitude / Heading from this photo", "zh-CN": "GPS / 海拔 / 方向来自此照片", "zh-TW": "GPS / 海拔 / 方向來自此照片" },
  titlePlaceholder:   { en: "Title",              "zh-CN": "标题",          "zh-TW": "標題" },
  descriptionOptional:{ en: "Description(Optional)", "zh-CN": "描述（可选）","zh-TW": "描述（選填）" },
  tags:               { en: "Tags",               "zh-CN": "标签",          "zh-TW": "標籤" },
  addLocation:        { en: "Add a location",     "zh-CN": "添加位置",      "zh-TW": "新增位置" },
  noGpsAddLocation:   { en: "No GPS found — add a rough location", "zh-CN": "未找到GPS — 添加大致位置", "zh-TW": "未找到GPS — 新增大致位置" },
  useMyLocation:      { en: "Use my location",    "zh-CN": "使用我的位置",  "zh-TW": "使用我的位置" },
  locating:           { en: "Locating…",          "zh-CN": "定位中…",       "zh-TW": "定位中…" },
  searchCityCountry:  { en: "Search city, country…","zh-CN": "搜索城市、国家…","zh-TW": "搜尋城市、國家…" },
  searchLocation:     { en: "Search place or venue…","zh-CN": "搜索地点或场所…","zh-TW": "搜尋地點或場所…" },
  isVenueQuestion:    { en: "Is this at a restaurant, café, or store?", "zh-CN": "这是餐厅、咖啡馆或商店吗？", "zh-TW": "這是餐廳、咖啡館或商店嗎？" },
  venueDesc:          { en: "We'll link your post to that venue", "zh-CN": "我们将把你的帖子与该场所关联", "zh-TW": "我們將把你的貼文與該場所關聯" },
  yesFindIt:          { en: "Yes, find it",       "zh-CN": "是，查找",      "zh-TW": "是，查找" },
  notAVenue:          { en: "Not a venue",        "zh-CN": "不是场所",      "zh-TW": "不是場所" },
  selectAPlace:       { en: "Select a place",     "zh-CN": "选择地点",      "zh-TW": "選擇地點" },
  placesNearPhoto:    { en: "Places near where this photo was taken", "zh-CN": "照片拍摄地附近的地点", "zh-TW": "照片拍攝地附近的地點" },
  findingPlaces:      { en: "Finding nearby places…","zh-CN": "正在查找附近地点…","zh-TW": "正在尋找附近地點…" },
  noPlacesFound:      { en: "No places found nearby","zh-CN": "附近未找到地点","zh-TW": "附近未找到地點" },
  addToExistingSpot:  { en: "Add to an existing spot?","zh-CN": "添加到已有地点？","zh-TW": "新增到既有地點？" },
  nearbySpotsDesc:    { en: "These spots are nearby — add your shot to one, or create a new spot.", "zh-CN": "附近有这些地点，将照片添加到其中，或创建新地点。", "zh-TW": "附近有這些地點，將照片加入其中，或建立新地點。" },
  nearbySpotLabel:    { en: "Nearby spot",        "zh-CN": "附近地点",      "zh-TW": "附近地點" },
  createNewSpot:      { en: "Create new spot",    "zh-CN": "创建新地点",    "zh-TW": "建立新地點" },
  verifiedShot:       { en: "verified shot",      "zh-CN": "已验证照片",    "zh-TW": "已驗證照片" },
  verifiedShots:      { en: "verified shots",     "zh-CN": "已验证照片",    "zh-TW": "已驗證照片" },

  // Post detail
  taken:              { en: "Taken",              "zh-CN": "拍摄于",        "zh-TW": "拍攝於" },
  postNotFound:       { en: "Post not found",     "zh-CN": "帖子不存在",    "zh-TW": "貼文不存在" },
  notVerified:        { en: "Not verified · Approximate location only", "zh-CN": "未验证 · 仅为大致位置", "zh-TW": "未驗證 · 僅為大致位置" },
  walk:               { en: "walk",               "zh-CN": "步行",          "zh-TW": "步行" },
  away:               { en: "away",               "zh-CN": "外",            "zh-TW": "外" },
  confirmed:          { en: "confirmed",          "zh-CN": "已确认",        "zh-TW": "已確認" },
  go:                 { en: "Go",                 "zh-CN": "导航",          "zh-TW": "導航" },
  beFirstToFind:      { en: "Be the first to find this place", "zh-CN": "成为第一个发现此地的人", "zh-TW": "成為第一個發現此地的人" },
  openInMaps:         { en: "Open in Maps",       "zh-CN": "在地图中打开",  "zh-TW": "在地圖中開啟" },
  appleMaps:          { en: "Apple Maps",         "zh-CN": "苹果地图",      "zh-TW": "Apple 地圖" },
  googleMaps:         { en: "Google Maps",        "zh-CN": "谷歌地图",      "zh-TW": "Google 地圖" },
  moreShotsOfSpot:    { en: "More shots of this spot", "zh-CN": "更多此地照片","zh-TW": "更多此地照片" },
  addYourShot:        { en: "Add your shot of this spot", "zh-CN": "添加你在此地的照片", "zh-TW": "新增你在此地的照片" },
  deletePost:         { en: "Delete post?",       "zh-CN": "删除帖子？",    "zh-TW": "刪除貼文？" },
  deleteCannotUndo:   { en: "This can't be undone.", "zh-CN": "此操作不可撤销。","zh-TW": "此操作無法復原。" },
  delete:             { en: "Delete",             "zh-CN": "删除",          "zh-TW": "刪除" },
  deleting:           { en: "Deleting...",        "zh-CN": "删除中...",     "zh-TW": "刪除中..." },
  signUpToSave:       { en: "Sign up to save posts","zh-CN": "注册后可收藏帖子","zh-TW": "註冊後可收藏貼文" },
  signUpToVerify:     { en: "Sign up to verify this place","zh-CN": "注册后可验证此地","zh-TW": "註冊後可驗證此地" },
  signUpToAdd:        { en: "Sign up to add a shot","zh-CN": "注册后可添加照片","zh-TW": "註冊後可新增照片" },

  // Profile (own)
  uploaded:           { en: "Uploaded",           "zh-CN": "已上传",        "zh-TW": "已上傳" },
  saved:              { en: "Saved",              "zh-CN": "已收藏",        "zh-TW": "已收藏" },
  editProfile:        { en: "Edit profile",       "zh-CN": "编辑资料",      "zh-TW": "編輯資料" },
  shareProfile:       { en: "Share profile",      "zh-CN": "分享主页",      "zh-TW": "分享主頁" },
  noPostsYet:         { en: "No posts yet",       "zh-CN": "暂无帖子",      "zh-TW": "暫無貼文" },
  noPostsDesc:        { en: "You haven't uploaded anything yet.", "zh-CN": "你还没有上传任何内容。","zh-TW": "你還沒有上傳任何內容。" },
  noSavedPosts:       { en: "No saved posts",     "zh-CN": "暂无收藏",      "zh-TW": "暫無收藏" },
  noSavedDesc:        { en: "You haven't saved anything yet.", "zh-CN": "你还没有收藏任何内容。","zh-TW": "你還沒有收藏任何內容。" },

  // Profile (public)
  posts:              { en: "posts",              "zh-CN": "帖子",          "zh-TW": "貼文" },
  followers:          { en: "followers",          "zh-CN": "粉丝",          "zh-TW": "粉絲" },
  followingCount:     { en: "following",          "zh-CN": "关注",          "zh-TW": "關注" },
  follow:             { en: "Follow",             "zh-CN": "关注",          "zh-TW": "關注" },
  followingBtn:       { en: "Following",          "zh-CN": "已关注",        "zh-TW": "已關注" },
  userNotFound:       { en: "User not found",     "zh-CN": "用户不存在",    "zh-TW": "用戶不存在" },
  noUserPosts:        { en: "This user hasn't uploaded anything yet.", "zh-CN": "该用户还没有上传任何内容。","zh-TW": "該用戶還沒有上傳任何內容。" },

  // Edit profile
  editProfileTitle:   { en: "Edit profile",       "zh-CN": "编辑资料",      "zh-TW": "編輯資料" },
  namePlaceholder:    { en: "Name",               "zh-CN": "昵称",          "zh-TW": "暱稱" },
  bioPlaceholder:     { en: "Bio",                "zh-CN": "个人简介",      "zh-TW": "個人簡介" },
  bioHint:            { en: "Share your location, your favorite...", "zh-CN": "分享你的位置、你的最爱...", "zh-TW": "分享你的位置、你的最愛..." },
  saveChanges:        { en: "Save Changes",       "zh-CN": "保存更改",      "zh-TW": "儲存變更" },
  saving:             { en: "Saving...",          "zh-CN": "保存中...",     "zh-TW": "儲存中..." },
  account:            { en: "Account",            "zh-CN": "账号",          "zh-TW": "帳號" },

  // Friends
  friendsTitle:       { en: "Find Friends",       "zh-CN": "发现好友",      "zh-TW": "發現好友" },
  searchPeople:       { en: "Search by name or username…","zh-CN": "搜索用户名…","zh-TW": "搜尋用戶名…" },
  searching:          { en: "Searching…",         "zh-CN": "搜索中…",       "zh-TW": "搜尋中…" },
  findPeopleTitle:    { en: "Find people on Aura","zh-CN": "在Aura上发现好友","zh-TW": "在Aura上發現好友" },
  findPeopleDesc:     { en: "Search by name or username to connect with friends", "zh-CN": "通过名字或用户名搜索好友", "zh-TW": "通過名字或用戶名搜尋好友" },
  noUsersFound:       { en: "No users found",     "zh-CN": "未找到用户",    "zh-TW": "未找到用戶" },
  tryDifferentName:   { en: "Try a different name or username", "zh-CN": "换个名字或用户名试试", "zh-TW": "換個名字或用戶名試試" },

  // Notifications
  notificationsTitle: { en: "Notifications",      "zh-CN": "通知",          "zh-TW": "通知" },
  allCaughtUp:        { en: "All caught up",      "zh-CN": "没有新通知",    "zh-TW": "沒有新通知" },
  noNewNotifications: { en: "You have no new notifications", "zh-CN": "暂无新通知", "zh-TW": "暫無新通知" },
  startedFollowing:   { en: "started following you","zh-CN": "开始关注了你", "zh-TW": "開始關注了你" },
  savedYourPost:      { en: "saved your post",    "zh-CN": "收藏了你的帖子","zh-TW": "收藏了你的貼文" },
  addedPerspective:   { en: "added a perspective to your post", "zh-CN": "在你的帖子添加了新视角", "zh-TW": "在你的貼文新增了視角" },
  interacted:         { en: "interacted with you","zh-CN": "与你互动了",    "zh-TW": "與你互動了" },
  justNow:            { en: "just now",           "zh-CN": "刚刚",          "zh-TW": "剛剛" },
  followBack:         { en: "Follow back",        "zh-CN": "回关",          "zh-TW": "回關" },

  // Edit post
  editPost:           { en: "Edit Post",          "zh-CN": "编辑帖子",      "zh-TW": "編輯貼文" },
  photo:              { en: "Photo",              "zh-CN": "照片",          "zh-TW": "照片" },
  photos:             { en: "Photos",             "zh-CN": "照片",          "zh-TW": "照片" },
  tapToRemove:        { en: "· tap ✕ to remove", "zh-CN": "· 点击 ✕ 删除", "zh-TW": "· 點擊 ✕ 刪除" },
  descriptionEdit:    { en: "Description (optional)", "zh-CN": "描述（可选）","zh-TW": "描述（選填）" },

  // Emoji sticker editor
  addStickerTitle:    { en: "Add Sticker",        "zh-CN": "添加贴纸",      "zh-TW": "新增貼紙" },
  addSticker:         { en: "Add sticker",        "zh-CN": "添加贴纸",      "zh-TW": "新增貼紙" },
  savingDots:         { en: "Saving…",            "zh-CN": "保存中…",       "zh-TW": "儲存中…" },

  // Google auth
  continueWithGoogle: { en: "Continue with Google", "zh-CN": "使用 Google 继续", "zh-TW": "使用 Google 繼續" },
  orDivider:          { en: "or",                 "zh-CN": "或",            "zh-TW": "或" },
  googleAuthError:    { en: "Google sign-in failed. Please try again.", "zh-CN": "Google 登录失败，请重试", "zh-TW": "Google 登入失敗，請再試一次" },
} satisfies Record<string, UIEntry>;

export type UITextKey = keyof typeof UI_TEXT;

export function t(key: UITextKey, lang: Language): string {
  const entry = UI_TEXT[key];
  return entry[lang] ?? entry.en;
}
