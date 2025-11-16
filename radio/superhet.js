// グローバル変数
let audioContext = null;
let isReceiving = false;

// 信号源
let rfOscillator = null; 
let intOscillator = null; 
let rfGain = null;
let intGain = null;

// LO/BFO
let lo1Oscillator = null; // 第1局部発振器 (VFO)
let bfoOscillator = null; // ビート発振器

// ミキサーとフィルター
let mixer1Gain = null; // 第1ミキサー (RF -> IF)
let ifFilter = null; // IFフィルター (Bandpass)
let mixer2Gain = null; // 第2ミキサー (IF -> AF)
let afFilter = null; // AFフィルター (Lowpass)

let cwTimeout = null;
let morseQueue = []; 
let intTimeout = null;
let intMorseQueue = []; 

let cwCharIndex = 0; 
let intCharIndex = 0; 
let targetText = ""; 
let intTargetText = ""; 

// VFOダイヤル操作用変数 (DC方式と共通)
let isDragging = false;
let startY = 0;
let startOffset = 0;
let dialRotation = 0; 
let currentVfoOffset = 0;

// --- 定数 ---
const RF_SIM_FREQ = 200; 
const IF_FREQ = 455000;
const IF_SIM_FREQ = 20000; 
const IF_BANDWIDTH = 100; 
const AF_CUTOFF = 1000; 
const VFO_BASE_FREQ = 7000000;
const VFO_MIN_OFFSET = -10000; 
const VFO_MAX_OFFSET = 40000; 
const VFO_SENSITIVITY = 10; 
const VFO_WHEEL_SENSITIVITY = 10; 
const PIXELS_PER_HZ = 0.01; 
const INT_RF_OFFSET = 3000; 
const INT_SIM_FREQ = RF_SIM_FREQ + INT_RF_OFFSET; 
const WPM_DEFAULT = 20;
// const INT_WPM = 15; <--- 削除しました

// モールス符号辞書 (・=1, －=3)
const SPACE_CODE = 0; 
const MORSE_CODE_MAP = {
    // --- 欧文・数字・記号 (欧文モールス) ---
    'A': [1, 3], 'B': [3, 1, 1, 1], 'C': [3, 1, 3, 1], 'D': [3, 1, 1], 
    'E': [1], 'F': [1, 1, 3, 1], 'G': [3, 3, 1], 'H': [1, 1, 1, 1], 
    'I': [1, 1], 'J': [1, 3, 3, 3], 'K': [3, 1, 3], 'L': [1, 3, 1, 1], 
    'M': [3, 3], 'N': [3, 1], 'O': [3, 3, 3], 'P': [1, 3, 3, 1], 
    'Q': [3, 3, 1, 3], 'R': [1, 3, 1], 'S': [1, 1, 1], 'T': [3], 
    'U': [1, 1, 3], 'V': [1, 1, 1, 3], 'W': [1, 3, 3], 'X': [3, 1, 1, 3], 
    'Y': [3, 1, 3, 3], 'Z': [3, 3, 1, 1],
    '1': [1, 3, 3, 3, 3], '2': [1, 1, 3, 3, 3], '3': [1, 1, 1, 3, 3], 
    '4': [1, 1, 1, 1, 3], '5': [1, 1, 1, 1, 1], '6': [3, 1, 1, 1, 1], 
    '7': [3, 3, 1, 1, 1], '8': [3, 3, 3, 1, 1], '9': [3, 3, 3, 3, 1], 
    '0': [3, 3, 3, 3, 3],
    
    // 欧文モールスと同じ定義を流用するもの
    '.': [1, 3, 1, 3, 1, 3], 
    '/': [3, 1, 1, 3, 1], 
    
    // --- 和文 (カタカナ・和文モールス) ---
    'ア': [3, 3, 1, 3, 3], 'イ': [1, 3], 'ウ': [1, 1, 3], 
    'エ': [3, 1, 3, 3, 3], 'オ': [1, 3, 1, 1, 1],
    'カ': [1, 3, 1, 1], 'キ': [3, 1, 3, 1, 1], 'ク': [1, 1, 1, 3], 'ケ': [3, 1, 3, 3], 'コ': [3, 3, 3, 3],
    'サ': [3, 1, 3, 1, 3], 'シ': [3, 3, 1, 3, 1], 'ス': [3, 3, 3, 1, 3], 'セ': [1, 3, 3, 3, 1], 'ソ': [3, 3, 3, 1],
    'タ': [3, 1], 'チ': [1, 1, 3, 1], 'ツ': [1, 3, 3, 1], 'テ': [1, 3, 1, 3, 3], 'ト': [1, 1, 3, 1, 1],
    'ナ': [1, 3, 1], 'ニ': [3, 1, 3, 1], 'ヌ': [1, 1, 1, 1], 'ネ': [3, 3, 1, 3], 'ノ': [1, 1, 3, 3],
    'ハ': [3, 1, 1, 1], 
    'ヒ': [3, 3, 1, 1, 3], 
    'フ': [3, 3, 1, 1], 'ヘ': [1], 'ホ': [3, 1, 1],
    'マ': [3, 1, 1, 3], 'ミ': [1, 1, 3, 1, 3], 'ム': [3], 'メ': [3, 1, 1, 1, 3], 'モ': [3, 1, 1, 3, 1],
    'ヤ': [1, 3, 3], 'ユ': [3, 1, 1, 3, 3], 'ヨ': [3, 3],
    'ラ': [1, 1, 1], 'リ': [3, 3, 1], 'ル': [3, 1, 3, 3, 1], 'レ': [3, 3, 3], 'ロ': [1, 3, 1, 3],
    'ワ': [3, 1, 3], 'ヰ': [1, 3, 1, 1, 3], 'ヱ': [1, 3, 3, 1, 1], 'ヲ': [1, 3, 3, 3],
    'ン': [1, 3, 1, 3, 1],
    
    // 記号・特殊文字 (標準符号)
    'ー': [1, 3, 3, 1, 3], 	// 長音記号
    '〃': [1, 1], 	// 濁点記号
    '゜': [1, 1, 3, 3, 1], 	// 半濁点記号
    
    // ★★★ 区切点（クギリテン）のみを追加 ★★★
    '、': [1, 3, 1, 3, 1, 3], // 区切点 (クギリテン - 読点)
    
    // 特殊符号: 内部処理用にキーを「〇〇_SP」に変更 (ご要望の符号を維持)
    'ホレ_SP': [3, 1, 1, 3, 3, 3], 
    'ラタ_SP': [1, 1, 1, 3, 1], 	
    
    // 促音・拗音用のカナ (そのまま符号化しない)
    'ャ': [1, 3, 3], 'ュ': [3, 1, 1, 3, 3], 'ョ': [3, 3] 
};

