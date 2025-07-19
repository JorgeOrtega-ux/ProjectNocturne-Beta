import { initializeMenuForOverlay, resetMenuForOverlay, resetOverlayNavigation } from '../ui/menu-interactions.js';
import { applyLanguageStates, getCurrentLanguage, initLanguageManager, isLanguageChanging, resetLanguageStates, setLanguage, setLanguageChangeCallback, setTranslationFunction as setLanguageTranslationFunction, setupLanguageEventListeners, updateLanguageLabel } from '../services/language-manager.js';
import { applyTheme, applyThemeStates, getCurrentTheme, initThemeManager, isThemeChanging, resetThemeStates, setThemeChangeCallback, setTranslationFunction as setThemeTranslationFunction, setupThemeEventListeners, updateThemeLabel } from '../services/theme-manager.js';
import { isLocationChanging, cleanLocationChangeStates } from '../services/location-manager.js';

const TIMING_CONFIG = {
    MIN_INTERVAL_BETWEEN_OPERATIONS: 500,
    MOBILE_ANIMATION_DURATION: 300,
    STATE_RESET_DELAY: 200,
    MIN_VISIBILITY_CHECK_INTERVAL: 2000
};

const MODULE_TYPES = {
    CONTROL_CENTER: 'controlCenter',
    OVERLAY: 'overlay'
};

const MODULE_CONFIG = {
    controlCenter: {
        type: MODULE_TYPES.CONTROL_CENTER,
        defaultMenu: 'control_center',
        selectors: {
            toggle: '[data-module="toggleControlCenter"]',
            module: '.module-control-center'
        }
    },
    overlayContainer: {
        type: MODULE_TYPES.OVERLAY,
        selectors: {
            toggle: null,
            module: '.module-overlay'
        }
    }
};

const CONTROL_CENTER_MENUS = {
    'control_center': 'control_center',
    'appearance': 'appearance',
    'language': 'language',
    'settings': 'settings',
    'location': 'location',
    'help_and_resources': 'help_and_resources'
};

const INDEPENDENT_OVERLAYS = {
    'menuAlarm': '[data-menu="alarm"]',
    'menuTimer': '[data-menu="timer"]',
    'menuWorldClock': '[data-menu="worldClock"]',
    'menuPaletteColors': '[data-menu="paletteColors"]',
    'menuSounds': '[data-menu="sounds"]',
    'menuDelete': '[data-menu="delete"]',
    'menuFeedback': '[data-menu="feedback"]',
    'menuFeedbackTypes': '[data-menu="feedbackTypes"]',
    'menuNotifications': '[data-menu="notifications"]'
    // Se eliminó 'menuRingingList'
};

const TOGGLE_TO_MODULE_MAP = {
    'toggleControlCenter': 'controlCenter',
    'toggleMenuAlarm': 'overlayContainer',
    'toggleMenuTimer': 'overlayContainer',
    'toggleMenuWorldClock': 'overlayContainer',
    'togglePaletteColors': 'overlayContainer',
    'toggleSoundsMenu': 'overlayContainer',
    'toggleDeleteMenu': 'overlayContainer',
    'toggleFeedbackMenu': 'overlayContainer',
    'toggleFeedbackTypesMenu': 'overlayContainer',
    'toggleNotifications': 'overlayContainer'
};

const moduleState = {
    modules: {
        controlCenter: {
            active: false,
            type: MODULE_TYPES.CONTROL_CENTER,
            currentMenu: 'control_center'
        },
        overlayContainer: {
            active: false,
            type: MODULE_TYPES.OVERLAY,
            currentOverlay: null
        }
    },
    isModuleChanging: false,
    isApplyingStates: false,
    isUpdatingLabels: false,
    isSystemReady: false,
    initializationComplete: false,
    lastStateApplication: 0,
    lastLabelUpdate: 0
};

const domCache = {
    controlCenter: {
        toggle: null,
        module: null
    },
    overlayContainer: {
        module: null
    },
    overlays: {}
};

function dispatchModuleEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
        detail: {
            ...detail,
            timestamp: Date.now()
        }
    });
    document.dispatchEvent(event);
}

