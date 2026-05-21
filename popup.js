const EXTENSION_IMAGE_URL = chrome.runtime.getURL('imgs/1.jpg');

const DEFAULT_OPTIONS = {
  enabled: true,
  imageUrl: EXTENSION_IMAGE_URL,
  replaceFavicon: true,
  replaceInlineBackgrounds: true,
  replacePseudoBackgrounds: false,
  replaceSvg: false,
  excludedDomains: ['youtube.com']
};

const form = document.getElementById('settings-form');
const statusElement = document.getElementById('status');
const resetButton = document.getElementById('reset-button');

const fields = {
  enabled: document.getElementById('enabled'),
  imageUrl: document.getElementById('imageUrl'),
  replaceFavicon: document.getElementById('replaceFavicon'),
  replaceInlineBackgrounds: document.getElementById('replaceInlineBackgrounds'),
  replacePseudoBackgrounds: document.getElementById('replacePseudoBackgrounds'),
  replaceSvg: document.getElementById('replaceSvg'),
  excludedDomains: document.getElementById('excludedDomains')
};

function normalizeDomains(value) {
  return value
    .split('\n')
    .map((domain) => domain.trim())
    .filter(Boolean);
}

function normalizeOptions(rawOptions = {}) {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...rawOptions
  };

  return {
    enabled: Boolean(mergedOptions.enabled),
    imageUrl: typeof mergedOptions.imageUrl === 'string' && mergedOptions.imageUrl.trim()
      ? mergedOptions.imageUrl.trim()
      : EXTENSION_IMAGE_URL,
    replaceFavicon: Boolean(mergedOptions.replaceFavicon),
    replaceInlineBackgrounds: Boolean(mergedOptions.replaceInlineBackgrounds),
    replacePseudoBackgrounds: Boolean(mergedOptions.replacePseudoBackgrounds),
    replaceSvg: Boolean(mergedOptions.replaceSvg),
    excludedDomains: Array.isArray(mergedOptions.excludedDomains)
      ? mergedOptions.excludedDomains.map((domain) => String(domain).trim()).filter(Boolean)
      : DEFAULT_OPTIONS.excludedDomains
  };
}

function renderOptions(options) {
  fields.enabled.checked = options.enabled;
  fields.imageUrl.value = options.imageUrl === EXTENSION_IMAGE_URL ? '' : options.imageUrl;
  fields.replaceFavicon.checked = options.replaceFavicon;
  fields.replaceInlineBackgrounds.checked = options.replaceInlineBackgrounds;
  fields.replacePseudoBackgrounds.checked = options.replacePseudoBackgrounds;
  fields.replaceSvg.checked = options.replaceSvg;
  fields.excludedDomains.value = options.excludedDomains.join('\n');
}

function readOptionsFromForm() {
  const imageUrl = fields.imageUrl.value.trim();

  return {
    enabled: fields.enabled.checked,
    imageUrl: imageUrl || EXTENSION_IMAGE_URL,
    replaceFavicon: fields.replaceFavicon.checked,
    replaceInlineBackgrounds: fields.replaceInlineBackgrounds.checked,
    replacePseudoBackgrounds: fields.replacePseudoBackgrounds.checked,
    replaceSvg: fields.replaceSvg.checked,
    excludedDomains: normalizeDomains(fields.excludedDomains.value)
  };
}

function showStatus(message) {
  statusElement.textContent = message;

  window.setTimeout(() => {
    if (statusElement.textContent === message) {
      statusElement.textContent = '';
    }
  }, 1800);
}

async function loadOptions() {
  const storedOptions = await chrome.storage.sync.get(DEFAULT_OPTIONS);
  renderOptions(normalizeOptions(storedOptions));
}

async function saveOptions(event) {
  event.preventDefault();
  await chrome.storage.sync.set(readOptionsFromForm());
  showStatus('저장되었습니다. 새 설정이 열린 탭에 적용됩니다.');
}

async function resetOptions() {
  await chrome.storage.sync.set(DEFAULT_OPTIONS);
  renderOptions(DEFAULT_OPTIONS);
  showStatus('기본값으로 복원되었습니다.');
}

form.addEventListener('submit', saveOptions);
resetButton.addEventListener('click', resetOptions);
loadOptions().catch((error) => {
  console.error('Failed to load Image Replacer settings:', error);
  showStatus('설정을 불러오지 못했습니다.');
});