// --- 和文変換マップの追加 (ひらがな、濁音、半濁点、拗音、促音の変換ルール) ---
const JAPANESE_CONVERSION_MAP = {
    // ひらがな/カタカナ -> カタカナ (清音)
    'ア': 'ア', 'イ': 'イ', 'ウ': 'ウ', 'エ': 'エ', 'オ': 'オ', 
    'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ', 
    'ぁ': 'ァ', 'ぃ': 'ィ', 'ぅ': 'ゥ', 'ぇ': 'ェ', 'ぉ': 'ォ', 
    'ァ': 'ァ', 'ィ': 'ィ', 'ゥ': 'ゥ', 'ェ': 'ェ', 'ォ': 'ォ', 

    'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
    'カ': 'カ', 'キ': 'キ', 'く': 'ク', 'ケ': 'ケ', 'コ': 'コ',
    'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
    'サ': 'サ', 'シ': 'シ', 'す': 'セ', 'セ': 'セ', 'ソ': 'ソ', 
    'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
    'タ': 'タ', 'チ': 'チ', 'ツ': 'ツ', 'テ': 'テ', 'ト': 'ト',
    'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
    'ナ': 'ナ', 'ニ': 'ニ', 'ヌ': 'ヌ', 'ネ': 'ネ', 'ノ': 'ノ',
    'は': 'ハ', 'ひ': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
    'ハ': 'ハ', 'ヒ': 'ヒ', 'フ': 'フ', 'ヘ': 'ヘ', 'ホ': 'ホ',
    'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
    'マ': 'マ', 'ミ': 'ミ', 'ム': 'ム', 'メ': 'メ', 'モ': 'モ',
    
    // 拗音・ヤ行
    'ゃ': 'ヤ', 'ゅ': 'ユ', 'ょ': 'ヨ', 'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
    'ヤ': 'ヤ', 'ユ': 'ユ', 'ヨ': 'ヨ',
    
    // ラ行・ワ行・ン
    'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
    'ラ': 'ラ', 'リ': 'リ', 'ル': 'ル', 'レ': 'レ', 'ロ': 'ロ',
    'わ': 'ワ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'を': 'ヲ', 'ん': 'ン', 'ー': 'ー',
    'ワ': 'ワ', 'ヰ': 'ヰ', 'ヱ': 'ヱ', 'ヲ': 'ヲ', 'ン': 'ン', 'ー': 'ー',
    
    'ゔ': 'ウ',
    
    // 濁音・半濁点 (清音 + 濁点/半濁点符号)
    'が': 'カ〃', 'ぎ': 'キ〃', 'ぐ': 'ク〃', 'げ': 'ケ〃', 'ご': 'コ〃',
    'ザ': 'サ〃', 'ジ': 'シ〃', 'ズ': 'ス〃', 'ゼ': 'セ〃', 'ゾ': 'ソ〃',
    'ざ': 'サ〃', 'じ': 'シ〃', 'ず': 'ス〃', 'ぜ': 'セ〃', 'ぞ': 'ソ〃',
    'だ': 'タ〃', 'ぢ': 'チ〃', 'づ': 'ツ〃', 'で': 'テ〃', 'ど': 'ト〃',
    'ば': 'ハ〃', 'び': 'ヒ〃', 'ぶ': 'フ〃', 'べ': 'ヘ〃', 'ぼ': 'ホ〃',
    'ぱ': 'ハ゜', 'ぴ': 'ヒ゜', 'ぷ': 'フ゜', 'ぺ': 'ヘ゜', 'ぽ': 'ホ゜',
    
    // カタカナ濁音
    'ガ': 'カ〃', 'ギ': 'キ〃', 'グ': 'ク〃', 'ゲ': 'ケ〃', 'ゴ': 'コ〃',
    'ザ': 'サ〃', 'ジ': 'シ〃', 'ズ': 'ス〃', 'ゼ': 'セ〃', 'ゾ': 'ソ〃',
    'ダ': 'タ〃', 'ヂ': 'チ〃', 'ヅ': 'ツ〃', 'デ': 'デ〃', 'ド': 'ド〃',
    'バ': 'ハ〃', 'ビ': 'ヒ〃', 'ブ': 'ブ〃', 'ベ': 'ベ〃', 'ボ': 'ボ〃',
    'パ': 'ハ゜', 'ピ': 'ヒ゜', 'プ': 'プ゜', 'ペ': 'ペ゜', 'ポ': 'ポ゜',

    // 拗音 (カナ + 拗音用カナ、例: キ + ヤ -> キャ)
    'キャ': 'キヤ', 'キュ': 'キユ', 'キョ': 'キヨ',
    'シャ': 'シヤ', 'シュ': 'シユ', 'ショ': 'シヨ',
    'チャ': 'チヤ', 'チュ': 'チユ', 'チョ': 'チヨ',
    'ニャ': 'ニヤ', 'ニュ': 'ニユ', 'ニョ': 'ニヨ',
    'ヒャ': 'ヒヤ', 'ヒュ': 'ヒユ', 'ヒョ': 'ヒヨ',
    'ミャ': 'ミヤ', 'ミュ': 'ミユ', 'ミョ': 'ミヨ',
    'リャ': 'リヤ', 'リュ': 'リユ', 'リョ': 'リョ',
    
    // 濁音の拗音
    'ギャ': 'ギヤ', 'ギュ': 'ギユ', 'ギョ': 'ギヨ',
    'ジャ': 'ジヤ', 'ジュ': 'ジユ', 'ジョ': 'ジヨ',
    'ヂャ': 'ヂヤ', 'ヂュ': 'ヂユ', 'ヂョ': 'ヂヨ',
    'ビャ': 'ビヤ', 'ビュ': 'ビユ', 'ビョ': 'ビヨ',
    
    // 半濁音の拗音
    'ピャ': 'ピヤ', 'ピュ': 'ピユ', 'ピョ': 'ピョ',
    
    // ★★★ 区切点（クギリテン）のみの変換 ★★★
    '、': '、', '。': '。', // 区切点(、)はそのまま、句点(。)は定義されないため、単一文字として残す
    
    // 促音
    'ッ': 'ツ', 'っ': 'ツ' 
};


