const defaults = [
  { id: 'neutral', label: 'neutral', src: '/assets/mood-neutral.png' },
  { id: 'happy', label: 'happy', src: '/assets/mood-happy.png' },
  { id: 'joy', label: 'joy', src: '/assets/mood-joy.png' },
  { id: 'calm', label: 'calm', src: '/assets/mood-calm.png' },
  { id: 'surprised', label: 'surprised', src: '/assets/mood-surprised.png' },
  { id: 'mischievous', label: 'mischievous', src: '/assets/mood-mischievous.png' },
  { id: 'cool', label: 'cool', src: '/assets/mood-cool.png' },
];

const copy = {
  en: {
    intro: 'Hello. I am THE GENIUS. What is on your mind?',
    promptLabel: 'Message', placeholder: 'Type a message...', send: 'Send', stop: 'Stop',
    hint: 'Enter to send · Shift + Enter for a new line', settingsEyebrow: 'PRIVATE PANEL',
    settingsTitle: 'Settings', soundTitle: 'RPG text sound',
    soundCopy: 'Soft pixel blips while an answer appears. No spoken voice.', theme: 'Color',
    inventoryTitle: 'Mood inventory', inventoryCopy: 'Your images become feelings the AI can choose.',
    addImage: 'Add image', inventoryNote: 'Select any image to pin it now. Remove custom images with the × button.',
    apiNote: 'Your API key stays on the local server and is never sent to this page.',
    languageTitle: 'Language', languageCopy: 'Switch the entire chat between English and Arabic.',
    ready: 'READY', thinking: 'THINKING', interrupted: 'PAUSED', error: 'OFFLINE',
    connectionTitle: 'AI connection', connectionChecking: 'Checking local AI connection...',
    connectionReady: 'AI connection is ready.', connectionNeedsKey: 'Add the Groq key to turn chat on.',
    connectionUnavailable: 'The local chat server is not reachable. Start it, then reload.',
    saveKey: 'Save key', chatUnavailable: 'The chat server could not be reached. Open Settings to check the connection.',
  },
  ar: {
    intro: 'مرحباً. أنا THE GENIUS. ما الذي يشغل بالك؟',
    promptLabel: 'رسالة', placeholder: 'اكتب رسالة...', send: 'إرسال', stop: 'إيقاف',
    hint: 'اضغط Enter للإرسال · Shift + Enter لسطر جديد', settingsEyebrow: 'لوحة خاصة',
    settingsTitle: 'الإعدادات', soundTitle: 'صوت نص RPG',
    soundCopy: 'نقرات بكسل خفيفة أثناء ظهور الرد. من دون صوت ناطق.', theme: 'اللون',
    inventoryTitle: 'مخزون المشاعر', inventoryCopy: 'تتحول صورك إلى مشاعر يمكن للذكاء اختيارها.',
    addImage: 'أضف صورة', inventoryNote: 'اختر صورة لتثبيتها الآن. أزل صورك الخاصة بزر ×.',
    apiNote: 'يبقى مفتاح API في الخادم المحلي ولا يُرسل إلى هذه الصفحة.',
    languageTitle: 'اللغة', languageCopy: 'بدّل المحادثة كاملة بين العربية والإنجليزية.',
    ready: 'جاهز', thinking: 'يفكر', interrupted: 'متوقف', error: 'غير متصل',
    connectionTitle: 'اتصال الذكاء', connectionChecking: 'جارٍ التحقق من الاتصال المحلي...',
    connectionReady: 'اتصال الذكاء جاهز.', connectionNeedsKey: 'أضف مفتاح Groq لتشغيل الدردشة.',
    connectionUnavailable: 'لا يمكن الوصول إلى خادم الدردشة المحلي. شغّله ثم أعد التحميل.',
    saveKey: 'حفظ المفتاح', chatUnavailable: 'لا يمكن الوصول إلى خادم الدردشة. افتح الإعدادات لفحص الاتصال.',
  },
};

const elements = {
  root: document.documentElement,
  boot: document.body,
  composer: document.querySelector('#composer'),
  prompt: document.querySelector('#prompt'),
  messages: document.querySelector('#messages'),
  template: document.querySelector('#message-template'),
  send: document.querySelector('#send-button'),
  stop: document.querySelector('#stop-button'),
  status: document.querySelector('#state-label'),
  moodLabel: document.querySelector('#mood-label'),
  moodImage: document.querySelector('#mood-image'),
  portrait: document.querySelector('#portrait-frame'),
  stage: document.querySelector('#stage'),
  language: document.querySelector('#language-toggle'),
  dialog: document.querySelector('#settings-dialog'),
  openSettings: document.querySelector('#settings-open'),
  sound: document.querySelector('#sound-toggle'),
  upload: document.querySelector('#mood-upload'),
  inventory: document.querySelector('#mood-inventory'),
  pixelGrid: document.querySelector('#pixel-grid'),
  connectionStatus: document.querySelector('#connection-status'),
  connectionLight: document.querySelector('#connection-light'),
  keyForm: document.querySelector('#key-form'),
  apiKey: document.querySelector('#api-key-input'),
  saveKey: document.querySelector('#save-key-button'),
};

