/**
 * Race Split Planner - 配速計算引擎、SVG 波形圖與賽前清單核心邏輯
 */

// 距離預設常數對照表（Model the Domain）
const DISTANCE_PRESETS = {
    5: { h: 0, m: 30, s: 0 },
    10: { h: 1, m: 0, s: 0 },
    21.0975: { h: 2, m: 0, s: 0 },
    42.195: { h: 4, m: 0, s: 0 }
};

// 核心狀態管理
let paceVariations = []; 
let isDragging = false;
let activePointIndex = -1;
let lockedPointIndex = -1; 
const MAX_VARIATION = 50;

// --- 輔助設定與計算函數 ---
function setDistance(val) {
    document.getElementById('distance').value = val;
    const preset = DISTANCE_PRESETS[val];
    if (preset) {
        setTime(preset.h, preset.m, preset.s);
    }
    updateBoardIfVisible();
}

function setIntervalVal(val) {
    document.getElementById('split-interval').value = val;
    updateBoardIfVisible();
}

function setTime(h, m, s) {
    document.getElementById('hours').value = h;
    document.getElementById('minutes').value = m;
    document.getElementById('seconds').value = s;
}

function getSegmentsInfo() {
    const distance = parseFloat(document.getElementById('distance').value);
    let interval = parseFloat(document.getElementById('split-interval').value);
    if (isNaN(interval) || interval <= 0) interval = 1;
    
    const segments = [];
    let covered = 0;
    while (covered < distance) {
        const remaining = distance - covered;
        const segDist = Math.min(interval, remaining);
        const startKm = covered;
        const endKm = covered + segDist;
        segments.push({ startKm, endKm, dist: segDist });
        covered += segDist;
    }
    return { distance, interval, segments };
}

function updateBoardIfVisible() {
    const resultsArea = document.getElementById('results-area');
    if (resultsArea && !resultsArea.classList.contains('hidden')) {
        initCustomBoard();
    }
}

function showError(message) {
    const errorBox = document.getElementById('error-message');
    document.getElementById('error-text').innerText = message;
    errorBox.classList.remove('hidden');
    setTimeout(() => { errorBox.classList.add('hidden'); }, 4000);
}

function formatTime(totalSeconds) {
    totalSeconds = Math.round(totalSeconds); 
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    let timeStr = "";
    if (h > 0) timeStr += h + ":";
    timeStr += (m < 10 && h > 0 ? "0" : "") + m + ":";
    timeStr += (s < 10 ? "0" : "") + s;
    return timeStr;
}