// --- WPM/Morse/Display/Drag 関数 ---
function getUnitTimeMs() {
    const wpmElement = document.getElementById('wpmSlider');
    const wpm = wpmElement ? parseInt(wpmElement.value) : WPM_DEFAULT;
    return 1200 / wpm; 
}
function getIntUnitTimeMs() {
    // 修正: 干渉信号用WPMスライダーの値を取得
    const wpmElement = document.getElementById('intWpmSlider');
    const wpm = wpmElement ? parseInt(wpmElement.value) : WPM_DEFAULT; // スライダーがない場合はデフォルト値を使用
    return 1200 / wpm; 
}

function updateVfoDisplay() {
    const vfoHz = VFO_BASE_FREQ + currentVfoOffset; 
    const vfoDisplay = (vfoHz / 1000).toFixed(3); 
    
    document.getElementById('vfoDisplay').textContent = `${vfoDisplay} kHz`;

    const offsetDisplay = (currentVfoOffset / 1000).toFixed(1);
    document.getElementById('vfoTuneValue').textContent = `Offset: ${offsetDisplay} kHz`;

    const analogDisplay = document.getElementById('analogDisplay');
    if (analogDisplay) {
        const analogShift = -currentVfoOffset * PIXELS_PER_HZ; 
        analogDisplay.style.setProperty('--analog-shift', `${analogShift}px`);
    }
}

