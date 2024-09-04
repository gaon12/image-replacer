// 새로운 이미지 URL 변수 (교체할 이미지 경로)
const newImageUrl = chrome.runtime.getURL('imgs/1.jpg');
const newFaviconUrl = chrome.runtime.getURL('imgs/favicon.ico'); // 새로운 파비콘 경로

// 인라인 스타일로 강제로 background-image를 덮어쓰는 함수
function forceInlineBackgroundImageChange(el, url) {
    el.style.setProperty('background-image', `url(${url})`, 'important');
}

// 특정 도메인 및 URL에서 예외 처리하기 위한 함수
function isExceptionDomain() {
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;

    // 예외 처리할 도메인, URL 등을 정의
    const exceptions = {
        domains: ['youtube.com'],
        urls: [],
    };

    return exceptions.domains.some(domain => currentDomain.includes(domain)) ||
           exceptions.urls.some(url => currentUrl.includes(url));
}

// 이미지 및 배경 이미지를 교체하는 함수
function replaceImages() {
    if (!isExceptionDomain()) {
        // .empty 클래스가 있는 요소에서 'empty' 클래스를 제거
        let elementsWithEmptyClass = document.querySelectorAll('.empty');
        elementsWithEmptyClass.forEach((el) => {
            el.classList.remove('empty');
        });
    }

    let imgs = document.querySelectorAll('img:not([data-replaced])');
    imgs.forEach((img) => {
        if (!img.src.includes(newImageUrl)) {
            const originalWidth = img.width;
            const originalHeight = img.height;

            img.src = newImageUrl;
            img.srcset = '';
            img.removeAttribute('srcset');

            img.style.width = `${originalWidth}px`;
            img.style.height = `${originalHeight}px`;
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center';
            img.setAttribute('data-replaced', 'true'); // 이미지가 이미 교체된 것을 표시
        }
    });

    let elementsWithInlineStyles = document.querySelectorAll('*[style*="url("]:not([data-replaced])');
    elementsWithInlineStyles.forEach((el) => {
        let inlineStyle = el.getAttribute('style');
        if (inlineStyle.includes('url(') && !inlineStyle.includes(newImageUrl)) {
            let updatedStyle = inlineStyle.replace(/url\([^)]+\)/g, `url(${newImageUrl})`);
            el.setAttribute('style', updatedStyle);
            el.setAttribute('data-replaced', 'true');
        }
    });

    let elementsWithThumbnails = document.querySelectorAll('[thumbnails]:not([data-replaced])');
    elementsWithThumbnails.forEach((el) => {
        let thumbnailsAttr = el.getAttribute('thumbnails');
        if (thumbnailsAttr.includes('url') && !thumbnailsAttr.includes(newImageUrl)) {
            let updatedThumbnails = thumbnailsAttr.replace(/"url":"[^"]+"/g, `"url":"${newImageUrl}"`);
            el.setAttribute('thumbnails', updatedThumbnails);
            el.setAttribute('data-replaced', 'true');
        }
    });

    let svgs = document.querySelectorAll('svg:not([data-replaced])');
    svgs.forEach((svg) => {
        const originalWidth = svg.clientWidth;
        const originalHeight = svg.clientHeight;

        let img = document.createElement('img');
        img.src = newImageUrl;
        img.width = originalWidth;
        img.height = originalHeight;
        img.style.display = svg.style.display;
        img.style.width = svg.style.width;
        img.style.height = svg.style.height;

        svg.parentNode.replaceChild(img, svg);
    });

    // 가상 요소의 background-image를 변경하는 함수
    replacePseudoElementBackgroundImages();
}

// 가상 요소의 background-image를 변경하는 함수
function replacePseudoElementBackgroundImages() {
    const elements = document.querySelectorAll('*:not([data-replaced])');

    elements.forEach((el) => {
        // ::before 가상 요소
        const beforeBgImage = window.getComputedStyle(el, '::before').backgroundImage;
        if (beforeBgImage && beforeBgImage !== 'none' && !beforeBgImage.includes(newImageUrl)) {
            el.style.setProperty('--before-bg-image', `url(${newImageUrl})`, 'important');
            el.style.setProperty('content', '""', 'important');
            el.setAttribute('data-replaced', 'true');
        }

        // ::after 가상 요소
        const afterBgImage = window.getComputedStyle(el, '::after').backgroundImage;
        if (afterBgImage && afterBgImage !== 'none' && !afterBgImage.includes(newImageUrl)) {
            el.style.setProperty('--after-bg-image', `url(${newImageUrl})`, 'important');
            el.style.setProperty('content', '""', 'important');
            el.setAttribute('data-replaced', 'true');
        }
    });
}

// 파비콘을 교체하는 함수
function replaceFavicon() {
    let links = document.querySelectorAll("link[rel~='icon']");
    links.forEach((link) => {
        link.href = newFaviconUrl;
    });

    if (links.length === 0) {
        let newIconLink = document.createElement('link');
        newIconLink.rel = 'icon';
        newIconLink.href = newFaviconUrl;
        document.head.appendChild(newIconLink);
    }
}

// MutationObserver 설정
function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        let shouldReplace = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                shouldReplace = true;
            }
        });

        if (shouldReplace) {
            replaceImages();
            replaceFavicon();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
}

// 초기화 함수 실행
function initialize() {
    replaceImages();
    replaceFavicon();

    setupMutationObserver();
}

// 초기화 함수 호출
initialize();
