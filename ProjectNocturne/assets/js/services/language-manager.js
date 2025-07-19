import { showSimpleNotification } from '../ui/notification-controller.js';

const SUPPORTED_LANGUAGES = ['en-us', 'es-mx', 'fr-fr'];

const LANGUAGE_DISPLAY_NAMES = {
    'en-us': 'English (US)',
    'es-mx': 'Español (Latinoamérica)',
    'fr-fr': 'Français (France)'
};

const TIMING_CONFIG = {
    LANGUAGE_CHANGE_DURATION: 1000,
    STATE_RESET_DELAY: 200,
    MIN_INTERVAL_BETWEEN_OPERATIONS: 500
};

const languageState = {
    current: 'en-us',
    isChanging: false,
    isSystemReady: false,
    lastStateApplication: 0,
    changeTimeout: null,
    pendingLanguage: null,
    isCancellable: false
};

let getTranslation = null;
let onLanguageChangeCallback = null;

function initLanguageManager() {
    return new Promise((resolve, reject) => {
        try {
            const savedLanguage = localStorage.getItem('app-language');
            if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
                languageState.current = savedLanguage;
                languageState.isSystemReady = true;
                resolve();
            } else {
                detectBrowserLanguage()
                    .then(detectedLanguage => {
                        languageState.current = detectedLanguage;
                        localStorage.setItem('app-language', languageState.current);
                        languageState.isSystemReady = true;
                        resolve();
                    })
                    .catch(() => {
                        languageState.current = 'en-us';
                        localStorage.setItem('app-language', languageState.current);
                        languageState.isSystemReady = true;
                        resolve();
                    });
            }
        } catch (error) {
            reject(error);
        }
    });
}

function detectBrowserLanguage() {
    return new Promise(resolve => {
        try {
            const browserLang = navigator.language || navigator.userLanguage || 'en-US';
            fetch('config/language-detector.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        browserLanguage: browserLang
                    })
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Response not ok');
                })
                .then(data => {
                    const detected = data.detectedLanguage || 'en-us';
                    resolve(SUPPORTED_LANGUAGES.includes(detected) ? detected : 'en-us');
                })
                .catch(() => {
                    showSimpleNotification('error', 'feedback_error_server', 'notifications');
                    const manualDetection = detectLanguageManually(browserLang);
                    resolve(manualDetection);
                });
        } catch (error) {
            resolve('en-us');
        }
    });
}

function detectLanguageManually(browserLang) {
    const langCode = browserLang.toLowerCase();
    if (langCode.startsWith('es')) {
        return 'es-mx';
    } else if (langCode.startsWith('fr')) {
        return 'fr-fr';
    } else {
        return 'en-us';
    }
}

function setLanguage(language) {
    if (languageState.isChanging || language === languageState.current) {
        return Promise.resolve(false);
    }
    const previousLanguage = languageState.current;
    languageState.isChanging = true;
    languageState.pendingLanguage = language;
    languageState.isCancellable = true;
    setupLanguageLoadingUI(language, previousLanguage);
    return performLanguageChange(language)
        .then(() => {
            if (languageState.isChanging && languageState.pendingLanguage === language) {
                if (SUPPORTED_LANGUAGES.includes(language)) {
                    languageState.current = language;
                    localStorage.setItem('app-language', language);
                    completeLanguageChange(language);
                    if (onLanguageChangeCallback && typeof onLanguageChangeCallback === 'function') {
                        onLanguageChangeCallback();
                    }
                    const event = new CustomEvent('languageChanged', {
                        detail: {
                            language: language,
                            previousLanguage: previousLanguage
                        }
                    });
                    document.dispatchEvent(event);
                    return true;
                } else {
                    revertLanguageChange(previousLanguage);
                    return false;
                }
            } else {
                return false;
            }
        })
        .catch(error => {
            revertLanguageChange(previousLanguage);
            return false;
        })
        .finally(() => {
            setTimeout(() => {
                languageState.isChanging = false;
                languageState.pendingLanguage = null;
                languageState.isCancellable = false;
            }, 100);
        });
}

function performLanguageChange(language) {
    return new Promise((resolve, reject) => {
        languageState.changeTimeout = setTimeout(() => {
            if (languageState.isChanging && languageState.pendingLanguage === language) {
                const isValid = validateLanguageChange(language);
                if (!isValid) {
                    reject(new Error('Language validation failed'));
                } else {
                    resolve();
                }
            } else {
                reject(new Error('Language change was cancelled'));
            }
            languageState.changeTimeout = null;
        }, TIMING_CONFIG.LANGUAGE_CHANGE_DURATION);
    });
}

function validateLanguageChange(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        return false;
    }
    try {
        localStorage.setItem('language-test', 'test');
        localStorage.removeItem('language-test');
    } catch (e) {
        return false;
    }
    return true;
}