function updateDialRotation() {
    const totalRange = VFO_MAX_OFFSET - VFO_MIN_OFFSET;
    dialRotation = ((currentVfoOffset - VFO_MIN_OFFSET) / totalRange) * 3600; 
    
    const vfoDial = document.getElementById('vfoDial');
    vfoDial.style.transform = `rotate(${dialRotation}deg)`;
}


// LO1周波数更新 (Superhet方式の計算)
function updateLO1Frequency() {
    if (!isReceiving || !lo1Oscillator || !audioContext) return;

    const vfoAbsoluteFreq = VFO_BASE_FREQ + currentVfoOffset; 
    
    const lo1Frequency = (vfoAbsoluteFreq - VFO_BASE_FREQ) + RF_SIM_FREQ + IF_SIM_FREQ;
    
    lo1Oscillator.frequency.linearRampToValueAtTime(
        lo1Frequency, 
        audioContext.currentTime + 0.05
    );
}

// BFO周波数更新
function updateBFOFrequency() {
    if (!isReceiving || !bfoOscillator || !audioContext) return;

    const bfoToneValue = parseInt(document.getElementById('bfoFreq').value);
    
    const bfoFrequency = IF_SIM_FREQ + bfoToneValue;
    
    bfoOscillator.frequency.linearRampToValueAtTime(
        bfoFrequency, 
        audioContext.currentTime + 0.05
    );
}


function toggleCW(isOn) {
    if (!isReceiving || !rfGain) return;
    const statusIndicator = document.getElementById('cwStatus');
    const targetGain = isOn ? 2.0 : 0; 
    const now = audioContext.currentTime;
    rfGain.gain.setValueAtTime(rfGain.gain.value, now); 
    rfGain.gain.linearRampToValueAtTime(targetGain, now + 0.005);
    if (isOn) {
        statusIndicator.classList.add('cw-on');
    } else {
        statusIndicator.classList.remove('cw-on');
    }
}

function toggleIntCW(isOn) {
    if (!isReceiving || !intGain) return;
    const targetGain = isOn ? 3.0 : 0; 
    const now = audioContext.currentTime;
    intGain.gain.setValueAtTime(intGain.gain.value, now); 
    intGain.gain.linearRampToValueAtTime(targetGain, now + 0.005);
}

/**
 * 入力された和文/欧文テキストをモールス符号の配列 (queue) に変換
 * @param {string} text 
 * @param {boolean} [returnNormalizedText=false] 正規化されたテキストを返すかどうか
 * @returns {{queue: Array<number>, normalizedText: string}} 符号の配列と正規化済みテキスト
 */