function cancelAllActiveProcesses(reason = 'unknown') {
    let processesCancelled = false;
    if (isThemeChanging()) {
        cleanThemeChangeStates();
        processesCancelled = true;
    }
    if (isLanguageChanging()) {
        cleanLanguageChangeStates();
        processesCancelled = true;
    }
    if (isLocationChanging()) {
        cleanLocationChangeStates();
        processesCancelled = true;
    }
    return processesCancelled;
}

function cleanThemeChangeStates() {
    resetThemeStates();
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    const currentTheme = getCurrentTheme();
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        link.classList.remove('preview-active', 'disabled-interactive');
        const loaderDiv = link.querySelector('.menu-link-loader');
        if (loaderDiv) {
            loaderDiv.remove();
        }
        if (linkTheme === currentTheme) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function cleanLanguageChangeStates() {
    resetLanguageStates();
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    const currentLanguage = getCurrentLanguage();
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        link.classList.remove('preview-active', 'disabled-interactive');
        const loaderDiv = link.querySelector('.menu-link-loader');
        if (loaderDiv) {
            loaderDiv.remove();
        }
        if (linkLanguage === currentLanguage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function cancelActiveProcessesOnModuleClose(moduleName) {
    return cancelAllActiveProcesses(`module-close:${moduleName}`);
}

function initModuleManager() {
    return new Promise((resolve, reject) => {
        if (moduleState.initializationComplete) {
            resolve();
            return;
        }
        Promise.all([
            initThemeManager(),
            initLanguageManager(),
            initializeDOMReferences(),
            initializeEventListeners()
        ])
            .then(() => {
                setupCallbacks();
                moduleState.isSystemReady = true;
                moduleState.initializationComplete = true;
                setTimeout(() => {
                    applyInitialStates();
                }, 100);
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
}

function setupCallbacks() {
    setThemeChangeCallback(() => {
        if (!moduleState.isUpdatingLabels) {
            updateMenuLabels();
        }
    });
    setLanguageChangeCallback(() => {
        if (!moduleState.isUpdatingLabels) {
            updateMenuLabels();
        }
    });
}

function initializeDOMReferences() {
    return new Promise(resolve => {
        for (const moduleName in MODULE_CONFIG) {
            const config = MODULE_CONFIG[moduleName];
            if (config.selectors.toggle) {
                domCache[moduleName].toggle = document.querySelector(config.selectors.toggle);
            }
            if (config.selectors.module) {
                domCache[moduleName].module = document.querySelector(config.selectors.module);
            }
        }
        Object.keys(INDEPENDENT_OVERLAYS).forEach(overlayName => {
            domCache.overlays[overlayName] = document.querySelector(INDEPENDENT_OVERLAYS[overlayName]);
        });
        resolve();
    });
}

function initializeEventListeners() {
    return new Promise(resolve => {
        setupModuleEvents();
        setupThemeEventListeners();
        setupLanguageEventListeners();
        setupGlobalEvents();
        resolve();
    });
}

function activateModule(moduleName, options = {}) {
    const normalizedName = normalizeModuleName(moduleName);
    const config = MODULE_CONFIG[normalizedName];
    if (!config || moduleState.isModuleChanging) {
        return;
    }

    const previouslyActiveModule = getActiveModule();
    const isSameModuleContainer = previouslyActiveModule === normalizedName;

    moduleState.isModuleChanging = true;

    if (!isSameModuleContainer) {
        deactivateAllModules({ source: 'new-module-activation' });
    }

    const moduleElement = getModuleElementByName(normalizedName);
    if (moduleElement) {
        if (!isSameModuleContainer) {
            moduleElement.classList.remove('disabled');
            moduleElement.classList.add('active');
            moduleState.modules[normalizedName].active = true;
        }

        if (config.type === MODULE_TYPES.CONTROL_CENTER) {
            showControlCenterMenu(moduleState.modules.controlCenter.currentMenu);
        } else if (config.type === MODULE_TYPES.OVERLAY) {
            activateOverlayContainer(moduleName, options);
        }
    }

    dispatchModuleEvent('moduleActivated', { module: moduleName });
    setTimeout(() => {
        logModuleStates();
        moduleState.isModuleChanging = false;
    }, 50);
}

function deactivateModule(moduleName, options = {}) {
    const normalizedName = normalizeModuleName(moduleName);
    if (!MODULE_CONFIG[normalizedName] || !moduleState.modules[normalizedName]?.active) {
        return;
    }
    const { source = 'unknown', withMobileAnimation = false } = options;
    cancelActiveProcessesOnModuleClose(normalizedName);
    if (withMobileAnimation && window.innerWidth <= 468) {
        deactivateModuleWithAnimation(normalizedName, source);
    } else {
        performStandardDeactivation(normalizedName, source);
    }
}

function toggleModule(moduleName, options = {}) {
    const normalizedName = normalizeModuleName(moduleName);
    if (!MODULE_CONFIG[normalizedName]) {
        return;
    }
    const isActive = moduleState.modules[normalizedName]?.active || false;
    if (isActive) {
        const overlayContainer = domCache.overlayContainer.module;
        const currentToggle = getToggleFromOverlay(moduleState.modules.overlayContainer.currentOverlay);
        if (normalizedName === 'overlayContainer' && currentToggle !== moduleName) {
            activateModule(moduleName, options);
        } else {
            deactivateModule(normalizedName);
        }
    } else {
        activateModule(moduleName, options);
    }
}

function deactivateAllModules(options = {}) {
    const { source = 'unknown' } = options;
    cancelAllActiveProcesses(`deactivateAll due to ${source}`);
    Object.keys(moduleState.modules).forEach(moduleName => {
        if (moduleState.modules[moduleName].active) {
            performModuleDeactivation(moduleName);
        }
    });
}

function activateControlCenter() {
    const controlCenterModule = domCache.controlCenter.module;
    if (controlCenterModule) {
        controlCenterModule.classList.remove('disabled');
        controlCenterModule.classList.add('active');
        moduleState.modules.controlCenter.active = true;
        showControlCenterMenu(moduleState.modules.controlCenter.currentMenu);
    }
}

function activateOverlayContainer(originalToggleName, options = {}) {
    const overlayContainer = domCache.overlayContainer.module;
    if (overlayContainer) {
        overlayContainer.classList.remove('disabled');
        overlayContainer.classList.add('active');
        moduleState.modules.overlayContainer.active = true;

        const overlayToShow = getOverlayFromToggle(originalToggleName);
        const currentOverlay = moduleState.modules.overlayContainer.currentOverlay;

        if (currentOverlay && currentOverlay !== overlayToShow) {
            const currentOverlayElement = domCache.overlays[currentOverlay];
            if (currentOverlayElement) {
                currentOverlayElement.classList.remove('active');
                currentOverlayElement.classList.add('disabled');
            }
            resetMenuForOverlay(currentOverlay);
        }

        if (overlayToShow) {
            showSpecificOverlay(overlayToShow);
            moduleState.modules.overlayContainer.currentOverlay = overlayToShow;
            initializeMenuForOverlay(overlayToShow, options);
        }
    }
}
function deactivateModuleWithAnimation(moduleName, source) {
    if (moduleState.isModuleChanging) return;
    moduleState.isModuleChanging = true;
    let activeMenu = null;
    if (moduleName === 'controlCenter') {
        const controlCenterModule = domCache.controlCenter.module;
        activeMenu = controlCenterModule?.querySelector('.menu-control-center.active');
   } else if (moduleName === 'overlayContainer') {
        const overlayContainer = domCache.overlayContainer.module;
        if (overlayContainer) {
          activeMenu = overlayContainer.querySelector('.menu-component.active');
        }
    }
    if (activeMenu) {
        performMobileCloseAnimation(activeMenu, () => {
            performModuleDeactivation(moduleName);
            logModuleStates();
        });
    } else {
        performModuleDeactivation(moduleName);
        logModuleStates();
        moduleState.isModuleChanging = false;
    }
}

function performStandardDeactivation(moduleName, source) {
    if (!moduleState.isModuleChanging) {
        moduleState.isModuleChanging = true;
        performModuleDeactivation(moduleName);
        logModuleStates();
        setTimeout(() => {
            moduleState.isModuleChanging = false;
        }, 50);
    }
}

function performModuleDeactivation(moduleName) {
    let deactivatedToggle = null;
    const module = moduleState.modules[moduleName];
    const moduleElement = getModuleElementByName(moduleName);

    if (moduleElement) {
        moduleElement.classList.remove('active');
        moduleElement.classList.add('disabled');
        module.active = false;

        if (module.type === MODULE_TYPES.CONTROL_CENTER) {
            deactivatedToggle = 'toggleControlCenter';
            resetControlCenterToDefaultMenu();
        } else if (module.type === MODULE_TYPES.OVERLAY) {
            const overlayToReset = module.currentOverlay;
            deactivatedToggle = getToggleFromOverlay(overlayToReset);

            hideAllOverlays(moduleElement);
            module.currentOverlay = null;
            if (overlayToReset) {
                const menuElement = document.querySelector(INDEPENDENT_OVERLAYS[overlayToReset]);
                if (menuElement) {
                    resetMenuForOverlay(overlayToReset);
                }
            }
            if (typeof resetOverlayNavigation === 'function') {
                resetOverlayNavigation();
            }
        }
    }

    if (deactivatedToggle) {
        dispatchModuleEvent('moduleDeactivated', { module: deactivatedToggle });
    }
}

function showControlCenterMenu(menuName) {
    const controlCenter = domCache.controlCenter.module;
    if (!controlCenter) return;
    const allMenuContainers = controlCenter.querySelectorAll('.menu-control-center[data-menu]');
    allMenuContainers.forEach(menu => {
        menu.classList.remove('active');
        menu.classList.add('disabled');
    });
    const targetMenuContainer = controlCenter.querySelector(`.menu-control-center[data-menu="${menuName}"]`);
    if (targetMenuContainer) {
        targetMenuContainer.classList.remove('disabled');
        targetMenuContainer.classList.add('active');
        moduleState.modules.controlCenter.currentMenu = menuName;
    }
}

function resetControlCenterToDefaultMenu() {
    const defaultMenu = MODULE_CONFIG.controlCenter.defaultMenu;
    if (defaultMenu) {
        showControlCenterMenu(defaultMenu);
    }
}

function showSpecificOverlay(overlayName) {
    hideAllOverlays(domCache.overlayContainer.module);

    const overlayElement = domCache.overlays[overlayName];
    if (overlayElement) {
        overlayElement.classList.remove('disabled');
        overlayElement.classList.add('active');
    }
}

function hideAllOverlays(container) {
    if (!container) return;
    const overlays = container.querySelectorAll('[data-menu]');
    overlays.forEach(overlay => {
        overlay.classList.remove('active');
        overlay.classList.add('disabled');
    });
}

function normalizeModuleName(moduleName) {
    if (TOGGLE_TO_MODULE_MAP[moduleName]) {
        return TOGGLE_TO_MODULE_MAP[moduleName];
    }
    if (moduleName.startsWith('toggleMenu') || moduleName === 'togglePaletteColors' || moduleName === 'toggleSoundsMenu' || moduleName === 'toggleNotifications') {
        return 'overlayContainer';
    }
    return moduleName;
}

function getOverlayFromToggle(toggleName) {
    const toggleToOverlayMap = {
        'toggleMenuAlarm': 'menuAlarm',
        'toggleMenuTimer': 'menuTimer',
        'toggleMenuWorldClock': 'menuWorldClock',
        'togglePaletteColors': 'menuPaletteColors',
        'toggleSoundsMenu': 'menuSounds',
        'toggleDeleteMenu': 'menuDelete',
        'toggleFeedbackMenu': 'menuFeedback',
        'toggleFeedbackTypesMenu': 'menuFeedbackTypes',
        'toggleNotifications': 'menuNotifications'
    };
    return toggleToOverlayMap[toggleName] || null;
}

function getToggleFromOverlay(overlayName) {
    const overlayToToggleMap = {
        'menuAlarm': 'toggleMenuAlarm',
        'menuTimer': 'toggleMenuTimer',
        'menuWorldClock': 'toggleMenuWorldClock',
        'menuPaletteColors': 'togglePaletteColors',
        'menuSounds': 'toggleSoundsMenu',
        'menuDelete': 'toggleDeleteMenu',
        'menuFeedback': 'toggleFeedbackMenu',
        'menuFeedbackTypes': 'toggleFeedbackTypesMenu',
        'menuNotifications': 'toggleNotifications'
    };
    return overlayToToggleMap[overlayName] || null;
}

function performMobileCloseAnimation(element, callback) {
    element.classList.add('closing', 'slide-out-mobile');
    const onAnimationEnd = () => {
        callback();
        resetMobileMenuStyles(element);
    };
    element.addEventListener('transitionend', onAnimationEnd, { once: true });
}

function resetMobileMenuStyles(element) {
    if (element) {
        element.classList.remove('closing', 'dragging', 'slide-out-mobile');
        element.removeAttribute('style');
    }
    setTimeout(() => {
        moduleState.isModuleChanging = false;
    }, 50);
}

function hasStateInconsistencies() {
    const inconsistencies = [];
    try {
        const moduleInconsistencies = checkModuleStateConsistency();
        if (moduleInconsistencies.length > 0) {
            inconsistencies.push(...moduleInconsistencies);
        }
        const themeInconsistency = checkThemeConsistency();
        if (themeInconsistency) {
            inconsistencies.push(themeInconsistency);
        }
        const languageInconsistency = checkLanguageConsistency();
        if (languageInconsistency) {
            inconsistencies.push(languageInconsistency);
        }
        if (inconsistencies.length > 0) {
            return true;
        }
        return false;
    } catch (error) {
        return true;
    }
}

function checkModuleStateConsistency() {
    const inconsistencies = [];
    Object.keys(moduleState.modules).forEach(moduleName => {
        const moduleInfo = moduleState.modules[moduleName];
        const moduleElement = getModuleElementByName(moduleName);
        if (moduleElement) {
            const hasActiveClass = moduleElement.classList.contains('active');
            if (moduleInfo.active && !hasActiveClass) {
                inconsistencies.push(`${moduleName}: state active but missing CSS class`);
            }
            if (!moduleInfo.active && hasActiveClass) {
                inconsistencies.push(`${moduleName}: state inactive but has active CSS class`);
            }
        } else if (moduleInfo.active) {
            inconsistencies.push(`${moduleName}: marked active but DOM element missing`);
        }
    });
    return inconsistencies;
}

function checkThemeConsistency() {
    try {
        const currentTheme = getCurrentTheme();
        const htmlElement = document.documentElement;
        switch (currentTheme) {
            case 'dark':
                if (!htmlElement.classList.contains('dark-mode')) {
                    return 'Theme dark but missing dark-mode class';
                }
                break;
            case 'light':
                if (!htmlElement.classList.contains('light-mode')) {
                    return 'Theme light but missing light-mode class';
                }
                break;
            case 'system':
                const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
                const expectedClass = prefersDark ? 'dark-mode' : 'light-mode';
                if (!htmlElement.classList.contains(expectedClass)) {
                    return `Theme system but missing ${expectedClass} class`;
                }
                break;
        }
        const activeThemeLinks = document.querySelectorAll('.menu-link[data-theme].active');
        if (activeThemeLinks.length !== 1) {
            return 'Theme menu links inconsistent';
        }
    } catch (error) {
        return `Theme check error: ${error.message}`;
    }
    return null;
}

function checkLanguageConsistency() {
    try {
        const currentLang = getCurrentLanguage();
        const storedLanguage = localStorage.getItem('app-language');
        if (storedLanguage !== currentLang) {
            return 'Language state vs localStorage mismatch';
        }
        const activeLanguageLinks = document.querySelectorAll('.menu-link[data-language].active');
        if (activeLanguageLinks.length !== 1) {
            return 'Language menu links inconsistent';
        }
    } catch (error) {
        return `Language check error: ${error.message}`;
    }
    return null;
}

function getModuleElementByName(moduleName) {
    if (domCache[moduleName] && domCache[moduleName].module) {
        return domCache[moduleName].module;
    }
    return null;
}


function applyInitialStates() {
    const now = Date.now();
    if (now - moduleState.lastStateApplication < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    if (moduleState.isApplyingStates || isThemeChanging() ||
        isLanguageChanging() || moduleState.isUpdatingLabels) {
        return;
    }
    moduleState.isApplyingStates = true;
    moduleState.lastStateApplication = now;
    try {
        applyThemeStates();
        applyLanguageStates();
    } catch (error) {
    } finally {
        setTimeout(() => {
            moduleState.isApplyingStates = false;
        }, TIMING_CONFIG.STATE_RESET_DELAY);
    }
}

function updateMenuLabels() {
    const now = Date.now();
    if (now - moduleState.lastLabelUpdate < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    if (moduleState.isUpdatingLabels || isThemeChanging() ||
        isLanguageChanging() || moduleState.isApplyingStates) {
        return;
    }
    moduleState.isUpdatingLabels = true;
    moduleState.lastLabelUpdate = now;
    try {
        updateThemeLabel();
        updateLanguageLabel();
    } catch (error) {
    } finally {
        setTimeout(() => {
            moduleState.isUpdatingLabels = false;
        }, TIMING_CONFIG.STATE_RESET_DELAY);
    }
}

function setupModuleEvents() {
    document.body.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-module]');
        if (toggle) {
            const moduleName = toggle.dataset.module;
            if (TOGGLE_TO_MODULE_MAP[moduleName]) {
                e.preventDefault();
                const context = toggle.dataset.context;
                toggleModule(moduleName, { context });
            }
        }
    });

    setupControlCenterInternalEvents();
}

function setupControlCenterInternalEvents() {
    const controlCenterModule = domCache.controlCenter.module;
    if (!controlCenterModule) return;
    controlCenterModule.addEventListener('click', (e) => {
        const menuLink = e.target.closest('.menu-link');
        if (!menuLink) return;
        const targetMenu = menuLink.getAttribute('data-toggle');
        if (targetMenu && CONTROL_CENTER_MENUS[targetMenu]) {
            e.preventDefault();
            showControlCenterMenu(targetMenu);
        }
        const themeAttribute = menuLink.getAttribute('data-theme');
        if (themeAttribute) {
            e.preventDefault();
            applyTheme(themeAttribute);
        }
        const languageAttribute = menuLink.getAttribute('data-language');
        if (languageAttribute) {
            e.preventDefault();
            setLanguage(languageAttribute);
        }
    });
}

function setupGlobalEvents() {
    document.addEventListener('click', (e) => {
        if (moduleState.isModuleChanging) return;
        if (window.innerWidth > 468) {
            handleDesktopOutsideClick(e);
        }
    });
    document.addEventListener('keydown', (e) => {
        if (moduleState.isModuleChanging) return;
        if (e.key === 'Escape') {
            handleEscapeKey();
        }
    });
    setupVisibilityAndMenuEvents();
}

function handleDesktopOutsideClick(e) {
    const activeModules = Object.keys(moduleState.modules).filter(name => moduleState.modules[name].active);
    if (activeModules.length === 0) return;

    activeModules.forEach(moduleName => {
        const moduleElement = getModuleElementByName(moduleName);
        const toggleElement = domCache[moduleName]?.toggle;

        const isClickOutsideModule = moduleElement && !moduleElement.contains(e.target);
        const isClickOutsideToggle = toggleElement && !toggleElement.contains(e.target);

        let isClickInAnotherToggle = false;
        if (moduleName === 'overlayContainer') {
            isClickInAnotherToggle = e.target.closest('[data-module^="toggleMenu"], [data-module="togglePaletteColors"], [data-module="toggleSoundsMenu"]');
        }

        if (isClickOutsideModule && (isClickOutsideToggle || !toggleElement) && !isClickInAnotherToggle) {
             deactivateModule(moduleName, { source: 'desktop-outside-click' });
        }
    });
}


function setupVisibilityAndMenuEvents() {
    let lastVisibilityCheck = 0;
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && moduleState.isSystemReady && moduleState.initializationComplete) {
            const now = Date.now();
            if (now - lastVisibilityCheck < TIMING_CONFIG.MIN_VISIBILITY_CHECK_INTERVAL) {
                return;
            }
            lastVisibilityCheck = now;
            setTimeout(() => {
                forceUpdateStates();
            }, 1000);
        }
    });
    document.addEventListener('click', (e) => {
        const menuLink = e.target.closest('.menu-link[data-toggle]');
        if (menuLink && moduleState.isSystemReady && moduleState.initializationComplete) {
            setTimeout(() => {
                if (!moduleState.isApplyingStates && !isThemeChanging() &&
                    !isLanguageChanging()) {
                    applyInitialStates();
                }
            }, 300);
        }
    });
}

function getActiveModule() {
    return Object.keys(moduleState.modules).find(name => moduleState.modules[name].active) || null;
}

function isModuleActive(moduleName) {
    const normalizedName = normalizeModuleName(moduleName);
    return moduleState.modules[normalizedName]?.active || false;
}

function isAnyModuleActive() {
    return Object.values(moduleState.modules).some(module => module.active);
}

function forceUpdateStates() {
    if (!moduleState.isSystemReady || !moduleState.initializationComplete) {
        return;
    }
    if (!moduleState.isApplyingStates && !isThemeChanging() &&
        !isLanguageChanging() && !moduleState.isUpdatingLabels) {
        if (hasStateInconsistencies()) {
            applyInitialStates();
        }
    }
}

function isModuleCurrentlyChanging() {
    const controlCenterModule = domCache.controlCenter.module;
    const overlayContainer = domCache.overlayContainer.module;
    const isControlCenterBusy = controlCenterModule?.classList.contains('closing') ||
        controlCenterModule?.querySelector('.menu-control-center.closing') || false;
    const isOverlayBusy = overlayContainer?.classList.contains('closing') ||
        overlayContainer?.querySelector('.menu-component.closing') || false;
    return moduleState.isModuleChanging || isControlCenterBusy || isOverlayBusy;
}

function isLoading() {
    return isThemeChanging() || isLanguageChanging() ||
        moduleState.isApplyingStates || moduleState.isUpdatingLabels;
}

function resetModuleChangeFlag() {
    moduleState.isModuleChanging = false;
}

function setTranslationFunction(translationFn) {
    getTranslation = translationFn;
    setThemeTranslationFunction(translationFn);
    setLanguageTranslationFunction(translationFn);
    if (moduleState.isSystemReady && !moduleState.isUpdatingLabels) {
        setTimeout(() => {
            updateMenuLabels();
        }, 100);
    }
}

function logModuleStates() {
}

function debugModuleState() {
}

function debugStateConsistency() {
}

function isReady() {
    return moduleState.isSystemReady && moduleState.initializationComplete;
}

function getModuleStates() {
    const states = {};
    Object.keys(moduleState.modules).forEach(name => {
        states[name] = moduleState.modules[name].active;
    });
    return states;
}

function cancelActiveProcesses(reason = 'manual') {
    return cancelAllActiveProcesses(reason);
}

function isAnyProcessActive() {
    return isThemeChanging() || isLanguageChanging();
}

function handleEscapeKey() {
    if (isAnyProcessActive()) {
        cancelAllActiveProcesses('escape-key');
        return;
    }
    const activeModule = getActiveModule();
    if (activeModule) {
        deactivateModule(activeModule, { source: 'escape-key' });
    }
}

export {
    activateModule, applyInitialStates, applyLanguageStates, applyTheme, applyThemeStates,
    cancelActiveProcesses, cancelAllActiveProcesses, checkLanguageConsistency, checkModuleStateConsistency,
    checkThemeConsistency, debugModuleState, debugStateConsistency, deactivateAllModules,
    deactivateModule, forceUpdateStates, getActiveModule, getCurrentLanguage, getCurrentTheme,
    getModuleStates, handleEscapeKey, hasStateInconsistencies, initModuleManager, isAnyModuleActive,
    isAnyProcessActive, isLoading, isModuleActive, isModuleCurrentlyChanging, isReady, logModuleStates,
    resetModuleChangeFlag, setLanguage, setTranslationFunction, showControlCenterMenu,
    showSpecificOverlay, toggleModule, updateMenuLabels
};