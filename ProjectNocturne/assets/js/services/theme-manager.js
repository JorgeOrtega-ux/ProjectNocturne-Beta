const SUPPORTED_THEMES = ['system', 'dark', 'light'];

const THEME_DISPLAY_NAMES = {
    'system': 'Sync with System',
    'dark': 'Dark Theme',
    'light': 'Light Theme'
};

const TIMING_CONFIG = {
    THEME_CHANGE_DURATION: 1000,
    STATE_RESET_DELAY: 200,
    MIN_INTERVAL_BETWEEN_OPERATIONS: 500
};

const themeState = {
    current: 'system',
    isChanging: false,
    isSystemReady: false,
    lastStateApplication: 0,
    changeTimeout: null,
    pendingTheme: null,
    isCancellable: false
};

let getTranslation = null;
let onThemeChangeCallback = null;

function initThemeManager() {
    return new Promise((resolve, reject) => {
        try {
            const savedTheme = localStorage.getItem('app-theme');
            if (savedTheme && SUPPORTED_THEMES.includes(savedTheme)) {
                themeState.current = savedTheme;
            } else {
                themeState.current = 'system';
                localStorage.setItem('app-theme', themeState.current);
            }
            applyThemeClass(themeState.current);
            setupSystemThemeListener();
            themeState.isSystemReady = true;
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function applyTheme(theme) {
    if (themeState.isChanging || theme === themeState.current) {
        return Promise.resolve(false);
    }
    const previousTheme = themeState.current;
    themeState.isChanging = true;
    themeState.pendingTheme = theme;
    themeState.isCancellable = true;
    setupThemeLoadingUI(theme, previousTheme);
    return performThemeChange(theme)
        .then(() => {
            if (themeState.isChanging && themeState.pendingTheme === theme) {
                applyThemeClass(theme);
                themeState.current = theme;
                localStorage.setItem('app-theme', theme);
                completeThemeChange(theme);
                if (onThemeChangeCallback && typeof onThemeChangeCallback === 'function') {
                    onThemeChangeCallback();
                }
                const event = new CustomEvent('themeChanged', {
                    detail: { theme: theme, previousTheme: previousTheme }
                });
                document.dispatchEvent(event);
                return true;
            } else {
                return false;
            }
        })
        .catch(error => {
            revertThemeChange(previousTheme);
            return false;
        })
        .finally(() => {
            setTimeout(() => {
                themeState.isChanging = false;
                themeState.pendingTheme = null;
                themeState.isCancellable = false;
            }, 100);
        });
}

function performThemeChange(theme) {
    return new Promise((resolve, reject) => {
        themeState.changeTimeout = setTimeout(() => {
            if (themeState.isChanging && themeState.pendingTheme === theme) {
                const isValid = validateThemeChange(theme);
                if (!isValid) {
                    reject(new Error('Theme validation failed'));
                } else {
                    resolve();
                }
            } else {
                reject(new Error('Theme change was cancelled'));
            }
            themeState.changeTimeout = null;
        }, TIMING_CONFIG.THEME_CHANGE_DURATION);
    });
}

function applyThemeClass(theme) {
    const html = document.documentElement;
    html.classList.remove('dark-mode', 'light-mode');
    switch (theme) {
        case 'dark':
            html.classList.add('dark-mode');
            break;
        case 'light':
            html.classList.add('light-mode');
            break;
        case 'system':
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark-mode');
            } else {
                html.classList.add('light-mode');
            }
            break;
    }
}

function validateThemeChange(theme) {
    if (!SUPPORTED_THEMES.includes(theme)) {
        return false;
    }
    try {
        localStorage.setItem('theme-test', 'test');
        localStorage.removeItem('theme-test');
    } catch (e) {
        return false;
    }
    return true;
}

function setupThemeLoadingUI(newTheme, previousTheme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        if (linkTheme === newTheme) {
            link.classList.remove('active');
            link.classList.add('preview-active');
            addSpinnerToLink(link);
        } else {
            link.classList.remove('active', 'preview-active');
            link.classList.add('disabled-interactive');
        }
    });
}

function completeThemeChange(theme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        if (linkTheme === theme) {
            link.classList.remove('preview-active', 'disabled-interactive');
            link.classList.add('active');
            removeSpinnerFromLink(link);
        } else {
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
        }
    });
}