function generateMorseQueue(text, returnNormalizedText = false) { 
    let cleanedText = text.trim();
    const newQueue = [];

    // --- STEP 1: 特殊符号の検出とトークン化 ---
    cleanedText = cleanedText
        .replace(/\*ほれ\*/gi, '[*HORE_TOKEN*]') 
        .replace(/\*らた\*/gi, '[*RATA_TOKEN*]') 
        .trim();

    // --- STEP 2: カナ変換と正規化 ---
    let normalizedText = '';
    for (let i = 0; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        
        const next15Chars = cleanedText.substring(i, i + 16); 
        if (next15Chars === '[*HORE_TOKEN*]' || next15Chars === '[*RATA_TOKEN*]') {
            normalizedText += next15Chars;
            i += 15; 
            continue;
        }

        const nextChar = cleanedText[i + 1] || ''; 
        
        const twoCharKey = char + nextChar;
        if (JAPANESE_CONVERSION_MAP[twoCharKey]) {
            normalizedText += JAPANESE_CONVERSION_MAP[twoCharKey];
            i++; 
        } 
        else if (JAPANESE_CONVERSION_MAP[char.toUpperCase()]) {
             normalizedText += JAPANESE_CONVERSION_MAP[char.toUpperCase()];
        } else if (char === ' ' || char === '　') {
             normalizedText += ' ';
        } else {
            normalizedText += char.toUpperCase();
        }
    }
    
    if (normalizedText.length === 0) return { queue: [], normalizedText: "" }; 

    const words = normalizedText.split(' ').filter(word => word.length > 0);

    // --- STEP 3: モールス符号に変換 ---
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        for (let j = 0; j < word.length; j++) {
            const char = word[j];
            let pattern = null;
            let tokenHandled = false; 
            
            if (word.substring(j, j + 16) === '[*HORE_TOKEN*]') {
                pattern = MORSE_CODE_MAP['ホレ_SP'];
                j += 15; 
                tokenHandled = true;
            } else if (word.substring(j, j + 16) === '[*RATA_TOKEN*]') {
                pattern = MORSE_CODE_MAP['ラタ_SP'];
                j += 15; 
                tokenHandled = true;
            } else {
                pattern = MORSE_CODE_MAP[char];
            }

            if (pattern) {
                
                for (let k = 0; k < pattern.length; k++) {
                    newQueue.push(pattern[k]); 
                    
                    if (k < pattern.length - 1) { 
                        newQueue.push(SPACE_CODE, 1); 
                    }
                }
                
                if (j < word.length) {
                    newQueue.push(SPACE_CODE, 3);
                } else if (!tokenHandled && j < word.length - 1) { 
                    newQueue.push(SPACE_CODE, 3);
                }
            } else {
                if (char !== '*') { 
                    // 句読点(。)など定義されていない文字は警告を出すか、スキップされる
                    console.warn(`Warning: Character "${char}" has no Morse code defined and will be skipped.`);
                }
            }
        }
        
        // 語間スペース (短点7つ分)
        if (i < words.length - 1) {
            newQueue.push(SPACE_CODE, 7);
        }
    }
    
    if (returnNormalizedText) {
        const finalNormalizedText = normalizedText
            .replace(/\[\*HORE\_TOKEN\*\]/gi, ' ')
            .replace(/\[\*RATA\_TOKEN\*\]/gi, ' ');
            
        return { queue: newQueue, normalizedText: finalNormalizedText };
    }
    return { queue: newQueue, normalizedText: '' };
}


function startMorseKeying() {
    if (!isReceiving || !audioContext) {
        if (cwTimeout) clearTimeout(cwTimeout);
        cwTimeout = null;
        return;
    }

    if (morseQueue.length === 0) {
        toggleCW(false);
        const waitTimeMs = 1000; 
        document.getElementById('morseQueueDisplay').textContent = `1秒間待機中... (リピート)`;
        
        cwTimeout = setTimeout(() => {
            const inputText = document.getElementById('textInput').value;
            const result = generateMorseQueue(inputText, true); 
            morseQueue = result.queue;
            targetText = result.normalizedText; 
            cwCharIndex = 0; 
            if (morseQueue.length === 0) {
                if (cwTimeout) clearTimeout(cwTimeout);
                cwTimeout = null;
                return;
            }
            startMorseKeying(); 
        }, waitTimeMs);
        return; 
    }

    const T = getUnitTimeMs(); 
    let codeElement = morseQueue.shift(); 
    
    let durationT;
    let isKeyOn;

    if (codeElement === SPACE_CODE) {
        durationT = morseQueue.shift(); 
        isKeyOn = false;
        
        if (durationT === 3 || durationT === 7) { 
            scrollTextarea(document.getElementById('textInput'), targetText, cwCharIndex, durationT); 
            cwCharIndex++; 
        }
        
    } else {
        durationT = codeElement; 
        isKeyOn = true;
    }
    
    toggleCW(isKeyOn);

    const durationMs = durationT * T;
    document.getElementById('morseQueueDisplay').textContent = morseQueue.length > 0 ? `残り ${morseQueue.length} ユニット` : 'リピート中...';
    
    cwTimeout = setTimeout(() => {
        startMorseKeying();
    }, durationMs);
}

function startIntMorseKeying() {
    if (!isReceiving || !audioContext) {
        if (intTimeout) clearTimeout(intTimeout);
        intTimeout = null;
        return;
    }

    if (intMorseQueue.length === 0) {
        const inputText = document.getElementById('intTextInput').value; 
        
        const isInitialStart = intTimeout === null;

        if (isInitialStart) {
            const result = generateMorseQueue(inputText, true); 
            intMorseQueue = result.queue;
            intTargetText = result.normalizedText; 
            intCharIndex = 0; 
            if (intMorseQueue.length === 0) return;
        } else {
            toggleIntCW(false);
            const waitTimeMs = 1000; 
            
            intTimeout = setTimeout(() => {
                const result = generateMorseQueue(inputText, true); 
                intMorseQueue = result.queue; 
                intTargetText = intResult.normalizedText; 
                intCharIndex = 0; 
                if (intMorseQueue.length === 0) {
                    if (intTimeout) clearTimeout(intTimeout);
                    intTimeout = null;
                    return;
                }
                startIntMorseKeying();
            }, waitTimeMs);
            return;
        }
    }

    const T = getIntUnitTimeMs(); // 修正された関数を使用
    let codeElement = intMorseQueue.shift(); 
    
    let durationT;
    let isKeyOn;

    if (codeElement === SPACE_CODE) {
        durationT = intMorseQueue.shift(); 
        isKeyOn = false;
        
        if (durationT === 3 || durationT === 7) { 
            scrollTextarea(document.getElementById('intTextInput'), intTargetText, intCharIndex, durationT); 
            intCharIndex++; 
        }
    } else {
        durationT = codeElement;
        isKeyOn = true;
    }
    
    toggleIntCW(isKeyOn);

    const durationMs = durationT * T;
    
    intTimeout = setTimeout(() => {
        startIntMorseKeying();
    }, durationMs);
}


