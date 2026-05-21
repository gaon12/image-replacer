(() => {
  'use strict';

  const EXTENSION_IMAGE_URL = chrome.runtime.getURL('imgs/1.jpg');
  const EXTENSION_FAVICON_URL = chrome.runtime.getURL('imgs/favicon.ico');
  const REPLACED_ATTR = 'data-image-replacer-replaced';
  const PSEUDO_STYLE_ID = 'image-replacer-pseudo-style';

  const DEFAULT_OPTIONS = {
    enabled: true,
    imageUrl: EXTENSION_IMAGE_URL,
    replaceFavicon: true,
    replaceInlineBackgrounds: true,
    replacePseudoBackgrounds: false,
    replaceSvg: false,
    excludedDomains: ['youtube.com']
  };

  let options = { ...DEFAULT_OPTIONS };
  let observer = null;
  let scheduled = false;
  const pendingRoots = new Set();

  function normalizeOptions(rawOptions = {}) {
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...rawOptions
    };

    mergedOptions.enabled = Boolean(mergedOptions.enabled);
    mergedOptions.imageUrl = typeof mergedOptions.imageUrl === 'string' && mergedOptions.imageUrl.trim()
      ? mergedOptions.imageUrl.trim()
      : EXTENSION_IMAGE_URL;
    mergedOptions.replaceFavicon = Boolean(mergedOptions.replaceFavicon);
    mergedOptions.replaceInlineBackgrounds = Boolean(mergedOptions.replaceInlineBackgrounds);
    mergedOptions.replacePseudoBackgrounds = Boolean(mergedOptions.replacePseudoBackgrounds);
    mergedOptions.replaceSvg = Boolean(mergedOptions.replaceSvg);
    mergedOptions.excludedDomains = Array.isArray(mergedOptions.excludedDomains)
      ? mergedOptions.excludedDomains.map((domain) => String(domain).trim()).filter(Boolean)
      : DEFAULT_OPTIONS.excludedDomains;

    return mergedOptions;
  }

  function isExcludedDomain() {
    const currentHost = window.location.hostname;

    return options.excludedDomains.some((domain) => {
      return currentHost === domain || currentHost.endsWith(`.${domain}`);
    });
  }

  function shouldRun() {
    return options.enabled && !isExcludedDomain();
  }

  function getReplacementImageUrl() {
    return options.imageUrl || EXTENSION_IMAGE_URL;
  }

  function markAsReplaced(element) {
    element.setAttribute(REPLACED_ATTR, 'true');
  }

  function isAlreadyReplaced(element) {
    return element.hasAttribute(REPLACED_ATTR);
  }

  function preserveRenderedSize(imageElement) {
    const rect = imageElement.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      imageElement.style.width = `${Math.round(rect.width)}px`;
      imageElement.style.height = `${Math.round(rect.height)}px`;
    }
  }

  function replaceImageElement(imageElement) {
    if (isAlreadyReplaced(imageElement)) {
      return;
    }

    const replacementUrl = getReplacementImageUrl();

    if (imageElement.currentSrc === replacementUrl || imageElement.src === replacementUrl) {
      markAsReplaced(imageElement);
      return;
    }

    preserveRenderedSize(imageElement);
    imageElement.removeAttribute('srcset');
    imageElement.removeAttribute('sizes');
    imageElement.src = replacementUrl;
    imageElement.style.objectFit = imageElement.style.objectFit || 'cover';
    imageElement.style.objectPosition = imageElement.style.objectPosition || 'center';
    markAsReplaced(imageElement);
  }

  function replaceSourceElement(sourceElement) {
    if (isAlreadyReplaced(sourceElement)) {
      return;
    }

    sourceElement.removeAttribute('srcset');
    markAsReplaced(sourceElement);
  }

  function replaceInlineBackground(element) {
    if (!options.replaceInlineBackgrounds || isAlreadyReplaced(element)) {
      return;
    }

    const styleAttribute = element.getAttribute('style');

    if (!styleAttribute || !styleAttribute.includes('url(')) {
      return;
    }

    const replacementUrl = getReplacementImageUrl();

    if (styleAttribute.includes(replacementUrl)) {
      markAsReplaced(element);
      return;
    }

    const updatedStyle = styleAttribute.replace(/url\((['"]?)(.*?)\1\)/gi, `url("${replacementUrl}")`);
    element.setAttribute('style', updatedStyle);
    markAsReplaced(element);
  }

  function replaceThumbnailAttribute(element) {
    if (isAlreadyReplaced(element)) {
      return;
    }

    const thumbnails = element.getAttribute('thumbnails');

    if (!thumbnails || !thumbnails.includes('url')) {
      return;
    }

    const replacementUrl = getReplacementImageUrl();

    if (thumbnails.includes(replacementUrl)) {
      markAsReplaced(element);
      return;
    }

    const updatedThumbnails = thumbnails.replace(/"url"\s*:\s*"[^"]+"/g, `"url":"${replacementUrl}"`);
    element.setAttribute('thumbnails', updatedThumbnails);
    markAsReplaced(element);
  }

  function replaceSvgElement(svgElement) {
    if (!options.replaceSvg || isAlreadyReplaced(svgElement) || !svgElement.parentNode) {
      return;
    }

    const rect = svgElement.getBoundingClientRect();
    const replacementImage = document.createElement('img');
    replacementImage.src = getReplacementImageUrl();
    replacementImage.alt = 'Replaced SVG image';
    replacementImage.style.display = window.getComputedStyle(svgElement).display;
    replacementImage.style.width = rect.width > 0 ? `${Math.round(rect.width)}px` : '1em';
    replacementImage.style.height = rect.height > 0 ? `${Math.round(rect.height)}px` : '1em';
    replacementImage.style.objectFit = 'cover';
    replacementImage.style.objectPosition = 'center';
    markAsReplaced(replacementImage);

    svgElement.parentNode.replaceChild(replacementImage, svgElement);
  }

  function replaceFavicon() {
    if (!options.replaceFavicon || !document.head) {
      return;
    }

    const iconLinks = document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");

    if (iconLinks.length === 0) {
      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = EXTENSION_FAVICON_URL;
      document.head.appendChild(iconLink);
      return;
    }

    iconLinks.forEach((link) => {
      link.href = EXTENSION_FAVICON_URL;
    });
  }

  function updatePseudoElementStyles() {
    const existingStyle = document.getElementById(PSEUDO_STYLE_ID);

    if (!options.replacePseudoBackgrounds || !shouldRun()) {
      existingStyle?.remove();
      return;
    }

    const replacementUrl = getReplacementImageUrl();
    const css = `
      *::before,
      *::after {
        background-image: url("${CSS.escape(replacementUrl)}") !important;
      }
    `;

    if (existingStyle) {
      existingStyle.textContent = css;
      return;
    }

    const style = document.createElement('style');
    style.id = PSEUDO_STYLE_ID;
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function processElement(element) {
    if (!shouldRun() || !(element instanceof Element)) {
      return;
    }

    if (element.matches('img')) {
      replaceImageElement(element);
    }

    if (element.matches('source')) {
      replaceSourceElement(element);
    }

    if (element.matches('svg')) {
      replaceSvgElement(element);
    }

    replaceInlineBackground(element);
    replaceThumbnailAttribute(element);
  }

  function processRoot(root) {
    if (!shouldRun() || !(root instanceof Element || root instanceof Document)) {
      return;
    }

    if (root instanceof Element) {
      processElement(root);
    }

    root.querySelectorAll?.('img, source, svg, [style*="url("], [thumbnails]').forEach(processElement);
  }

  function scheduleProcessing(root = document) {
    pendingRoots.add(root);

    if (scheduled) {
      return;
    }

    scheduled = true;

    const run = () => {
      scheduled = false;
      const roots = [...pendingRoots];
      pendingRoots.clear();

      if (!shouldRun()) {
        updatePseudoElementStyles();
        return;
      }

      roots.forEach(processRoot);
      replaceFavicon();
      updatePseudoElementStyles();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 500 });
      return;
    }

    window.setTimeout(run, 75);
  }

  function handleMutation(mutation) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scheduleProcessing(node);
        }
      });
      return;
    }

    if (mutation.type === 'attributes' && mutation.target instanceof Element) {
      scheduleProcessing(mutation.target);
    }
  }

  function setupMutationObserver() {
    if (observer || !document.documentElement) {
      return;
    }

    observer = new MutationObserver((mutations) => {
      if (!shouldRun()) {
        return;
      }

      mutations.forEach(handleMutation);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'sizes', 'style', 'thumbnails', 'rel', 'href']
    });
  }

  function loadOptions() {
    return chrome.storage.sync.get(DEFAULT_OPTIONS).then((storedOptions) => {
      options = normalizeOptions(storedOptions);
    });
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') {
        return;
      }

      const nextOptions = { ...options };

      Object.keys(changes).forEach((key) => {
        nextOptions[key] = changes[key].newValue;
      });

      options = normalizeOptions(nextOptions);
      scheduleProcessing(document);
    });
  }

  function initialize() {
    loadOptions()
      .then(() => {
        scheduleProcessing(document);
        setupMutationObserver();
        setupStorageListener();
      })
      .catch((error) => {
        console.warn('Image Replacer failed to initialize:', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
