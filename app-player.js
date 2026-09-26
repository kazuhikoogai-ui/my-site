const voiceSelectEn = document.getElementById('voice-select-en');
const voiceSelectJa = document.getElementById('voice-select-ja');
const rateSlider = document.getElementById('rate-slider');
const speedLabel = document.getElementById('speed-label');
const btnToggleAll = document.getElementById('btn-toggle-all');
const allBtnIcon = document.getElementById('all-btn-icon');
const allBtnText = document.getElementById('all-btn-text');
const allPlayStatus = document.getElementById('all-play-status');
const listContainer = document.getElementById('phrases-list');

let englishVoices = [];
let japaneseVoices = [];
let isAllPlaying = false;
let sequenceTimer = null;

// 前回停止位置を localStorage から復元（なければ 0）
let currentPlayingIndex = parseInt(localStorage.getItem('all_scenes_last_index') || '0', 10);
if (isNaN(currentPlayingIndex) || currentPlayingIndex < 0 || (typeof data !== 'undefined' && currentPlayingIndex >= data.length)) {
    currentPlayingIndex = 0;
}

// 初期表示時に前回停止位置があればボタン表示とステータスを更新
if (typeof data !== 'undefined' && currentPlayingIndex > 0) {
    allBtnText.textContent = `[${currentPlayingIndex + 1}問目から] 連続再生を再開`;
    allPlayStatus.textContent = `一時停止中: [${currentPlayingIndex + 1} / ${data.length}]`;
}

function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const allVoices = window.speechSynthesis.getVoices();
    englishVoices = allVoices.filter(v => v.lang.startsWith('en'));
    japaneseVoices = allVoices.filter(v => v.lang.startsWith('ja'));

    voiceSelectEn.innerHTML = '';
    englishVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        let hint = '';
        const name = voice.name.toLowerCase();
        if (name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('ava')) hint = ' [女性]';
        else if (name.includes('male') || name.includes('david') || name.includes('alex') || name.includes('george')) hint = ' [男性]';
        option.textContent = `${voice.name}${hint} (${voice.lang})`;
        voiceSelectEn.appendChild(option);
    });
    const defaultEn = englishVoices.findIndex(v => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Ava'));
    if (defaultEn !== -1) voiceSelectEn.selectedIndex = defaultEn;

    voiceSelectJa.innerHTML = '';
    japaneseVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        let hint = '';
        const name = voice.name.toLowerCase();
        if (name.includes('female') || name.includes('kyoko') || name.includes('haruka')) hint = ' [女性]';
        else if (name.includes('male') || name.includes('ichiro') || name.includes('otoya')) hint = ' [男性]';
        option.textContent = `${voice.name}${hint}`;
        voiceSelectJa.appendChild(option);
    });
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();
}

rateSlider.addEventListener('input', (e) => {
    speedLabel.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
});

function speak(text, lang = 'en', onEndCallback = null) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(rateSlider.value);

    if (lang === 'ja') {
        utterance.lang = 'ja-JP';
        const idx = voiceSelectJa.value;
        if (idx !== "" && japaneseVoices[idx]) utterance.voice = japaneseVoices[idx];
    } else {
        utterance.lang = 'en-US';
        const idx = voiceSelectEn.value;
        if (idx !== "" && englishVoices[idx]) utterance.voice = englishVoices[idx];
    }

    if (onEndCallback) {
        utterance.onend = onEndCallback;
        utterance.onerror = onEndCallback;
    }
    window.speechSynthesis.speak(utterance);
}

function clearHighlights() {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active-playing'));
}