function formatPace(totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function parsePaceInput(inputStr) {
    if (!inputStr) return null;
    const s = String(inputStr).trim().replace(/：/g, ':');
    if (s.includes(':')) {
        const parts = s.split(':');
        const min = parseInt(parts[0], 10) || 0;
        const sec = parseInt(parts[1], 10) || 0;
        return (min * 60) + sec;
    }
    const num = parseFloat(s);
    if (!isNaN(num)) {
        if (num >= 100) {
            const min = Math.floor(num / 100);
            const sec = Math.round(num % 100);
            return (min * 60) + sec;
        }
        return Math.round(num * 60);
    }
    return null;
}

function handlePaceInputChange(index, value) {
    const t = i18n[currentLang];
    const newPaceSec = parsePaceInput(value);
    const distance = parseFloat(document.getElementById('distance').value);
    const h = parseInt(document.getElementById('hours').value) || 0;
    const m = parseInt(document.getElementById('minutes').value) || 0;
    const s = parseInt(document.getElementById('seconds').value) || 0;
    const baselineTotalSeconds = (h * 3600) + (m * 60) + s;
    
    if (isNaN(distance) || distance <= 0 || baselineTotalSeconds <= 0) return;
    
    const baselinePaceSec = baselineTotalSeconds / distance;
    
    if (!newPaceSec || newPaceSec <= 0) {
        showError(t.errPaceFormat);
        calculateSplits();
        return;
    }
    
    let val = ((newPaceSec / baselinePaceSec) - 1) * 100;
    val = Math.max(-MAX_VARIATION, Math.min(MAX_VARIATION, Math.round(val)));
    
    paceVariations[index] = val;
    
    const strategySelect = document.getElementById('strategy');
    let customOption = strategySelect.querySelector('option[value="custom"]');
    if (!customOption) {
        customOption = document.createElement('option');
        customOption.value = "custom";
        customOption.text = t.customOptTable;
        customOption.hidden = true;
        strategySelect.appendChild(customOption);
    } else {
        customOption.text = t.customOptTable;
    }
    strategySelect.value = "custom";
    
    renderWaveform();
    calculateSplits();
}

// --- 策略與波形圖核心邏輯 ---
function applyStrategy() {
    const t = i18n[currentLang];
    const strategySelect = document.getElementById('strategy');
    const strategy = strategySelect.value;
    const intensity = parseFloat(document.getElementById('strategy-intensity').value) || 2;
    
    const evenOpt = strategySelect.querySelector('option[value="even"]');
    const conservativeOpt = strategySelect.querySelector('option[value="conservative"]');
    const negativeOpt = strategySelect.querySelector('option[value="negative"]');
    const customOpt = strategySelect.querySelector('option[value="custom"]');

    if (evenOpt) evenOpt.innerText = t.evenOpt;
    if (conservativeOpt) conservativeOpt.innerText = t.conservativeOpt(intensity);
    if (negativeOpt) negativeOpt.innerText = t.negativeOpt(intensity);
    if (customOpt) customOpt.innerText = t.customOptChart;

    if (document.getElementById('results-area').classList.contains('hidden')) return;

    const { distance, segments } = getSegmentsInfo();
    const totalSegments = segments.length;
    if (isNaN(distance) || distance <= 0 || totalSegments === 0) return;

    if (paceVariations.length !== totalSegments) {
        paceVariations = new Array(totalSegments).fill(0);
    }
    if (strategy === 'custom') return;

    paceVariations = paceVariations.map(() => 0);

    if (strategy === 'conservative') {
        const slowSegmentsCount = Math.floor(totalSegments * 0.2) || 1;
        for (let i = 0; i < slowSegmentsCount; i++) paceVariations[i] = intensity;
        const remainingSegments = totalSegments - slowSegmentsCount;
        if (remainingSegments > 0) {
            const totalCompensation = slowSegmentsCount * -intensity;
            const compPerSegment = totalCompensation / remainingSegments;
            for (let i = slowSegmentsCount; i < totalSegments; i++) paceVariations[i] = compPerSegment;
        }
    } else if (strategy === 'negative') {
        const phaseCount = Math.floor(totalSegments * 0.3) || 1;
        for (let i = 0; i < phaseCount; i++) paceVariations[i] = intensity;
        for (let i = totalSegments - phaseCount; i < totalSegments; i++) paceVariations[i] = -intensity;
    }

    renderWaveform();
    calculateSplits();
}

function resetWaveform() {
    paceVariations = paceVariations.map(() => 0);
    renderWaveform();
    calculateSplits();
}

function initCustomBoard() {
    const t = i18n[currentLang];
    const distance = parseFloat(document.getElementById('distance').value);
    const interval = parseFloat(document.getElementById('split-interval').value);
    const h = parseInt(document.getElementById('hours').value) || 0;
    const m = parseInt(document.getElementById('minutes').value) || 0;
    const s = parseInt(document.getElementById('seconds').value) || 0;
    const totalSeconds = (h * 3600) + (m * 60) + s;

    if (isNaN(distance) || distance <= 0) { showError(t.errDist); return; }
    if (isNaN(interval) || interval <= 0) { showError(t.errInterval); return; }
    if (totalSeconds <= 0) { showError(t.errTime); return; }

    const { segments } = getSegmentsInfo();
    const totalSegments = segments.length;
    
    if (paceVariations.length !== totalSegments) {
        paceVariations = new Array(totalSegments).fill(0);
        const strategySelect = document.getElementById('strategy');
        if (strategySelect.value === 'custom') strategySelect.value = 'even';
    }

    const resultsArea = document.getElementById('results-area');
    resultsArea.classList.remove('hidden');
    void resultsArea.offsetWidth;
    resultsArea.classList.add('grid', 'opacity-100');
    setTimeout(() => { resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);

    initWaveformEvents();
    applyStrategy(); 
}

function initWaveformEvents() {
    const container = document.getElementById('waveform-container');
    if (container.dataset.initialized) return;

    const getRelativeCoordinates = (e) => {
        const svgElement = container.querySelector('svg');
        const rect = svgElement ? svgElement.getBoundingClientRect() : container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top, width: rect.width, height: rect.height };
    };

    const updatePoint = (e, isStart = false) => {
        const pos = getRelativeCoordinates(e);
        const svgW = 800, svgH = 280, pt = 40, pb = 40, pl = 24, pr = 24;
        const svgX = (pos.x / pos.width) * svgW;
        const svgY = (pos.y / pos.height) * svgH;
        const segments = paceVariations.length;
        let index;

        if (isStart) {
            const buffer = 15;
            if (svgX < pl - buffer || svgX > (svgW - pr) + buffer || 
                svgY < pt - buffer || svgY > (svgH - pb) + buffer) {
                return false; 
            }

            const usableSvgWidth = svgW - pl - pr;
            let percentX = usableSvgWidth > 0 ? (svgX - pl) / usableSvgWidth : 0;
            percentX = Math.max(0, Math.min(1, percentX));
            
            index = Math.round(percentX * (segments - 1));
            if (segments === 1) index = 0;
            lockedPointIndex = index;
        } else {
            index = lockedPointIndex;
            if (index === -1) return false;
        }
        
        const usableSvgHeight = svgH - pt - pb;
        const centerY = pt + (usableSvgHeight / 2);
        
        const rawVal = ((svgY - centerY) / (usableSvgHeight / 2)) * MAX_VARIATION;
        let val = Math.round(rawVal);
        val = Math.max(-MAX_VARIATION, Math.min(MAX_VARIATION, val));
        
        activePointIndex = index;
        paceVariations[index] = val;
        
        const strategySelect = document.getElementById('strategy');
        const t = i18n[currentLang];
        let customOption = strategySelect.querySelector('option[value="custom"]');
        if (!customOption) {
            customOption = document.createElement('option');
            customOption.value = "custom";
            customOption.text = t.customOptChart;
            customOption.hidden = true;
            strategySelect.appendChild(customOption);
        } else {
            customOption.text = t.customOptChart;
        }
        strategySelect.value = "custom";
        
        renderWaveform();
        calculateSplits();
        
        const distance = parseFloat(document.getElementById('distance').value);
        const h = parseInt(document.getElementById('hours').value) || 0;
        const m = parseInt(document.getElementById('minutes').value) || 0;
        const s = parseInt(document.getElementById('seconds').value) || 0;
        const totalSeconds = (h * 3600) + (m * 60) + s;
        const baselinePaceSec = totalSeconds / distance;
        const actualPaceSec = baselinePaceSec * (1 + (val / 100));
        
        showTooltip(index, actualPaceSec, val);
        return true;
    };

    const handleStart = (e) => {
        if (updatePoint(e, true)) {
            isDragging = true;
            if (e.cancelable) e.preventDefault(); 
        }
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        updatePoint(e, false); 
        if (e.cancelable) e.preventDefault();
    };

    const handleEnd = () => {
        isDragging = false;
        activePointIndex = -1;
        lockedPointIndex = -1; 
        renderWaveform(); 
        hideTooltip();
    };

    container.addEventListener('mousedown', handleStart);
    container.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    container.dataset.initialized = 'true';
}

function showTooltip(index, actualPaceSec, val) {
    const tooltip = document.getElementById('active-node-info');
    const kmLabel = document.getElementById('node-km');
    const valLabel = document.getElementById('node-val');
    const t = i18n[currentLang];
    
    const { segments } = getSegmentsInfo();
    const seg = segments[index];
    let distLabel = t.segLabel(index);
    if (seg) {
        distLabel = `${seg.startKm.toFixed(seg.startKm % 1 === 0 ? 0 : 2)} ~ ${seg.endKm.toFixed(seg.endKm % 1 === 0 ? 0 : 2)} km`;
    }
                    
    kmLabel.innerText = distLabel;
    valLabel.innerText = `${t.tooltipPace} ${formatPace(actualPaceSec)}`;
    
    if (val < 0) {
        valLabel.className = 'text-emerald-400 font-mono tracking-tight';
    } else if (val > 0) {
        valLabel.className = 'text-rose-400 font-mono tracking-tight';
    } else {
        valLabel.className = 'text-slate-300 font-mono tracking-tight';
    }
    
    tooltip.style.opacity = '1';
}

function hideTooltip() {
    document.getElementById('active-node-info').style.opacity = '0';
}

function renderWaveform() {
    const container = document.getElementById('waveform-container');
    if (!container) return;
    
    const svgW = 800, svgH = 280;
    const pt = 40, pb = 40, pl = 24, pr = 24; 
    const segments = paceVariations.length;
    
    const getX = (i) => pl + (segments > 1 ? (i / (segments - 1)) * (svgW - pl - pr) : (svgW - pl - pr) / 2);
    const getY = (val) => pt + ((val + MAX_VARIATION) / (MAX_VARIATION * 2)) * (svgH - pt - pb);

    const points = [];
    let pointsHtml = '';
    for (let i = 0; i < segments; i++) {
        const x = getX(i);
        const y = getY(paceVariations[i]);
        points.push({ x, y });
        
        const isActive = i === activePointIndex;
        const r = isActive ? 12 : 7;
        const fill = isActive ? '#3b82f6' : '#ffffff';
        const strokeWidth = isActive ? 4 : 3;
        const shadow = isActive ? `<circle cx="${x}" cy="${y}" r="20" fill="#3b82f6" opacity="0.2"/>` : '';
        
        pointsHtml += `
            ${shadow}
            <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#3b82f6" stroke-width="${strokeWidth}" style="transition: all 0.1s ease-out;"/>
        `;
    }

    let linePath = '';
    if (points.length > 0) {
        linePath += `M ${points[0].x} ${points[0].y}`;
        const smoothing = 0.2; 
        
        const getControlPoint = (current, previous, next, reverse) => {
            const p = previous || current;
            const n = next || current;
            const lengthX = n.x - p.x;
            let lengthY = n.y - p.y;
            
            const slope1 = current.y - p.y;
            const slope2 = n.y - current.y;
            if (slope1 * slope2 <= 0) lengthY = 0; 

            const angle = Math.atan2(lengthY, lengthX) + (reverse ? Math.PI : 0);
            const length = Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)) * smoothing;
            return {
                x: current.x + Math.cos(angle) * length,
                y: current.y + Math.sin(angle) * length
            };
        };

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            const cps = getControlPoint(points[i - 1], points[i - 2], point, false); 
            const cpe = getControlPoint(point, points[i - 1], points[i + 1], true);  
            linePath += ` C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
        }
    }

    let areaPath = linePath;
    if (segments > 0) {
        areaPath += ` L ${getX(segments - 1)} ${svgH - pb + 20} L ${getX(0)} ${svgH - pb + 20} Z`;
    }

    const y0 = getY(-MAX_VARIATION);
    const y15_f = getY(-MAX_VARIATION / 2);
    const yCenter = getY(0);
    const y15_s = getY(MAX_VARIATION / 2);
    const yMax = getY(MAX_VARIATION);

    container.innerHTML = `
        <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-full overflow-visible drop-shadow-sm" preserveAspectRatio="none">
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
                </linearGradient>
            </defs>

            <line x1="${pl}" y1="${y0}" x2="${svgW-pr}" y2="${y0}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 6" />
            <line x1="${pl}" y1="${y15_f}" x2="${svgW-pr}" y2="${y15_f}" stroke="#f1f5f9" stroke-width="1" />
            <line x1="${pl}" y1="${yCenter}" x2="${svgW-pr}" y2="${yCenter}" stroke="#94a3b8" stroke-width="2" />
            <line x1="${pl}" y1="${y15_s}" x2="${svgW-pr}" y2="${y15_s}" stroke="#f1f5f9" stroke-width="1" />
            <line x1="${pl}" y1="${yMax}" x2="${svgW-pr}" y2="${yMax}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 6" />
            
            <path d="${areaPath}" fill="url(#areaGradient)" />
            <path d="${linePath}" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
            
            ${pointsHtml}
        </svg>
    `;
}

function calculateSplits() {
    const distance = parseFloat(document.getElementById('distance').value);
    const h = parseInt(document.getElementById('hours').value) || 0;
    const m = parseInt(document.getElementById('minutes').value) || 0;
    const s = parseInt(document.getElementById('seconds').value) || 0;
    
    const baselineTotalSeconds = (h * 3600) + (m * 60) + s;
    const { segments } = getSegmentsInfo();
    const totalSegments = segments.length;
    
    const baselinePaceSec = baselineTotalSeconds / distance;
    
    const yAxisFast = document.getElementById('y-axis-fast');
    const yAxisEven = document.getElementById('y-axis-even');
    const yAxisSlow = document.getElementById('y-axis-slow');
    if (yAxisFast && yAxisEven && yAxisSlow) {
        const fastPaceSec = baselinePaceSec * (1 - (MAX_VARIATION / 100));
        const slowPaceSec = baselinePaceSec * (1 + (MAX_VARIATION / 100));
        yAxisFast.innerHTML = `<i class="fa-solid fa-rabbit mb-1"></i>${formatPace(fastPaceSec)}`;
        yAxisEven.innerHTML = `<span class="bg-slate-50/80 px-1 rounded">${formatPace(baselinePaceSec)}</span>`;
        yAxisSlow.innerHTML = `${formatPace(slowPaceSec)}<i class="fa-solid fa-turtle mt-1"></i>`;
    }

    let calculatedTotalSeconds = 0;
    const segmentsData = [];

    for (let i = 0; i < totalSegments; i++) {
        const sliderValue = paceVariations[i] || 0; 
        const segmentDist = segments[i].dist;
        const paceForThisSegment = baselinePaceSec * (1 + (sliderValue / 100));
        const segmentTime = paceForThisSegment * segmentDist;
        
        calculatedTotalSeconds += segmentTime;
        segmentsData.push({
            startKm: segments[i].startKm,
            endKm: segments[i].endKm,
            dist: segmentDist,
            pace: paceForThisSegment,
            time: segmentTime
        });
    }

    const calculatedAvgPaceSec = calculatedTotalSeconds / distance;
    document.getElementById('summary-distance').innerText = `${distance.toFixed(2)} km`;
    
    const timeEl = document.getElementById('summary-time');
    const paceEl = document.getElementById('summary-pace');
    timeEl.innerText = formatTime(calculatedTotalSeconds);
    paceEl.innerText = `${formatPace(calculatedAvgPaceSec)}`;
    
    if (calculatedTotalSeconds < baselineTotalSeconds - 10) {
        timeEl.className = "text-lg sm:text-3xl font-black text-emerald-400 font-mono tracking-tight transition-colors duration-300";
        paceEl.className = "text-lg sm:text-3xl font-black text-emerald-400 font-mono tracking-tight transition-colors duration-300";
    } else if (calculatedTotalSeconds > baselineTotalSeconds + 10) {
        timeEl.className = "text-lg sm:text-3xl font-black text-rose-400 font-mono tracking-tight transition-colors duration-300";
        paceEl.className = "text-lg sm:text-3xl font-black text-rose-400 font-mono tracking-tight transition-colors duration-300";
    } else {
        timeEl.className = "text-lg sm:text-3xl font-black text-blue-400 font-mono tracking-tight transition-colors duration-300";
        paceEl.className = "text-lg sm:text-3xl font-black text-blue-400 font-mono tracking-tight transition-colors duration-300";
    }

    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    let cumulativeTime = 0;
    const t = i18n[currentLang];

    for (let i = 0; i < segmentsData.length; i++) {
        const segmentTime = segmentsData[i].time;
        const paceForThisSegment = segmentsData[i].pace;
        cumulativeTime += segmentTime;

        const startFormatted = segmentsData[i].startKm.toFixed(segmentsData[i].startKm % 1 === 0 ? 0 : 2);
        const endFormatted = segmentsData[i].endKm.toFixed(segmentsData[i].endKm % 1 === 0 ? 0 : 2);
        const rowLabel = `${startFormatted} ~ ${endFormatted}`;

        let paceColorClass = "text-slate-700 font-semibold";
        let paceBg = "";
        if (paceForThisSegment < baselinePaceSec - 1) { 
            paceColorClass = "text-emerald-600 font-bold"; 
            paceBg = "bg-emerald-50/50";
        }
        if (paceForThisSegment > baselinePaceSec + 1) {
            paceColorClass = "text-rose-600 font-bold";
            paceBg = "bg-rose-50/50";
        }
        
        if (i === activePointIndex) paceBg = "bg-blue-100/50 ring-inset ring-2 ring-blue-500/20";

        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${paceBg}`;
        tr.innerHTML = `
            <td class="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-slate-500 font-mono">
                <span class="text-xs text-slate-400 mr-1">km</span>${rowLabel}
            </td>
            <td class="px-6 py-2 whitespace-nowrap text-center">
                <input type="text"
                       value="${formatPace(paceForThisSegment)}"
                       onchange="handlePaceInputChange(${i}, this.value)"
                       class="w-20 text-center font-mono font-bold text-base ${paceColorClass} bg-slate-50/80 hover:bg-white focus:bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-slate-200 rounded-lg py-1 px-1 transition-all outline-none shadow-sm cursor-text"
                       title="${t.inputTooltip}">
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-center text-sm text-slate-500 font-mono">
                ${formatTime(segmentTime)}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-right font-bold text-slate-800 font-mono">
                ${formatTime(cumulativeTime)}
            </td>
        `;
        tableBody.appendChild(tr);
    }
}