let locale = localStorage.getItem('mood-pixel-language') || 'en';
let theme = localStorage.getItem('mood-pixel-theme') || 'mono';
let soundOn = localStorage.getItem('mood-pixel-sound') !== 'false';
let currentMood = localStorage.getItem('mood-pixel-current') || 'neutral';
let customMoods = loadCustomMoods();
let conversation = [];
let activeController = null;
let stopRequested = false;
let serverAvailable = false;
let aiConfigured = false;

function loadCustomMoods() {
  try {
    const saved = JSON.parse(localStorage.getItem('mood-pixel-custom-moods') || '[]');
    return Array.isArray(saved) ? saved.filter((item) => item && item.id && item.src).slice(0, 10) : [];
  } catch { return []; }
}

function saveCustomMoods() {
  try { localStorage.setItem('mood-pixel-custom-moods', JSON.stringify(customMoods)); }
  catch { alert(locale === 'ar' ? 'لا توجد مساحة كافية لحفظ هذه الصورة.' : 'There is not enough browser storage for that image.'); }
}

function allMoods() { return [...defaults, ...customMoods]; }
function text(key) { return copy[locale][key]; }

function makePixelGrid() {
  const bright = new Set([0, 5, 7, 10, 14, 16, 18, 21, 25, 28, 31, 35]);
  for (let index = 0; index < 36; index += 1) {
    const pixel = document.createElement('i');
    pixel.className = `grid-pixel${bright.has(index) ? ' lit' : ''}`;
    pixel.style.animationDelay = `${(index % 7) * -0.23}s`;
    elements.pixelGrid.append(pixel);
  }
}

class TextBlips {
  constructor() { this.context = null; this.lastAt = 0; }
  prepare() {
    if (!soundOn) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') this.context.resume();
  }
  play(character) {
    if (!soundOn || !this.context || /\s/.test(character)) return;
    const now = this.context.currentTime;
    if (now - this.lastAt < 0.035) return;
    this.lastAt = now;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const code = character.codePointAt(0) || 0;
    oscillator.type = 'square';
    oscillator.frequency.value = 170 + (code % 5) * 38;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.085, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065 + (code % 3) * 0.014);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }
}
const blips = new TextBlips();

function applyLocale() {
  const isArabic = locale === 'ar';
  elements.root.lang = locale;
  elements.root.dir = isArabic ? 'rtl' : 'ltr';
  elements.language.textContent = isArabic ? 'EN' : 'ع';
  elements.language.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = text(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = text(node.dataset.i18nPlaceholder); });
  setStatus('ready');
  updateMood(currentMood, false);
}

function setStatus(state) {
  elements.status.textContent = text(state) || text('ready');
  elements.status.dataset.state = state;
}

function setConnectionState(state, messageKey) {
  elements.connectionLight.dataset.state = state;
  elements.connectionStatus.textContent = messageKey ? text(messageKey) : '';
  elements.keyForm.hidden = state !== 'needs-key';
}

async function checkConnection() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Status endpoint unavailable.');
    const status = await response.json();
    serverAvailable = true;
    aiConfigured = Boolean(status.configured);
    setConnectionState(aiConfigured ? 'ready' : 'needs-key', aiConfigured ? 'connectionReady' : 'connectionNeedsKey');
  } catch {
    serverAvailable = false;
    aiConfigured = false;
    setConnectionState('error', 'connectionUnavailable');
  }
}

async function saveApiKey() {
  const key = elements.apiKey.value.trim();
  if (!key) return;
  elements.saveKey.disabled = true;
  try {
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not save the key.');
    elements.apiKey.value = '';
    await checkConnection();
  } catch (error) {
    elements.connectionLight.dataset.state = 'error';
    elements.connectionStatus.textContent = error.message || text('connectionUnavailable');
  } finally {
    elements.saveKey.disabled = false;
  }
}