function highlightCard(index) {
    clearHighlights();
    const card = document.getElementById(`card-${index}`);
    if (card) {
        card.classList.add('active-playing');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 連続再生の開始処理（指定インデックス、または現在位置から）
function startAllSequence(startIndex = currentPlayingIndex) {
    isAllPlaying = true;
    btnToggleAll.classList.add('playing');
    allBtnIcon.textContent = '⏸️';
    allBtnText.textContent = '連続再生を一時停止';
    playAllStep(startIndex);
}

// 一時停止処理（位置を保存して保持）
function pauseAllSequence(targetIndex = currentPlayingIndex) {
    isAllPlaying = false;
    currentPlayingIndex = targetIndex;
    try {
        localStorage.setItem('all_scenes_last_index', currentPlayingIndex);
    } catch (e) {
        console.warn('localStorage access failed:', e);
    }
    clearTimeout(sequenceTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    btnToggleAll.classList.remove('playing');
    allBtnIcon.textContent = '▶️';
    allBtnText.textContent = `[${currentPlayingIndex + 1}問目から] 連続再生を再開`;
    allPlayStatus.textContent = `一時停止中: [${currentPlayingIndex + 1} / ${data.length}]`;
}

// 全問再生完了時の初期化処理
function stopAllSequence() {
    isAllPlaying = false;
    currentPlayingIndex = 0;
    try {
        localStorage.removeItem('all_scenes_last_index');
    } catch (e) {
        console.warn('localStorage access failed:', e);
    }
    clearTimeout(sequenceTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    clearHighlights();
    btnToggleAll.classList.remove('playing');
    allBtnIcon.textContent = '▶️';
    allBtnText.textContent = '全セクションを最初から連続再生';
    allPlayStatus.textContent = '停止中';
}

function playAllStep(index) {
    if (!isAllPlaying) return;
    if (index >= data.length) {
        stopAllSequence();
        allPlayStatus.textContent = '🎉 全問の再生が完了しました';
        return;
    }

    currentPlayingIndex = index;
    try {
        localStorage.setItem('all_scenes_last_index', currentPlayingIndex);
    } catch (e) {
        console.warn('localStorage access failed:', e);
    }
    allPlayStatus.textContent = `再生中: [${index + 1} / ${data.length}]`;
    highlightCard(index);

    const item = data[index];
    const enArea = document.getElementById(`en-area-${index}`);
    const showBtn = document.getElementById(`btn-show-${index}`);

    speak(item.ja, 'ja', () => {
        if (!isAllPlaying) return;
        enArea.style.display = 'block';
        showBtn.style.display = 'none';

        sequenceTimer = setTimeout(() => {
            if (!isAllPlaying) return;
            speak(item.en, 'en', () => {
                if (!isAllPlaying) return;
                sequenceTimer = setTimeout(() => playAllStep(index + 1), 1500);
            });
        }, 500);
    });
}

// 連続再生ボタンのクリックイベント（再生中なら一時停止、停止中なら現在位置から再開）
btnToggleAll.addEventListener('click', () => {
    if (isAllPlaying) {
        pauseAllSequence();
    } else {
        startAllSequence(currentPlayingIndex);
    }
});

// 音声テストボタン（再生位置はリセットせず一時停止扱い）
document.getElementById('btn-test-en').addEventListener('click', () => {
    pauseAllSequence();
    speak("Hello! How can I help you today?", 'en');
});

document.getElementById('btn-test-ja').addEventListener('click', () => {
    pauseAllSequence();
    speak("こんにちは！良い旅を！", 'ja');
});

// カード描画
data.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${index}`;

    card.innerHTML = `
        <div class="card-header">
            <div class="context" id="context-${index}" title="クリックしてここから再生/一時停止">[${item.id}] ${item.context}</div>
            <div>
                <span class="playing-badge">● 再生中</span>
                <button class="btn-autoplay" id="btn-chain-${index}">▶ 日➔英</button>
            </div>
        </div>
        <div class="japanese-row">
            <span class="japanese">「${item.ja}」</span>
            <button class="btn-mini-sound" id="btn-sound-ja-${index}">🔊 日本語</button>
        </div>
        <button class="btn-show" id="btn-show-${index}">💬 英語を表示して聴く</button>
        <div class="english-area" id="en-area-${index}">
            <div class="english">${item.en}</div>
            <button class="btn-replay" id="btn-replay-en-${index}">英語をもう一度 🔄</button>
        </div>
    `;

    listContainer.appendChild(card);

    const contextEl = card.querySelector(`#context-${index}`);
    const showBtn = card.querySelector(`#btn-show-${index}`);
    const enArea = card.querySelector(`#en-area-${index}`);
    const soundJaBtn = card.querySelector(`#btn-sound-ja-${index}`);
    const replayEnBtn = card.querySelector(`#btn-replay-en-${index}`);
    const chainBtn = card.querySelector(`#btn-chain-${index}`);

    // 見出しタイトルをクリックして再生/一時停止
    contextEl.addEventListener('click', () => {
        if (isAllPlaying) {
            pauseAllSequence(index);
            highlightCard(index);
        } else {
            startAllSequence(index);
        }
    });

    // 個別ボタン押下時も停止位置をそのカード番号に保持（stopAllSequenceではなくpauseAllSequenceを使用）
    soundJaBtn.addEventListener('click', () => {
        pauseAllSequence(index);
        highlightCard(index);
        speak(item.ja, 'ja', clearHighlights);
    });

    showBtn.addEventListener('click', () => {
        pauseAllSequence(index);
        highlightCard(index);
        enArea.style.display = 'block';
        showBtn.style.display = 'none';
        speak(item.en, 'en', clearHighlights);
    });

    replayEnBtn.addEventListener('click', () => {
        pauseAllSequence(index);
        highlightCard(index);
        speak(item.en, 'en', clearHighlights);
    });

    chainBtn.addEventListener('click', () => {
        pauseAllSequence(index);
        highlightCard(index);
        enArea.style.display = 'block';
        showBtn.style.display = 'none';
        speak(item.ja, 'ja', () => {
            setTimeout(() => speak(item.en, 'en', clearHighlights), 400);
        });
    });
});