function revertThemeChange(previousTheme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        link.classList.remove('preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
        if (linkTheme === previousTheme) {
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

function applyThemeStates() {
    const now = Date.now();
    if (now - themeState.lastStateApplication < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    if (themeState.isChanging) {
        return;
    }
    themeState.lastStateApplication = now;
    try {
        const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
        themeLinks.forEach(link => {
            const linkTheme = link.getAttribute('data-theme');
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
            removeSpinnerFromLink(link);
            if (linkTheme === themeState.current) {
                link.classList.add('active');
            }
        });
    } catch (error) {
    }
}

function updateThemeLabel() {
    try {
        const appearanceLink = document.querySelector('.menu-link[data-toggle="appearance"] .menu-link-text span');
        if (!appearanceLink) return;
        if (getTranslation) {
            const appearanceText = getTranslation('appearance', 'menu');
            const currentThemeTranslationKey = getThemeTranslationKey(themeState.current);
            const currentThemeText = getTranslation(currentThemeTranslationKey, 'menu');
            const newText = `${appearanceText}: ${currentThemeText}`;
            if (appearanceLink.textContent !== newText) {
                appearanceLink.textContent = newText;
            }
        } else {
            const currentThemeDisplay = THEME_DISPLAY_NAMES[themeState.current] || themeState.current;
            const newText = 'Appearance: ' + currentThemeDisplay;
            if (appearanceLink.textContent !== newText) {
                appearanceLink.textContent = newText;
            }
        }
    } catch (error) {
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

function setupSystemThemeListener() {
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (themeState.current === 'system' && !themeState.isChanging) {
                applyThemeClass('system');
                setTimeout(() => {
                    if (onThemeChangeCallback && typeof onThemeChangeCallback === 'function') {
                        onThemeChangeCallback();
                    }
                }, 100);
            }
        });
    }
}

function setupThemeEventListeners() {
    document.addEventListener('click', (e) => {
        const themeLink = e.target.closest('.menu-link[data-theme]');
        if (themeLink) {
            const theme = themeLink.getAttribute('data-theme');
            if (theme) {
                e.preventDefault();
                applyTheme(theme);
            }
        }
    });
}

function cleanThemeLoadingStates() {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        link.classList.remove('active', 'preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
    });
    setTimeout(() => {
        applyThemeStates();
    }, 50);
}

function resetThemeStates() {
    if (themeState.changeTimeout) {
        clearTimeout(themeState.changeTimeout);
        themeState.changeTimeout = null;
    }
    themeState.isChanging = false;
    themeState.pendingTheme = null;
    themeState.isCancellable = false;
}

function setTranslationFunction(translationFn) {
    getTranslation = translationFn;
    if (themeState.isSystemReady) {
        setTimeout(() => {
            updateThemeLabel();
        }, 100);
    }
}

function setThemeChangeCallback(callback) {
    onThemeChangeCallback = callback;
}

function getCurrentTheme() {
    return themeState.current;
}

function getSupportedThemes() {
    return SUPPORTED_THEMES.slice();
}

function getThemeDisplayNames() {
    return { ...THEME_DISPLAY_NAMES };
}

function isThemeChanging() {
    return themeState.isChanging;
}

function isThemeSystemReady() {
    return themeState.isSystemReady;
}

function getThemeState() {
    return {
        current: themeState.current,
        isChanging: themeState.isChanging,
        isSystemReady: themeState.isSystemReady,
        supportedThemes: SUPPORTED_THEMES,
        isCancellable: themeState.isCancellable,
        pendingTheme: themeState.pendingTheme
    };
}

function debugThemeManager() {
}

export {
    applyTheme, applyThemeStates, cleanThemeLoadingStates, debugThemeManager, getCurrentTheme,
    getSupportedThemes, getThemeDisplayNames, getThemeState, initThemeManager, isThemeChanging,
    isThemeSystemReady, resetThemeStates, setThemeChangeCallback, setTranslationFunction,
    setupThemeEventListeners, updateThemeLabel
};