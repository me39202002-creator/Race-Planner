/**
 * Race Split Planner - 多語系與賽前裝備資料字典
 */
let currentLang = 'zh';

// 賽前清單類別定義
const checklistCategories = [
    { id: 'apparel', zh: '服裝與穿戴', en: 'Apparel & Wearables' },
    { id: 'nutrition', zh: '補給與營養', en: 'Nutrition & Hydration' },
    { id: 'electronics', zh: '電子設備', en: 'Electronics' },
    { id: 'misc', zh: '必備與其他', en: 'Essentials & Misc' }
];

// 賽前裝備清單項目
const checklistItems = {
    apparel: [
        { id: 'shoes', zh: '跑鞋 (已習慣的戰靴)', en: 'Running Shoes' },
        { id: 'socks', zh: '運動襪 (防起水泡)', en: 'Running Socks' },
        { id: 'shirt', zh: '排汗跑衣', en: 'Running Shirt' },
        { id: 'shorts', zh: '跑褲 / 緊身褲', en: 'Running Shorts/Tights' },
        { id: 'hat', zh: '帽子 / 空心帽', en: 'Hat / Visor' },
        { id: 'sunglasses', zh: '運動太陽眼鏡', en: 'Sunglasses' }
    ],
    nutrition: [
        { id: 'gels', zh: '能量膠 (依計畫數量)', en: 'Energy Gels' },
        { id: 'salt', zh: '鹽錠 / 電解質', en: 'Salt Tabs / Electrolytes' },
        { id: 'water', zh: '水壺 (如有需要)', en: 'Water Bottle' },
        { id: 'breakfast', zh: '賽前早餐 (提早吃完)', en: 'Pre-race Breakfast' }
    ],
    electronics: [
        { id: 'watch', zh: 'GPS 手錶 (充飽電)', en: 'GPS Watch (Charged)' },
        { id: 'hrm', zh: '心率帶 (如有)', en: 'Heart Rate Monitor' },
        { id: 'phone', zh: '手機', en: 'Smartphone' },
        { id: 'earphones', zh: '藍牙耳機 (充飽電)', en: 'Earphones (Charged)' }
    ],
    misc: [
        { id: 'bib', zh: '號碼布 & 別針/號碼帶', en: 'Race Bib & Pins/Belt' },
        { id: 'chip', zh: '計時晶片', en: 'Timing Chip' },
        { id: 'vaseline', zh: '防摩擦膏 / 凡士林', en: 'Anti-chafe Balm / Vaseline' },
        { id: 'sunscreen', zh: '防曬乳', en: 'Sunscreen' },
        { id: 'clothes', zh: '賽後毛巾與替換衣物', en: 'Post-race Towel & Clothes' }
    ]
};