function setupLanguageLoadingUI(newLanguage, previousLanguage) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        if (linkLanguage === newLanguage) {
            link.classList.remove('active');
            link.classList.add('preview-active');
            addSpinnerToLink(link);
        } else {
            link.classList.remove('active', 'preview-active');
            link.classList.add('disabled-interactive');
        }
    });
}

function completeLanguageChange(language) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        if (linkLanguage === language) {
            link.classList.remove('preview-active', 'disabled-interactive');
            link.classList.add('active');
            removeSpinnerFromLink(link);
        } else {
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
        }
    });
}

function revertLanguageChange(previousLanguage) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        link.classList.remove('preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
        if (linkLanguage === previousLanguage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function addSpinnerToLink(link) {
    removeSpinnerFromLink(link);
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'menu-link-icon menu-link-loader';
    loaderDiv.innerHTML = '<span class="material-symbols-rounded spinning">progress_activity</span>';
    link.appendChild(loaderDiv);
}

function removeSpinnerFromLink(link) {
    const loaderDiv = link.querySelector('.menu-link-loader');
    if (loaderDiv) {
        loaderDiv.remove();
    }
}

function applyLanguageStates() {
    const now = Date.now();
    if (now - languageState.lastStateApplication < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    if (languageState.isChanging) {
        return;
    }
    languageState.lastStateApplication = now;
    try {
        const languageLinks = document.querySelectorAll('.menu-link[data-language]');
        languageLinks.forEach(link => {
            const linkLanguage = link.getAttribute('data-language');
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
            removeSpinnerFromLink(link);
            if (linkLanguage === languageState.current) {
                link.classList.add('active');
            }
        });
    } catch (error) {}
}

function updateLanguageLabel() {
    try {
        const languageLink = document.querySelector('.menu-link[data-toggle="language"] .menu-link-text span');
        if (!languageLink) return;
        if (getTranslation) {
            const languageText = getTranslation('language', 'menu');
            const currentLanguageTranslationKey = getLanguageTranslationKey(languageState.current);
            const currentLanguageText = getTranslation(currentLanguageTranslationKey, 'menu');
            const newText = `${languageText}: ${currentLanguageText}`;
            if (languageLink.textContent !== newText) {
                languageLink.textContent = newText;
            }
        } else {
            const currentLanguageDisplay = LANGUAGE_DISPLAY_NAMES[languageState.current] || languageState.current;
            const newText = 'Language: ' + currentLanguageDisplay;
            if (languageLink.textContent !== newText) {
                languageLink.textContent = newText;
            }
        }
    } catch (error) {}
}

function getLanguageTranslationKey(language) {
    const languageMap = {
        'en-us': 'english_us',
        'es-mx': 'spanish_mx',
        'fr-fr': 'french_fr'
    };
    return languageMap[language] || 'english_us';
}

function setupLanguageEventListeners() {
    document.addEventListener('click', (e) => {
        const languageLink = e.target.closest('.menu-link[data-language]');
        if (languageLink) {
            const language = languageLink.getAttribute('data-language');
            if (language) {
                e.preventDefault();
                setLanguage(language);
            }
        }
    });
}

function cleanLanguageLoadingStates() {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        link.classList.remove('active', 'preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
    });
    setTimeout(() => {
        applyLanguageStates();
    }, 50);
}

function resetLanguageStates() {
    if (languageState.changeTimeout) {
        clearTimeout(languageState.changeTimeout);
        languageState.changeTimeout = null;
    }
    languageState.isChanging = false;
    languageState.pendingLanguage = null;
    languageState.isCancellable = false;
}

function setTranslationFunction(translationFn) {
    getTranslation = translationFn;
    if (languageState.isSystemReady) {
        setTimeout(() => {
            updateLanguageLabel();
        }, 100);
    }
}

function setLanguageChangeCallback(callback) {
    onLanguageChangeCallback = callback;
}

function getCurrentLanguage() {
    return languageState.current;
}

function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES.slice();
}

function getLanguageDisplayNames() {
    return { ...LANGUAGE_DISPLAY_NAMES
    };
}

function isLanguageChanging() {
    return languageState.isChanging;
}

function isLanguageSystemReady() {
    return languageState.isSystemReady;
}

function getLanguageState() {
    return {
        current: languageState.current,
        isChanging: languageState.isChanging,
        isSystemReady: languageState.isSystemReady,
        supportedLanguages: SUPPORTED_LANGUAGES,
        isCancellable: languageState.isCancellable,
        pendingLanguage: languageState.pendingLanguage
    };
}

function debugLanguageManager() {}

export {
    initLanguageManager,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    getLanguageDisplayNames,
    isLanguageChanging,
    isLanguageSystemReady,
    getLanguageState,
    applyLanguageStates,
    updateLanguageLabel,
    cleanLanguageLoadingStates,
    setupLanguageEventListeners,
    setTranslationFunction,
    setLanguageChangeCallback,
    resetLanguageStates,
    detectBrowserLanguage,
    debugLanguageManager
};