function scrollTextarea(textarea, text, charIndex, durationT) {
    if (!textarea || !text) return;
    
    const scrollPerChar = 12; 
    const scrollTarget = (charIndex + 1) * scrollPerChar; 
    
    textarea.scrollLeft = scrollTarget;
    
    if (charIndex >= text.length - 1) {
        setTimeout(() => {
             textarea.scrollLeft = 0;
        }, 1000); 
    }
}


function stopReceiver() {
    if (audioContext && audioContext.state !== 'closed') {
        rfOscillator.stop();
        if (intOscillator) intOscillator.stop(); 
        lo1Oscillator.stop(); 
        bfoOscillator.stop(); 
        audioContext.close();
    }
    if (cwTimeout !== null) {
        clearTimeout(cwTimeout);
        cwTimeout = null;
    }
    if (intTimeout !== null) { 
        clearTimeout(intTimeout);
        intTimeout = null;
    }
    
    isReceiving = false;
    document.getElementById('startStopButton').textContent = '受信開始';
    document.getElementById('cwStatus').classList.remove('cw-on');
    document.getElementById('morseQueueDisplay').textContent = '---'; 

    const vfoDial = document.getElementById('vfoDial');
    if (vfoDial) vfoDial.style.transform = 'rotate(0deg)'; 
    currentVfoOffset = 0;
    updateVfoDisplay();
    
    cwCharIndex = 0;
    intCharIndex = 0;
    document.getElementById('textInput').scrollLeft = 0;
    document.getElementById('intTextInput').scrollLeft = 0;
}

function setupReceiver() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // HTMLからBFOの初期値を取得するように修正
    const bfoToneValue = parseInt(document.getElementById('bfoFreq').value || 700); 
    
    currentVfoOffset = 0; 
    updateVfoDisplay();
    updateDialRotation(); 
    
    cwCharIndex = 0;
    intCharIndex = 0;
    targetText = '';
    intTargetText = '';
    document.getElementById('textInput').scrollLeft = 0;
    document.getElementById('intTextInput').scrollLeft = 0;


    const initialVfoAbsoluteFreq = VFO_BASE_FREQ + currentVfoOffset;
    
    const initialLO1Frequency = (initialVfoAbsoluteFreq - VFO_BASE_FREQ) + RF_SIM_FREQ + IF_SIM_FREQ;
    
    const initialBFOFrequency = IF_SIM_FREQ + bfoToneValue;

    // --- 1. 信号源とゲイン ---
    rfOscillator = audioContext.createOscillator();
    rfOscillator.frequency.setValueAtTime(RF_SIM_FREQ, audioContext.currentTime);
    rfOscillator.start();
    
    rfGain = audioContext.createGain();
    rfGain.gain.setValueAtTime(0, audioContext.currentTime); 
    
    intOscillator = audioContext.createOscillator();
    intOscillator.frequency.setValueAtTime(INT_SIM_FREQ, audioContext.currentTime);
    intOscillator.start();

    intGain = audioContext.createGain();
    intGain.gain.setValueAtTime(0, audioContext.currentTime); 

    // --- 2. LO1 (VFO) とミキサー1 (RF -> IF) ---
    lo1Oscillator = audioContext.createOscillator();
    lo1Oscillator.frequency.setValueAtTime(initialLO1Frequency, audioContext.currentTime);
    lo1Oscillator.start();

    mixer1Gain = audioContext.createGain();
    mixer1Gain.gain.setValueAtTime(1.0, audioContext.currentTime); 
    
    rfOscillator.connect(rfGain);
    rfGain.connect(mixer1Gain);
    intOscillator.connect(intGain);
    intGain.connect(mixer1Gain);
    lo1Oscillator.connect(mixer1Gain.gain); 

    // --- 3. IFフィルター (Bandpass) ---
    ifFilter = audioContext.createBiquadFilter();
    ifFilter.type = 'bandpass';
    ifFilter.frequency.setValueAtTime(IF_SIM_FREQ, audioContext.currentTime); 
    ifFilter.Q.setValueAtTime(IF_SIM_FREQ / IF_BANDWIDTH, audioContext.currentTime); 
    
    mixer1Gain.connect(ifFilter);

    // --- 4. BFOとミキサー2 (IF -> AF) ---
    bfoOscillator = audioContext.createOscillator();
    bfoOscillator.frequency.setValueAtTime(initialBFOFrequency, audioContext.currentTime);
    bfoOscillator.start();
    
    mixer2Gain = audioContext.createGain();
    mixer2Gain.gain.setValueAtTime(1.0, audioContext.currentTime); 
    
    ifFilter.connect(mixer2Gain);
    bfoOscillator.connect(mixer2Gain.gain); 

    // --- 5. AFフィルター (Lowpass) ---
    afFilter = audioContext.createBiquadFilter();
    afFilter.type = 'lowpass';
    afFilter.frequency.setValueAtTime(AF_CUTOFF, audioContext.currentTime); 
    afFilter.Q.setValueAtTime(4.0, audioContext.currentTime); 
    
    mixer2Gain.connect(afFilter);
    afFilter.connect(audioContext.destination);
    
    isReceiving = true;
}


