// ========== TRANSLATIONS CONTROLLER - IMPROVED WITH NEW CATEGORIES ==========

let currentLanguage = 'en-us';
let translations = {};
let isTranslationSystemReady = false;

// ========== INITIALIZATION ==========

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
                console.error('Error initializing translation system:', error);
                reject(error);
            });
    });
}

// ========== LANGUAGE MANAGEMENT ==========

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
                console.error('Error setting language:', error);
                return false;
            });
    }
    return Promise.resolve(false);
}

// ========== TRANSLATION LOADING ==========

function loadTranslations(language) {
    return new Promise((resolve, reject) => {
        fetch(`config/translations/${language}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                translations = data;
                resolve();
            })
            .catch(error => {
                console.error(`❌ Error loading translations for ${language}:`, error);
                if (language !== 'en-us') {
                    return loadTranslations('en-us').then(resolve).catch(reject);
                }
                reject(error);
            });
    });
}

// ========== IMPROVED TRANSLATION APPLICATION ==========

function applyTranslations() {
    if (!translations || Object.keys(translations).length === 0) {
        console.warn('⚠️ No translations available');
        return;
    }

    translateElementsWithDataTranslate();
    translateLegacyElements();
    updateDynamicMenuLabels();
    updateTooltipTranslations();
    updateSearchPlaceholders();
    updateColorSystemHeaders();
}

// ========== NEW UNIFIED SYSTEM WITH data-translate ==========

function translateElementsWithDataTranslate() {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');

    elementsToTranslate.forEach(element => {
        const translateKey = element.getAttribute('data-translate');
        const translateCategory = element.getAttribute('data-translate-category') || 'menu';
        const translateTarget = element.getAttribute('data-translate-target') || 'text';

        if (!translateKey) return;

        if (isDynamicMenuElement(element)) {
            return;
        }

        const translatedText = getTranslation(translateKey, translateCategory);

        switch (translateTarget) {
            case 'text':
                element.textContent = translatedText;
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
                element.textContent = translatedText;
        }
    });
}

// ========== FUNCTION TO DETECT DYNAMIC CONTROL CENTER ELEMENTS ==========

function isDynamicMenuElement(element) {
    const menuLink = element.closest('.menu-link');
    if (menuLink) {
        const toggle = menuLink.getAttribute('data-toggle');
        if (toggle === 'appearance' || toggle === 'language') {
            return true;
        }
    }
    return false;
}

// ========== NEW FUNCTIONS FOR SPECIFIC CATEGORIES ==========

function updateSearchPlaceholders() {
    const colorSearchInput = document.querySelector('.menu-paletteColors .search-content-text input');
    if (colorSearchInput) {
        const placeholderText = getTranslation('search_placeholder', 'search');
        if (placeholderText && placeholderText !== 'search_placeholder') {
            colorSearchInput.placeholder = placeholderText;
        }
    }

    const otherSearchInputs = document.querySelectorAll('.search-content-text input:not(.menu-paletteColors .search-content-text input)');
    otherSearchInputs.forEach(input => {
        const placeholderText = getTranslation('search', 'tooltips') || 'Search...';
        input.placeholder = placeholderText;
    });
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

// ========== MAINTAIN COMPATIBILITY WITH PREVIOUS SYSTEM ==========

function translateLegacyElements() {
    translateHeaderButtons();
    translateSidebarButtons();
    translateSpecificMenuItems();
}

function translateHeaderButtons() {
    const menuButton = document.querySelector('[data-module="toggleSidebarMovile"]');
    if (menuButton && translations.tooltips && translations.tooltips.menu) {
        menuButton.setAttribute('data-translate', 'menu');
        menuButton.setAttribute('data-translate-category', 'tooltips');
        menuButton.setAttribute('data-translate-target', 'tooltip');
    }

    const settingsButton = document.querySelector('[data-module="toggleControlCenter"]');
    if (settingsButton && translations.tooltips && translations.tooltips.settings) {
        settingsButton.setAttribute('data-translate', 'settings');
        settingsButton.setAttribute('data-translate-category', 'tooltips');
        settingsButton.setAttribute('data-translate-target', 'tooltip');
    }
}

function translateSidebarButtons() {
    if (!translations.tooltips) return;

    const sidebarButtons = [
        { selector: '.sidebar-button .material-symbols-rounded', iconName: 'home', key: 'everything' },
        { selector: '.sidebar-button .material-symbols-rounded', iconName: 'alarm', key: 'alarms' },
        { selector: '.sidebar-button .material-symbols-rounded', iconName: 'timer', key: 'timer' },
        { selector: '.sidebar-button .material-symbols-rounded', iconName: 'timelapse', key: 'stopwatch' },
        { selector: '.sidebar-button .material-symbols-rounded', iconName: 'schedule', key: 'world_clock' }
    ];

    sidebarButtons.forEach(button => {
        const elements = document.querySelectorAll(button.selector);
        elements.forEach(element => {
            if (element.textContent.trim() === button.iconName && translations.tooltips[button.key]) {
                const parentButton = element.closest('.sidebar-button');
                if (parentButton) {
                    parentButton.setAttribute('data-translate', button.key);
                    parentButton.setAttribute('data-translate-category', 'tooltips');
                    parentButton.setAttribute('data-translate-target', 'tooltip');
                }
            }
        });
    });
}

function translateSpecificMenuItems() {
    if (!translations.menu) return;

    const specificTranslations = [
        { selector: '.menu-link[data-toggle="settings"] .menu-link-text span', key: 'settings' },
        { selector: '.menu-link .menu-link-text span[data-translate="privacy_policy"]', key: 'privacy_policy' },
        { selector: '.menu-link .menu-link-text span[data-translate="suggest_improvements"]', key: 'suggest_improvements' }
    ];

    specificTranslations.forEach(item => {
        const elements = document.querySelectorAll(item.selector);
        elements.forEach(element => {
            if (translations.menu[item.key] && !isDynamicMenuElement(element)) {
                element.textContent = translations.menu[item.key];
            }
        });
    });
}

// ========== FUNCTIONS FOR IMPROVED DYNAMIC ELEMENTS ==========

function updateDynamicMenuLabels() {
    if (!translations.menu) {
        console.warn('⚠️ Translations not loaded for dynamic menu labels.');
        return;
    }

    updateAppearanceLabel();
    updateLanguageLabel();
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

// ========== TOOLTIP UPDATE ==========

function updateTooltipTranslations() {
    if (typeof window.updateTooltipTextMap === 'function' && translations) {
        window.updateTooltipTextMap(translations);
    }
}

// ========== LANGUAGE CHANGE LISTENER ==========

function setupLanguageChangeListener() {
    document.addEventListener('languageChanged', (e) => {
        if (e.detail && e.detail.language && e.detail.language !== currentLanguage) {
            console.log(`Translations Controller: Language changed event detected to ${e.detail.language}`);
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
            console.log(`Translations Controller: Storage language change detected to ${e.newValue}`);
            setCurrentLanguage(e.newValue)
                .then(() => {
                    document.dispatchEvent(new CustomEvent('translationsApplied', {
                        detail: { language: currentLanguage }
                    }));
                });
        }
    });
}

// ========== PUBLIC FUNCTIONS ==========

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

// ========== SPECIFIC FUNCTIONS FOR NEW CATEGORIES ==========

function getSearchTranslation(key) {
    return getTranslation(key, 'search');
}

function getSearchSectionTranslation(key) {
    return getTranslation(key, 'search_sections');
}

function getColorSystemTranslation(key) {
    return getTranslation(key, 'color_system');
}

// ========== DEBUG FUNCTIONS ==========

function debugTranslationsController() {
    console.group('🌐 Translations Controller Debug');
    console.log('Current language:', currentLanguage);
    console.log('System ready:', isTranslationSystemReady);
    console.log('Available categories:', translations ? Object.keys(translations) : 'None');

    if (translations) {
        Object.keys(translations).forEach(category => {
            console.log(`${category}:`, Object.keys(translations[category]).length, 'translations');
        });
    }

    console.log('Test translations:');
    console.log('- Menu settings:', getTranslation('settings', 'menu'));
    console.log('- Color unavailable:', getTranslation('color_unavailable', 'color_system'));
    console.log('- Search placeholder:', getTranslation('search_placeholder', 'search'));
    console.log('- Harmonies section:', getTranslation('harmonies', 'search_sections'));
    console.log('- Gradient colors section:', getTranslation('gradient_colors', 'color_system'));

    console.groupEnd();
}

// ========== FUNCTIONS FOR EXTERNAL MODULES ==========
window.getTranslation = getTranslation;
window.getCurrentLanguage = getCurrentLanguage;
window.updateDynamicMenuLabels = updateDynamicMenuLabels;
window.getSearchTranslation = getSearchTranslation;
window.getSearchSectionTranslation = getSearchSectionTranslation;
window.getColorSystemTranslation = getColorSystemTranslation;

// ========== EXPORTS ==========

export {
    initTranslationSystem,
    setCurrentLanguage,
    getCurrentLanguage,
    getTranslation,
    getSearchTranslation,
    getSearchSectionTranslation,
    getColorSystemTranslation,
    isSystemReady,
    refreshTranslations,
    updateDynamicMenuLabels,
    applyTranslations,
    translateElementsWithDataTranslate,
    updateSearchPlaceholders,
    updateColorSystemHeaders,
    debugTranslationsController
};