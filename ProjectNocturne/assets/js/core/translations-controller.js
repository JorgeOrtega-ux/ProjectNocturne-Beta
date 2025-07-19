let currentLanguage = 'en-us';
let translations = {};
let isTranslationSystemReady = false;

function initTranslationSystem() {
    return new Promise((resolve, reject) => {
        getCurrentLanguageFromStorage()
            .then(language => {
                currentLanguage = language;
                return loadTranslations(language);
            })
            .then(() => {
                applyTranslations();
                setupLanguageChangeListener();
                isTranslationSystemReady = true;
                const event = new CustomEvent('translationSystemReady', {
                    detail: { language: currentLanguage }
                });
                document.dispatchEvent(event);
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
}

function getCurrentLanguageFromStorage() {
    return new Promise(resolve => {
        const savedLanguage = localStorage.getItem('app-language');
        const supportedLanguages = ['en-us', 'es-mx', 'fr-fr'];
        if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
            resolve(savedLanguage);
        } else {
            resolve('en-us');
        }
    });
}

function setCurrentLanguage(language) {
    const supportedLanguages = ['en-us', 'es-mx', 'fr-fr'];
    if (supportedLanguages.includes(language) && language !== currentLanguage) {
        currentLanguage = language;
        return loadTranslations(language)
            .then(() => {
                applyTranslations();
                return true;
            })
            .catch(error => {
                return false;
            });
    }
    return Promise.resolve(false);
}

function loadTranslations(language) {
    return new Promise((resolve, reject) => {
        const generalTranslationsPath = `assets/translations/${language}.json`;
        const legalTranslationsPath = `assets/translations/legal/${language}.json`;
        Promise.all([
            fetch(generalTranslationsPath).then(response => {
                if (!response.ok) throw new Error(`HTTP error for general translations! status: ${response.status}`);
                return response.json();
            }),
            fetch(legalTranslationsPath).then(response => {
                if (!response.ok) throw new Error(`HTTP error for legal translations! status: ${response.status}`);
                return response.json();
            })
        ])
            .then(([generalData, legalData]) => {
                translations = { ...generalData, ...legalData };
                resolve();
            })
            .catch(error => {
                if (language !== 'en-us') {
                    return loadTranslations('en-us').then(resolve).catch(reject);
                }
                reject(error);
            });
    });
}

function applyTranslations() {
    if (!translations || Object.keys(translations).length === 0) {
        return;
    }
    translateElementsWithDataTranslate();
    updateDynamicMenuLabels();
    updateTooltipTranslations();
    updateColorSystemHeaders();
    updateLegalDates();
}

function translateElementsWithDataTranslate(parentElement = document.body) {
    const elementsToTranslate = parentElement.querySelectorAll('[data-translate]');
    elementsToTranslate.forEach(element => {
        const translateKey = element.getAttribute('data-translate');
        const translateCategory = element.getAttribute('data-translate-category') || 'menu';
        const translateTarget = element.getAttribute('data-translate-target') || 'text';
        const placeholdersAttr = element.getAttribute('data-placeholders');
        if (!translateKey) return;
        if (isDynamicMenuElement(element)) return;
        let translatedText = getTranslation(translateKey, translateCategory);
        if (placeholdersAttr) {
            try {
                const placeholders = JSON.parse(placeholdersAttr);
                for (const placeholder in placeholders) {
                    if (Object.prototype.hasOwnProperty.call(placeholders, placeholder)) {
                        translatedText = translatedText.replace(`{${placeholder}}`, placeholders[placeholder]);
                    }
                }
            } catch (e) {
            }
        }
        switch (translateTarget) {
            case 'text':
                element.innerHTML = translatedText;
                break;
            case 'tooltip':
                break;
            case 'title':
                element.setAttribute('title', translatedText);
                break;
            case 'placeholder':
                element.setAttribute('placeholder', translatedText);
                break;
            case 'aria-label':
                element.setAttribute('aria-label', translatedText);
                break;
            default:
                element.innerHTML = translatedText;
        }
    });
}

function translateElementTree(element) {
    if (element) {
        if (element.hasAttribute('data-translate')) {
            translateElementsWithDataTranslate(new DocumentFragment().appendChild(element.cloneNode(false)));
        }
        translateElementsWithDataTranslate(element);
    }
}

function isDynamicMenuElement(element) {
    const menuLink = element.closest('.menu-link');
    if (menuLink) {
        const toggle = menuLink.getAttribute('data-toggle');
        if (toggle === 'appearance' || toggle === 'language' || toggle === 'location') {
            return true;
        }
    }
    return false;
}

function updateColorSystemHeaders() {
    const colorSections = [
        { selector: '[data-section="main-colors"] .menu-content-header span:last-child', key: 'main_colors' },
        { selector: '[data-section="recent-colors"] .menu-content-header span:last-child', key: 'recent_colors' },
        { selector: '[data-section="default-colors"] .menu-content-header span:last-child', key: 'default_colors' },
        { selector: '[data-section="gradient-colors"] .menu-content-header span:last-child', key: 'gradient_colors' }
    ];
    colorSections.forEach(section => {
        const element = document.querySelector(section.selector);
        if (element) {
            const translatedText = getTranslation(section.key, 'color_system');
            if (translatedText && translatedText !== section.key) {
                element.textContent = translatedText;
            }
        }
    });
}

function updateDynamicMenuLabels() {
    if (!translations.menu) {
        return;
    }
    updateAppearanceLabel();
    updateLanguageLabel();
    updateLocationLabel();
}

function updateAppearanceLabel() {
    const appearanceLink = document.querySelector('.menu-link[data-toggle="appearance"] .menu-link-text span');
    if (appearanceLink && translations.menu) {
        const currentTheme = (typeof window.getCurrentTheme === 'function') ? window.getCurrentTheme() : localStorage.getItem('app-theme') || 'system';
        const themeKey = getThemeTranslationKey(currentTheme);
        if (themeKey && translations.menu[themeKey] && translations.menu.appearance) {
            appearanceLink.textContent = `${translations.menu.appearance}: ${translations.menu[themeKey]}`;
        }
    }
}

function updateLanguageLabel() {
    const languageLink = document.querySelector('.menu-link[data-toggle="language"] .menu-link-text span');
    if (languageLink && translations.menu) {
        const currentLanguageFromControlCenter = (typeof window.getCurrentLanguage === 'function') ? window.getCurrentLanguage() : currentLanguage;
        const languageKey = getLanguageTranslationKey(currentLanguageFromControlCenter);
        if (languageKey && translations.menu[languageKey] && translations.menu.language) {
            languageLink.textContent = `${translations.menu.language}: ${translations.menu[languageKey]}`;
        }
    }
}

function updateLocationLabel() {
    const locationLinkSpan = document.querySelector('.menu-link[data-toggle="location"] .menu-link-text span');
    if (locationLinkSpan && typeof window.getCurrentLocation === 'function') {
        const locationLabel = getTranslation('location', 'menu');
        const currentLocationData = window.getCurrentLocation();
        const currentLocationName = currentLocationData ? currentLocationData.name : getTranslation('none_selected', 'menu');
        const newText = `${locationLabel}: ${currentLocationName}`;
        if (locationLinkSpan.textContent !== newText) {
            locationLinkSpan.textContent = newText;
        }
    }
}

function getThemeTranslationKey(theme) {
    const themeMap = {
        'system': 'sync_with_system',
        'dark': 'dark_theme',
        'light': 'light_theme'
    };
    return themeMap[theme] || 'sync_with_system';
}

function getLanguageTranslationKey(language) {
    const languageMap = {
        'en-us': 'english_us',
        'es-mx': 'spanish_mx',
        'fr-fr': 'french_fr'
    };
    return languageMap[language] || 'english_us';
}

function updateTooltipTranslations() {
    if (typeof window.updateTooltipTextMap === 'function' && translations) {
        window.updateTooltipTextMap(translations);
    }
}

function setupLanguageChangeListener() {
    document.addEventListener('languageChanged', (e) => {
        if (e.detail && e.detail.language && e.detail.language !== currentLanguage) {
            setCurrentLanguage(e.detail.language)
                .then(() => {
                    document.dispatchEvent(new CustomEvent('translationsApplied', {
                        detail: { language: currentLanguage }
                    }));
                });
        }
    });
    window.addEventListener('storage', (e) => {
        if (e.key === 'app-language' && e.newValue && e.newValue !== currentLanguage) {
            setCurrentLanguage(e.newValue)
                .then(() => {
                    document.dispatchEvent(new CustomEvent('translationsApplied', {
                        detail: { language: currentLanguage }
                    }));
                });
        }
    });
}

function updateLegalDates() {
    const dateElements = document.querySelectorAll('[data-dynamic-date]');
    dateElements.forEach(element => {
        const parentP = element.closest('[data-date-iso]');
        if (!parentP) return;
        const isoDate = parentP.dataset.dateIso;
        if (!isoDate) return;
        const date = new Date(isoDate + 'T12:00:00Z');
        if (isNaN(date.getTime())) return;
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        try {
            element.textContent = new Intl.DateTimeFormat(currentLanguage, options).format(date);
        } catch (e) {
            element.textContent = date.toLocaleDateString();
        }
    });
}

function getTranslation(key, category = 'menu') {
    if (!translations || !translations[category]) {
        return key;
    }
    return translations[category][key] || key;
}

function getCurrentLanguage() {
    return currentLanguage;
}

function isSystemReady() {
    return isTranslationSystemReady;
}

function refreshTranslations() {
    if (isTranslationSystemReady) {
        applyTranslations();
    }
}

function getSearchTranslation(key) {
    return getTranslation(key, 'search');
}

function getSearchSectionTranslation(key) {
    return getTranslation(key, 'search_sections');
}

function getColorSystemTranslation(key) {
    return getTranslation(key, 'color_system');
}

function debugTranslationsController() {
}

window.getTranslation = getTranslation;
window.getCurrentLanguage = getCurrentLanguage;
window.updateDynamicMenuLabels = updateDynamicMenuLabels;
window.getSearchTranslation = getSearchTranslation;
window.getSearchSectionTranslation = getSearchSectionTranslation;
window.getColorSystemTranslation = getColorSystemTranslation;

export {
    applyTranslations, debugTranslationsController, getColorSystemTranslation, getCurrentLanguage,
    getSearchSectionTranslation, getSearchTranslation, getTranslation, initTranslationSystem,
    isSystemReady, refreshTranslations, setCurrentLanguage, translateElementTree,
    translateElementsWithDataTranslate, updateColorSystemHeaders, updateDynamicMenuLabels
};