// --- 賽前清單核心邏輯 (邊界防護與效能分離) ---
function toggleChecklist() {
    const area = document.getElementById('checklist-area');
    if (area.classList.contains('hidden')) {
        area.classList.remove('hidden');
        renderChecklist();
        setTimeout(() => { area.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    } else {
        area.classList.add('hidden');
    }
}

function getSafeChecklistData() {
    try {
        const raw = localStorage.getItem('racePlannerChecklist');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Checklist storage corrupted, fallback to empty object.');
        return {};
    }
}

function updateChecklistProgress() {
    const savedData = getSafeChecklistData();
    let total = 0;
    let checkedCount = 0;

    checklistCategories.forEach(cat => {
        checklistItems[cat.id].forEach(item => {
            total++;
            if (savedData[item.id]) checkedCount++;
        });
    });

    const pct = total === 0 ? 0 : Math.round((checkedCount / total) * 100);
    const textEl = document.getElementById('checklist-progress-text');
    const barEl = document.getElementById('checklist-progress-bar');
    if (textEl) textEl.textContent = `${checkedCount}/${total}`;
    if (barEl) barEl.style.width = `${pct}%`;
}

function renderChecklist() {
    const container = document.getElementById('checklist-container');
    container.innerHTML = '';
    const savedData = getSafeChecklistData();

    checklistCategories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:border-emerald-100 transition-colors';
        
        const title = document.createElement('h4');
        title.className = 'font-bold text-slate-700 mb-3 text-sm border-b border-slate-200 pb-2';
        title.innerText = cat[currentLang];
        catDiv.appendChild(title);

        const list = document.createElement('div');
        list.className = 'space-y-2.5';

        checklistItems[cat.id].forEach(item => {
            const isChecked = Boolean(savedData[item.id]);

            const label = document.createElement('label');
            label.className = 'flex items-center gap-3 cursor-pointer group';
            label.innerHTML = `
                <div class="relative flex items-center justify-center w-5 h-5">
                    <input type="checkbox" id="chk-${item.id}" ${isChecked ? 'checked' : ''} 
                        onchange="updateChecklistStatus('${item.id}', this.checked)"
                        class="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-emerald-500 checked:border-emerald-500 transition-all bg-white">
                    <i class="fa-solid fa-check text-white text-[10px] absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                </div>
                <span class="text-sm font-medium text-slate-600 group-hover:text-slate-900 peer-checked:text-slate-400 peer-checked:line-through transition-all select-none">
                    ${item[currentLang]}
                </span>
            `;
            list.appendChild(label);
        });
        catDiv.appendChild(list);
        container.appendChild(catDiv);
    });

    updateChecklistProgress();
}

function updateChecklistStatus(id, isChecked) {
    const savedData = getSafeChecklistData();
    savedData[id] = isChecked;
    localStorage.setItem('racePlannerChecklist', JSON.stringify(savedData));
    updateChecklistProgress();
}

function clearChecklist() {
    const t = i18n[currentLang];
    if (confirm(t.checklistConfirm)) {
        localStorage.removeItem('racePlannerChecklist');
        renderChecklist();
    }
}