function updateMood(id, animate = true) {
  const mood = allMoods().find((item) => item.id === id) || defaults[0];
  currentMood = mood.id;
  localStorage.setItem('mood-pixel-current', currentMood);
  elements.moodImage.src = mood.src;
  elements.moodImage.alt = `${locale === 'ar' ? 'تعبير الذكاء' : 'AI expression'}: ${mood.label}`;
  elements.moodLabel.textContent = mood.label.toUpperCase();
  if (animate) {
    elements.portrait.classList.remove('is-changing');
    void elements.portrait.offsetWidth;
    elements.portrait.classList.add('is-changing');
  }
  renderInventory();
}

function renderInventory() {
  elements.inventory.replaceChildren();
  allMoods().forEach((mood) => {
    const item = document.createElement('div');
    item.className = `inventory-item${mood.id === currentMood ? ' selected' : ''}`;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Use ${mood.label} expression`);
    const image = new Image();
    image.src = mood.src;
    image.alt = '';
    const label = document.createElement('span');
    label.textContent = mood.label;
    item.append(image, label);
    item.addEventListener('click', () => updateMood(mood.id));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); updateMood(mood.id); }
    });
    if (!defaults.some((defaultMood) => defaultMood.id === mood.id)) {
      const remove = document.createElement('button');
      remove.className = 'remove-mood';
      remove.type = 'button';
      remove.title = 'Remove image';
      remove.setAttribute('aria-label', `Remove ${mood.label}`);
      remove.textContent = '×';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        customMoods = customMoods.filter((item) => item.id !== mood.id);
        saveCustomMoods();
        if (currentMood === mood.id) updateMood('neutral');
        else renderInventory();
      });
      item.append(remove);
    }
    elements.inventory.append(item);
  });
}

function addMessage(role, initialText = '') {
  const fragment = elements.template.content.cloneNode(true);
  const message = fragment.querySelector('.message');
  const paragraph = fragment.querySelector('p');
  message.classList.add(`${role}-message`);
  paragraph.textContent = initialText;
  elements.messages.append(message);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return { message, paragraph };
}

function autoResize() {
  elements.prompt.style.height = 'auto';
  elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 140)}px`;
}

function speakPixels(delta) {
  for (const character of delta) blips.play(character);
}

function appendVisible(target, delta) {
  if (!delta) return;
  target.paragraph.textContent += delta;
  speakPixels(delta);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function tidyMoodId(value) { return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40); }

// A local fallback keeps the portrait expressive even if a provider does not
// return the invisible [[mood:...]] marker. It understands both chat languages.
function inferMoodFromText(value) {
  const textValue = value.toLocaleLowerCase();
  const signals = [
    { id: 'surprised', words: /\b(wow|whoa|amazing|unbelievable|surpris|unexpected|shocked)\b|يا\s*لله|واو|مفاج|غير\s*متوقع|مذهل/ },
    { id: 'mischievous', words: /\b(teas|mischie|sneak|secret|plot|hehe|trick)\b|مقلب|سر[ّ]?ي|خدعة|مشاكس|ههه/ },
    { id: 'joy', words: /\b(celebrat|excited|fantastic|wonderful|delighted|yay)\b|احتفال|متحمس|رائع|سعيد\s*جداً|ياي/ },
    { id: 'happy', words: /\b(happy|glad|smile|love|great|nice|thank)\b|سعيد|مسرور|ابتسام|أحب|شكراً|جميل/ },
    { id: 'cool', words: /\b(confident|sharp|stylish|chill|smooth|cool)\b|واثق|أنيق|هادئ\s*جداً|رائع/ },
    { id: 'calm', words: /\b(calm|breathe|gentle|steady|sorry|understand|take your time|careful)\b|اهدأ|تنف[ّ]?س|بلطف|لا\s*بأس|آسف|أفهم|خذ\s*وقتك|حذر/ },
  ];
  return signals.find((signal) => signal.words.test(textValue))?.id || 'neutral';
}

// Keeps the character alive for the whole duration of a streamed answer.
// The response tone nudges the loop, but it never has to wait for a keyword
// or for the provider's final hidden mood marker before it starts moving.
class LivingExpressionLoop {
  constructor() {
    this.timer = null;
    this.isTalking = false;
    this.dominantMood = 'neutral';
    this.lastMood = null;
    this.lastChangedAt = 0;
    this.holdMs = 5_000;
  }

  start() {
    this.stop();
    this.isTalking = true;
    this.dominantMood = 'neutral';
    this.show('calm');
    this.schedule(this.holdMs);
  }

  observe(visibleText) {
    const detected = inferMoodFromText(visibleText);
    if (detected !== 'neutral') {
      this.dominantMood = detected;
    }
  }

  choices() {
    const sets = {
      neutral: ['neutral', 'calm', 'cool', 'happy'],
      calm: ['calm', 'neutral', 'happy'],
      happy: ['happy', 'joy', 'cool', 'neutral'],
      joy: ['joy', 'happy', 'surprised', 'neutral'],
      surprised: ['surprised', 'joy', 'neutral', 'cool'],
      mischievous: ['mischievous', 'cool', 'happy', 'neutral'],
      cool: ['cool', 'mischievous', 'calm', 'neutral'],
    };
    const available = new Set(allMoods().map((mood) => mood.id));
    return (sets[this.dominantMood] || sets.neutral).filter((id) => available.has(id));
  }

  pulse() {
    if (!this.isTalking) return;
    const choices = this.choices().filter((id) => id !== this.lastMood);
    const next = choices[Math.floor(Math.random() * choices.length)] || this.dominantMood;
    this.show(next);
    this.schedule(this.holdMs);
  }

  show(id) {
    this.lastMood = id;
    this.lastChangedAt = Date.now();
    updateMood(id);
  }

  schedule(delay) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.pulse(), delay);
  }

  stop() {
    this.isTalking = false;
    window.clearTimeout(this.timer);
    this.timer = null;
  }

  finish(finalMood) {
    const remainingHold = Math.max(0, this.holdMs - (Date.now() - this.lastChangedAt));
    this.stop();
    if (!finalMood || finalMood === this.lastMood) return;
    if (remainingHold === 0) {
      this.show(finalMood);
      return;
    }
    // Do not cut a live expression short just because the final token arrived.
    this.timer = window.setTimeout(() => this.show(finalMood), remainingHold);
  }
}
const expressionLoop = new LivingExpressionLoop();