// --- VFOダイヤル操作ロジック ---
function startDrag(e) {
    if (e.button !== 0 && !e.touches) return; 
    if (!isReceiving) return; 
    isDragging = true;
    startY = e.clientY || e.touches[0].clientY;
    startOffset = currentVfoOffset; 
    document.getElementById('vfoDial').style.cursor = 'grabbing';
}

function duringDrag(e) {
    if (e.touches) e.preventDefault(); 
    if (!isDragging) return;
    
    const clientY = e.clientY || e.touches[0].clientY;
    const deltaY = startY - clientY; 
    
    let roughOffset = startOffset + deltaY * VFO_SENSITIVITY; 

    let newOffset = Math.round(roughOffset / 10) * 10;
    
    newOffset = Math.max(VFO_MIN_OFFSET, Math.min(VFO_MAX_OFFSET, newOffset));
    
    currentVfoOffset = newOffset;
    
    updateVfoDisplay(); 
    updateLO1Frequency(); 
    updateDialRotation(); 

    const analogShift = -currentVfoOffset * PIXELS_PER_HZ; 
    const analogDisplay = document.getElementById('analogDisplay');
    if (analogDisplay) {
        analogDisplay.style.setProperty('--analog-shift', `${analogShift}px`);
    }
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    document.getElementById('vfoDial').style.cursor = 'grab';
}

function handleWheel(e) {
    if (!isReceiving) return;
    
    e.preventDefault(); 

    const direction = e.deltaY > 0 ? -1 : 1; 
    
    let deltaOffset = direction * 10;
    
    let newOffset = currentVfoOffset + deltaOffset;
    
    newOffset = Math.round(newOffset / 10) * 10;

    newOffset = Math.max(VFO_MIN_OFFSET, Math.min(VFO_MAX_OFFSET, newOffset));
    
    currentVfoOffset = newOffset;
    
    updateVfoDisplay(); 
    updateLO1Frequency(); 
    updateDialRotation(); 

    const analogShift = -currentVfoOffset * PIXELS_PER_HZ; 
    const analogDisplay = document.getElementById('analogDisplay');
    if (analogDisplay) {
        analogDisplay.style.setProperty('--analog-shift', `${analogShift}px`);
    }
}