// 雙語字典
const i18n = {
    zh: {
        pageTitle: "配速計算器 | Race Split Planner",
        updatedDate: "更新於 2026.10.07",
        subtitle: "自訂每公里配速，精準規劃你的完賽策略",
        targetDistance: "目標距離 (公里)",
        halfMarathon: "半馬 (21K)",
        fullMarathon: "全馬 (42K)",
        splitInterval: "分段間隔 (公里)",
        splitDesc: "依設定公里數劃分節點",
        unitInterval: "km/段",
        int1: "每 1 km",
        int2: "每 2 km",
        int25: "每 2.5 km",
        int5: "每 5 km",
        targetTime: "基準目標時間",
        baselineNote: "(圖表0%基準線)",
        unitHours: "時",
        unitMinutes: "分",
        unitSeconds: "秒",
        pacingStrategy: "配速策略",
        intensity: "變化幅度 (%)",
        evenOpt: "均速：全程使用相同跑動配速",
        conservativeOpt: (pct) => `保守起跑：前 20% 慢 ${pct}%，再由後段逐步追回`,
        negativeOpt: (pct) => `負分段：前 30% 慢 ${pct}%，後 30% 快 ${pct}%`,
        customOptChart: "自訂策略 (已由圖表修改)",
        customOptTable: "自訂策略 (已由圖表/表格修改)",
        generateBtn: "產生配速計畫表",
        chartTitle: "策略波形圖",
        chartDesc: "在圖表上拖曳節點，繪製專屬配速曲線",
        resetBtn: "重置",
        sumDist: "目標距離",
        sumTime: "預估完賽時間",
        sumPace: "實質平均配速",
        thSegment: "路段 (KM)",
        thPace: "該段配速",
        thPaceSub: "可直接輸入修改 (分:秒)",
        thSplitTime: "單段耗時",
        thCumTime: "累積時間",
        tooltipPace: "配速",
        segLabel: (idx) => `第 ${idx + 1} 段`,
        inputTooltip: "點擊可直接修改此段配速 (例如 5:30)",
        errDist: "請輸入大於 0 的有效距離！",
        errInterval: "請輸入大於 0 的有效分段間隔！",
        errTime: "請輸入有效的基準目標時間！",
        errPaceFormat: "請輸入有效的配速格式 (例如 5:30)",
        btnChecklist: "賽前準備清單",
        checklistTitle: "賽前裝備與準備清單",
        checklistDesc: "勾選狀態會自動儲存在此裝置中",
        btnClearChecklist: "清除全部",
        checklistConfirm: "確定要清除所有已勾選的項目嗎？"
    },
    en: {
        pageTitle: "Race Split Planner | Pacing Calculator",
        updatedDate: "Updated 2026.10.07",
        subtitle: "Customize splits per km to master your race strategy",
        targetDistance: "Target Distance (km)",
        halfMarathon: "Half (21.1K)",
        fullMarathon: "Full (42.2K)",
        splitInterval: "Split Interval (km)",
        splitDesc: "Segment distance for each node",
        unitInterval: "km/split",
        int1: "Every 1 km",
        int2: "Every 2 km",
        int25: "Every 2.5 km",
        int5: "Every 5 km",
        targetTime: "Baseline Target Time",
        baselineNote: "(Chart 0% baseline)",
        unitHours: "hr",
        unitMinutes: "min",
        unitSeconds: "sec",
        pacingStrategy: "Pacing Strategy",
        intensity: "Variation (%)",
        evenOpt: "Even Split: Maintain uniform pace throughout",
        conservativeOpt: (pct) => `Conservative: First 20% slower by ${pct}%, made up later`,
        negativeOpt: (pct) => `Negative Split: First 30% +${pct}%, last 30% -${pct}%`,
        customOptChart: "Custom (Adjusted via chart)",
        customOptTable: "Custom (Adjusted via chart/table)",
        generateBtn: "Generate Split Plan",
        chartTitle: "Pacing Waveform",
        chartDesc: "Drag points on chart to shape your pacing strategy",
        resetBtn: "Reset",
        sumDist: "TARGET DISTANCE",
        sumTime: "PROJECTED FINISH TIME",
        sumPace: "EFFECTIVE AVERAGE PACE",
        thSegment: "Segment (KM)",
        thPace: "Split Pace",
        thPaceSub: "Editable (min:sec)",
        thSplitTime: "Split Duration",
        thCumTime: "Cumulative Time",
        tooltipPace: "Pace",
        segLabel: (idx) => `Split ${idx + 1}`,
        inputTooltip: "Click to edit split pace (e.g. 5:30)",
        errDist: "Please enter a valid distance greater than 0!",
        errInterval: "Please enter a valid split interval greater than 0!",
        errTime: "Please enter a valid baseline target time!",
        errPaceFormat: "Please enter a valid pace format (e.g. 5:30)",
        btnChecklist: "Pre-Race Checklist",
        checklistTitle: "Pre-Race Gear Checklist",
        checklistDesc: "Progress is saved locally on your device.",
        btnClearChecklist: "Clear All",
        checklistConfirm: "Are you sure you want to clear all checked items?"
    }
};

// 宣告式語系切換函式 (Code Judo 遍歷所有 data-i18n 元素)
function setLanguage(lang) {
    currentLang = lang;
    const t = i18n[lang];

    const isZh = lang === 'zh';
    const activeClass = "px-2 py-0.5 rounded-md font-bold text-xs bg-white text-blue-600 shadow-xs transition-all";
    const inactiveClass = "px-2 py-0.5 rounded-md font-bold text-xs text-slate-500 hover:text-slate-800 transition-all";
    const btnZh = document.getElementById('lang-btn-zh');
    const btnEn = document.getElementById('lang-btn-en');
    if (btnZh && btnEn) {
        btnZh.className = isZh ? activeClass : inactiveClass;
        btnEn.className = isZh ? inactiveClass : activeClass;
    }

    document.title = t.pageTitle;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) {
            el.textContent = t[key];
        }
    });

    const checklistArea = document.getElementById('checklist-area');
    if (checklistArea && !checklistArea.classList.contains('hidden') && typeof renderChecklist === 'function') {
        renderChecklist();
    }
    if (typeof applyStrategy === 'function') {
        applyStrategy();
    }
}