function readSSE(stream, onDelta) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  return (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const events = buffered.split('\n\n');
      buffered = events.pop() || '';
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const payload = JSON.parse(data);
            const delta = payload.choices?.[0]?.delta?.content;
            if (delta) onDelta(delta);
          } catch { /* Ignore incomplete/non-content SSE packets. */ }
        }
      }
    }
    if (buffered.startsWith('data:')) {
      try {
        const payload = JSON.parse(buffered.slice(5).trim());
        const delta = payload.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch { /* Stream ended on a non-content packet. */ }
    }
  })();
}

function createMoodFilter(target) {
  const marker = '[[mood:';
  let safeBuffer = '';
  let choosingMood = false;
  let choiceBuffer = '';
  let chosen = null;

  const appendSafe = (value) => appendVisible(target, value);
  return {
    consume(delta) {
      if (choosingMood) {
        choiceBuffer += delta;
        const end = choiceBuffer.indexOf(']]');
        if (end !== -1) {
          chosen = tidyMoodId(choiceBuffer.slice(0, end));
          choosingMood = false;
          choiceBuffer = '';
        }
        return;
      }
      safeBuffer += delta;
      const markerAt = safeBuffer.indexOf(marker);
      if (markerAt !== -1) {
        appendSafe(safeBuffer.slice(0, markerAt));
        choiceBuffer = safeBuffer.slice(markerAt + marker.length);
        safeBuffer = '';
        choosingMood = true;
        const end = choiceBuffer.indexOf(']]');
        if (end !== -1) {
          chosen = tidyMoodId(choiceBuffer.slice(0, end));
          choosingMood = false;
          choiceBuffer = '';
        }
        return;
      }
      let prefixLength = 0;
      for (let length = Math.min(marker.length - 1, safeBuffer.length); length > 0; length -= 1) {
        if (safeBuffer.endsWith(marker.slice(0, length))) { prefixLength = length; break; }
      }
      appendSafe(safeBuffer.slice(0, safeBuffer.length - prefixLength));
      safeBuffer = safeBuffer.slice(safeBuffer.length - prefixLength);
    },
    finish() {
      if (!choosingMood && safeBuffer) appendSafe(safeBuffer);
      return chosen;
    },
  };
}

function setStreaming(streaming) {
  elements.send.hidden = streaming;
  elements.stop.hidden = !streaming;
  elements.prompt.setAttribute('aria-busy', String(streaming));
}