// --- イベントリスナー ---
document.addEventListener('DOMContentLoaded', () => {
    
    updateVfoDisplay(); 
    
    // 干渉信号用WPMスライダーが存在する場合、初期値を設定
    const intWpmSlider = document.getElementById('intWpmSlider');
    const intWpmValue = document.getElementById('intWpmValue');
    if (intWpmSlider) {
        // 初期値の表示
        intWpmValue.textContent = `${intWpmSlider.value} WPM`;
        
        // イベントリスナーの追加
        intWpmSlider.addEventListener('input', (event) => {
            const newIntWPM = parseInt(event.target.value);
            intWpmValue.textContent = `${newIntWPM} WPM`;
            
            // 受信中ならキーイングを再開してWPMを即座に反映させる
            if (isReceiving && intTimeout) {
                clearTimeout(intTimeout);
                intTimeout = null;
                // キーイングキューが空でない場合、空にする
                if (intMorseQueue.length > 0) {
                    const inputText = document.getElementById('intTextInput').value;
                    const result = generateMorseQueue(inputText, true); 
                    intMorseQueue = result.queue; // 新しいWPMを適用するためにキューを再生成する必要はないが、タイムアウトクリア後に再スタート
                }
                startIntMorseKeying();
            }
        });
    }

    document.getElementById('setMorseButton').addEventListener('click', () => {
        if (isReceiving) {
            if (cwTimeout) clearTimeout(cwTimeout);
            cwTimeout = null;
            morseQueue = []; 
            startMorseKeying(); 
        } else {
            const inputText = document.getElementById('textInput').value;
            const result = generateMorseQueue(inputText, true); 
            morseQueue = result.queue;
            document.getElementById('morseQueueDisplay').textContent = morseQueue.length > 0 ? `キュー生成完了: ${morseQueue.length} ユニット` : 'テキストが無効です';
        }
    });

    document.getElementById('startStopButton').addEventListener('click', () => {
        if (isReceiving) {
            stopReceiver();
        } else {
            setupReceiver(); 

            const startKeying = () => {
                const inputText = document.getElementById('textInput').value;
                const result = generateMorseQueue(inputText, true); 
                morseQueue = result.queue;
                targetText = result.normalizedText; 
                
                const intInputText = document.getElementById('intTextInput').value;
                const intResult = generateMorseQueue(intInputText, true); 
                intMorseQueue = intResult.queue;
                intTargetText = intResult.normalizedText; 

                startMorseKeying(); 
                startIntMorseKeying(); 
            };

            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    startKeying();
                }).catch(err => {
                    console.error("AudioContext resume failed:", err);
                    stopReceiver();
                });
            } else {
                startKeying();
            }
            document.getElementById('startStopButton').textContent = '受信停止';
        }
    });

    // ターゲット信号 WPM 制御
    document.getElementById('wpmSlider').addEventListener('input', (event) => {
        const newWPM = parseInt(event.target.value);
        document.getElementById('wpmValue').textContent = `${newWPM} WPM`;
        if (isReceiving && cwTimeout) {
            clearTimeout(cwTimeout);
            cwTimeout = null;
            startMorseKeying();
        }
    });
    
    document.getElementById('bfoFreq').addEventListener('input', (event) => {
        const newBFO = parseInt(event.target.value);
        document.getElementById('bfoValue').textContent = `${newBFO} Hz`;
        updateBFOFrequency();
    });

    const vfoDial = document.getElementById('vfoDial');
    vfoDial.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', duringDrag);
    document.addEventListener('mouseup', endDrag);
    
    vfoDial.addEventListener('wheel', handleWheel); 

    vfoDial.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startDrag(e);
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            duringDrag(e);
        }
    });

    document.addEventListener('touchend', endDrag);

    // --- VFOダイヤルのキーボード操作を追加 (ここから) ---
    document.addEventListener('keydown', (event) => {
        // 受信機が起動していない場合は何もしない
        if (!isReceiving || !lo1Oscillator) {
            return;
        }

        const step = 10; // 周波数変化のステップ（10 Hz）
        let newOffset = currentVfoOffset;

        if (event.key === 'ArrowRight') {
            // 右矢印キー: 周波数を上げる
            newOffset += step;
            event.preventDefault(); // 画面スクロール防止
        } else if (event.key === 'ArrowLeft') {
            // 左矢印キー: 周波数を下げる
            newOffset -= step;
            event.preventDefault(); // 画面スクロール防止
        }

        // 周波数オフセットを更新
        if (newOffset !== currentVfoOffset) {
            // 許容範囲内にクランプ
            newOffset = Math.max(VFO_MIN_OFFSET, Math.min(VFO_MAX_OFFSET, newOffset));
            
            currentVfoOffset = newOffset;
            
            // VFOの周波数を更新
            // LO1周波数 = RF_SIM_FREQ + IF_SIM_FREQ + currentVfoOffset
            const newFreq = RF_SIM_FREQ + IF_SIM_FREQ + currentVfoOffset;
            lo1Oscillator.frequency.setValueAtTime(newFreq, audioContext.currentTime);

            // VFOダイヤルの表示を更新（見た目）
            updateVfoDisplay();
            updateDialRotation(); // ダイヤル回転も更新

            // アナログ表示のシフトも更新
            const analogShift = -currentVfoOffset * PIXELS_PER_HZ;
            const analogDisplay = document.getElementById('analogDisplay');
            if (analogDisplay) {
                analogDisplay.style.setProperty('--analog-shift', `${analogShift}px`);
            }
        }
    });
    // --- VFOダイヤルのキーボード操作を追加 (ここまで) ---

});