async function sendMessage() {
  const content = elements.prompt.value.trim();
  if (!content || activeController) return;
  if (!serverAvailable || !aiConfigured) {
    elements.dialog.showModal();
    await checkConnection();
    return;
  }
  blips.prepare();
  stopRequested = false;
  addMessage('user', content);
  conversation.push({ role: 'user', content });
  elements.prompt.value = '';
  autoResize();
  const assistant = addMessage('assistant');
  assistant.message.classList.add('typing-cursor');
  setStatus('thinking');
  elements.stage.classList.add('talking');
  expressionLoop.start();
  setStreaming(true);
  activeController = new AbortController();
  const moodFilter = createMoodFilter(assistant);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      signal: activeController.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: locale,
        messages: conversation,
        moods: allMoods().map((mood) => mood.id),
      }),
    });
    if (!response.ok || !response.body) {
      const failure = await response.json().catch(() => ({}));
      if (response.status === 503) {
        aiConfigured = false;
        elements.dialog.showModal();
        checkConnection();
      }
      throw new Error(failure.error || text('chatUnavailable'));
    }
    await readSSE(response.body, (delta) => {
      moodFilter.consume(delta);
      expressionLoop.observe(assistant.paragraph.textContent);
    });
    const selectedMood = moodFilter.finish();
    const finalMood = allMoods().some((mood) => mood.id === selectedMood)
      ? selectedMood
      : inferMoodFromText(assistant.paragraph.textContent);
    expressionLoop.finish(finalMood);
    if (assistant.paragraph.textContent.trim()) conversation.push({ role: 'assistant', content: assistant.paragraph.textContent.trim() });
    setStatus(stopRequested ? 'interrupted' : 'ready');
  } catch (error) {
    if (error.name === 'AbortError') {
      if (assistant.paragraph.textContent.trim()) conversation.push({ role: 'assistant', content: assistant.paragraph.textContent.trim() });
      expressionLoop.finish(inferMoodFromText(assistant.paragraph.textContent));
      setStatus('interrupted');
    } else {
      expressionLoop.stop();
      assistant.paragraph.textContent = error.message || text('chatUnavailable');
      assistant.message.classList.add('error-message');
      setStatus('error');
    }
  } finally {
    elements.stage.classList.remove('talking');
    assistant.message.classList.remove('typing-cursor');
    activeController = null;
    setStreaming(false);
    elements.prompt.focus();
  }
}

function stopResponse() {
  if (!activeController) return;
  stopRequested = true;
  activeController.abort();
}

function safeFileId(file, index) {
  const base = tidyMoodId(file.name.replace(/\.[^.]+$/, '')) || 'feeling';
  return `${base}-${Date.now().toString(36)}-${index}`;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function addMoodFiles(files) {
  const accepted = [...files].filter((file) => file.type.startsWith('image/') && file.size <= 1_500_000).slice(0, 10 - customMoods.length);
  if (!accepted.length) return;
  const newMoods = await Promise.all(accepted.map(async (file, index) => ({
    id: safeFileId(file, index),
    label: file.name.replace(/\.[^.]+$/, '').slice(0, 26) || 'feeling',
    src: await readFile(file),
  })));
  customMoods.push(...newMoods);
  saveCustomMoods();
  renderInventory();
  updateMood(newMoods.at(-1).id);
}

elements.composer.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(); });
elements.prompt.addEventListener('input', autoResize);
elements.prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
});
elements.stop.addEventListener('click', stopResponse);
elements.language.addEventListener('click', () => {
  locale = locale === 'en' ? 'ar' : 'en';
  localStorage.setItem('mood-pixel-language', locale);
  applyLocale();
});
elements.openSettings.addEventListener('click', () => elements.dialog.showModal());
elements.saveKey.addEventListener('click', saveApiKey);
elements.apiKey.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); saveApiKey(); }
});
elements.sound.checked = soundOn;
elements.sound.addEventListener('change', () => {
  soundOn = elements.sound.checked;
  localStorage.setItem('mood-pixel-sound', String(soundOn));
  if (soundOn) blips.prepare();
});
elements.upload.addEventListener('change', async () => {
  await addMoodFiles(elements.upload.files);
  elements.upload.value = '';
});
document.querySelectorAll('.swatch').forEach((swatch) => swatch.addEventListener('click', () => {
  theme = swatch.dataset.theme;
  localStorage.setItem('mood-pixel-theme', theme);
  applyTheme();
}));

function applyTheme() {
  if (theme === 'mono') delete elements.root.dataset.theme;
  else elements.root.dataset.theme = theme;
  document.querySelectorAll('.swatch').forEach((swatch) => swatch.classList.toggle('active', swatch.dataset.theme === theme));
}

makePixelGrid();
applyTheme();
applyLocale();
renderInventory();
autoResize();
checkConnection();
window.setTimeout(() => elements.boot.classList.remove('booting'), 1150);

// The chat remains usable when offline after its first visit; messages still
// require the server connection because the API key never leaves the server.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
