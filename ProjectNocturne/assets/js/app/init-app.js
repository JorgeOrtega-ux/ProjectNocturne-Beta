import { resetLocationSearch, initLocationManager } from '../services/location-manager.js';
import { initializeEverything } from '../features/everything-controller.js';
import { initDB, initializeCardEventListeners, initializeCategorySliderService, initializeCentralizedFontManager, initializeFullScreenManager, initializeScrollShadow, startAudioCachePreload } from '../features/general-tools.js';
import { applyCollapsedSectionsState, initColorTextSystem, refreshColorSystem, setupCollapsibleSectionEvents } from '../ui/palette-colors.js';
import { initializeZoneInfoTool } from '../services/zoneinfo-controller.js';
import { initMobileDragController } from '../ui/drag-controller.js';
import { activateModule, initControlCenter, initSidebarMobile, initSidebarSections } from '../app/main.js';
import { applyInitialStates as applyModuleManagerInitialStates, getCurrentLanguage as getModuleManagerCurrentLanguage, getCurrentTheme as getModuleManagerCurrentTheme, initModuleManager, isLoading as isModuleManagerLoading, setTranslationFunction as setModuleManagerTranslationFunction, updateMenuLabels } from '../core/module-manager.js';
import { batchMigrateTooltips, initializeMobileSidebarTooltips, initializeTooltipSystem, refreshTooltips, setTranslationGetter as setTooltipTranslationGetter, updateTooltipTextMap } from '../ui/tooltip-controller.js';
import { getCurrentLanguage as getTranslationCurrentLanguage, getTranslation as getTranslationFunction, initTranslationSystem, refreshTranslations, translateElementsWithDataTranslate, updateDynamicMenuLabels } from '../core/translations-controller.js';
import { initMenuInteractions } from '../ui/menu-interactions.js';
import { initializeStopwatch } from '../features/stopwatch-controller.js';
import { initializeTimerController } from '../features/timer-controller.js';
import { initializeAlarmClock } from '../features/alarm-controller.js';
import { initWorldClock } from '../features/worldClock-controller.js';
import { initializeRingingController } from '../ui/ringing-controller.js';
const TIMING_CONFIG = {
    DEBOUNCE_DELAY: 300,
    FORCE_REFRESH_DELAY: 500,
    SECTION_CHANGE_DELAY: 200,
    MIN_INTERVAL_BETWEEN_REFRESHES: 1000
};

const EVENT_NAMES = {
    APP_READY: 'appReady',
    SECTION_CHANGED: 'sectionChanged',
    LANGUAGE_CHANGED: 'languageChanged',
    THEME_CHANGED: 'themeChanged',
    TRANSLATIONS_APPLIED: 'translationsApplied',
    STORAGE: 'storage',
    CLICK: 'click',
    RESIZE: 'resize'
};

const STORAGE_KEYS = {
    APP_LANGUAGE: 'app-language',
    APP_THEME: 'app-theme'
};

const REFRESH_SOURCES = {
    UNKNOWN: 'unknown',
    INITIALIZATION: 'initialization',
    SECTION_CHANGED: 'sectionChanged',
    LANGUAGE_CHANGED: 'languageChanged',
    THEME_CHANGED: 'themeChanged',
    STORAGE_LANGUAGE_CHANGE: 'storageLanguageChange',
    STORAGE_THEME_CHANGE: 'storageThemeChange',
    DYNAMIC_ELEMENTS: 'dynamicElements',
    TRANSLATION_TEST: 'translationTest',
    TRANSLATIONS_APPLIED_EVENT: 'translationsAppliedEvent',
    COLOR_SYSTEM_REFRESH: 'colorSystemRefresh',
    SEARCH_UPDATE: 'searchUpdate',
    SEARCH_CLEARED: 'searchCleared',
    RECENT_COLORS_RENDERED: 'recentColorsRendered'
};

const DOM_SELECTORS = {
    MENU_LINK: '.menu-link',
    SIDEBAR_BUTTON: '.sidebar-button',
    DATA_TRANSLATE: '[data-translate]'
};

const REFRESH_PRESETS = {
    FULL: {
        skipTranslations: false,
        skipTooltips: false,
        skipMenuLabels: true,
        skipColorSystem: false
    },
    TRANSLATIONS_ONLY: {
        skipTranslations: false,
        skipTooltips: true,
        skipMenuLabels: true,
        skipColorSystem: true
    },
    TOOLTIPS_ONLY: {
        skipTranslations: true,
        skipTooltips: false,
        skipMenuLabels: true,
        skipColorSystem: true
    },
    COLOR_SYSTEM_ONLY: {
        skipTranslations: true,
        skipTooltips: true,
        skipMenuLabels: true,
        skipColorSystem: false
    },
    MINIMAL: {
        skipTranslations: true,
        skipTooltips: true,
        skipMenuLabels: true,
        skipColorSystem: true
    }
};

const applicationState = {
    isReady: false,
    isRefreshing: false,
    isInitializing: false,
    refreshTimeout: null,
    lastRefreshSource: null,
    lastRefreshTime: 0
};

const debugConfig = {
    enableLogs: false
};

function createRefreshConfig(options = {}) {
    const {
        source = REFRESH_SOURCES.UNKNOWN,
        immediate = false,
        preset = null,
        ...customOptions
    } = options;
    let baseConfig = preset ? REFRESH_PRESETS[preset] : REFRESH_PRESETS.FULL;
    return {
        source,
        immediate,
        ...baseConfig,
        ...customOptions
    };
}

function forceRefresh(options = {}) {
    const config = createRefreshConfig(options);
    const now = Date.now();
    const criticalUiSources = [
        REFRESH_SOURCES.SEARCH_UPDATE,
        REFRESH_SOURCES.RECENT_COLORS_RENDERED,
        REFRESH_SOURCES.DYNAMIC_ELEMENTS
    ];
    if (now - applicationState.lastRefreshTime < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_REFRESHES && !criticalUiSources.includes(config.source)) {
        return;
    }
    if (isModuleManagerLoading()) {
        return;
    }
    if (!applicationState.isReady && config.source !== REFRESH_SOURCES.INITIALIZATION) {
        return;
    }
    if (applicationState.lastRefreshSource === config.source && applicationState.isRefreshing) {
        return;
    }
    if (applicationState.isRefreshing && !config.immediate) {
        return;
    }
    if (!config.immediate && applicationState.refreshTimeout) {
        clearTimeout(applicationState.refreshTimeout);
        applicationState.refreshTimeout = null;
    }
    const executeRefresh = () => performRefreshOperation(config);
    if (config.immediate || criticalUiSources.includes(config.source)) {
        executeRefresh();
    } else {
        const delay = getRefreshDelay(config.source);
        applicationState.refreshTimeout = setTimeout(executeRefresh, delay);
    }
}

function performRefreshOperation(config) {
    if (applicationState.isRefreshing) return;
    if (isModuleManagerLoading()) {
        return;
    }
    applicationState.isRefreshing = true;
    applicationState.lastRefreshSource = config.source;
    applicationState.lastRefreshTime = Date.now();
    try {
        if (!config.skipTranslations) {
            translateElementsWithDataTranslate();
        }
        if (!config.skipTooltips) {
            refreshTooltips();
        }
        if (!config.skipColorSystem) {
            refreshColorSystem();
        }
        updateMenuLabels();
    } catch (error) { } finally {
        setTimeout(() => {
            applicationState.isRefreshing = false;
            applicationState.lastRefreshSource = null;
            applicationState.refreshTimeout = null;
        }, 200);
    }
}

function getRefreshDelay(source) {
    const delayMap = {
        [REFRESH_SOURCES.LANGUAGE_CHANGED]: TIMING_CONFIG.FORCE_REFRESH_DELAY,
        [REFRESH_SOURCES.THEME_CHANGED]: TIMING_CONFIG.FORCE_REFRESH_DELAY,
        [REFRESH_SOURCES.TRANSLATIONS_APPLIED_EVENT]: TIMING_CONFIG.FORCE_REFRESH_DELAY,
        [REFRESH_SOURCES.STORAGE_LANGUAGE_CHANGE]: TIMING_CONFIG.FORCE_REFRESH_DELAY,
        [REFRESH_SOURCES.STORAGE_THEME_CHANGE]: TIMING_CONFIG.FORCE_REFRESH_DELAY,
        [REFRESH_SOURCES.SECTION_CHANGED]: TIMING_CONFIG.SECTION_CHANGE_DELAY,
        [REFRESH_SOURCES.COLOR_SYSTEM_REFRESH]: TIMING_CONFIG.DEBOUNCE_DELAY,
        [REFRESH_SOURCES.SEARCH_UPDATE]: TIMING_CONFIG.DEBOUNCE_DELAY,
        [REFRESH_SOURCES.SEARCH_CLEARED]: TIMING_CONFIG.DEBOUNCE_DELAY,
        [REFRESH_SOURCES.RECENT_COLORS_RENDERED]: TIMING_CONFIG.DEBOUNCE_DELAY
    };
    return delayMap[source] || TIMING_CONFIG.DEBOUNCE_DELAY;
}

function debouncedRefresh(callback, delay = TIMING_CONFIG.DEBOUNCE_DELAY) {
    if (applicationState.refreshTimeout) {
        clearTimeout(applicationState.refreshTimeout);
    }
    applicationState.refreshTimeout = setTimeout(callback, delay);
}

const appFunctions = {
    forceRefresh: forceRefresh,
    updateMenuLabels: updateMenuLabels,
    refreshTooltips: refreshTooltips,
    refreshTranslations: refreshTranslations,
    updateDynamicMenuLabels: updateDynamicMenuLabels,
    translateElementsWithDataTranslate: translateElementsWithDataTranslate,
    batchMigrateTooltips: batchMigrateTooltips,
    initializeMobileSidebarTooltips: initializeMobileSidebarTooltips,
    debouncedRefresh: debouncedRefresh,
    refreshColorSystem: refreshColorSystem,
    getCurrentLanguage: null,
    getCurrentTheme: null
};

function initApp() {
    if (applicationState.isInitializing) {
        return;
    }
    try {
        applicationState.isInitializing = true;
        initModuleManager()
            .then(() => {
                setModuleManagerTranslationFunction(getTranslationFunction);
                return initTranslationSystem();
            })
            .then(() => {
                if (typeof window.setTooltipTextMapUpdateFunction === 'function') {
                    window.setTooltipTextMapUpdateFunction(updateTooltipTextMap);
                }
                setTooltipTranslationGetter(getTranslationFunction);
                return initializeTooltipSystem();
            })
            .then(() => {
                initializeMainComponents();
                finalizeInitialization();
            })
            .then(() => {
                logInitializationComplete();
                dispatchAppReadyEvent();
            })
            .catch(error => { })
            .finally(() => {
                applicationState.isInitializing = false;
            });
    } catch (error) {
        applicationState.isInitializing = false;
    }
}

function initializeMainComponents() {
    initDB();
    startAudioCachePreload();
    initSidebarMobile();
    initSidebarSections();
    initControlCenter();
    initMobileDragController();
    initMenuInteractions();
    initializeZoneInfoTool();
    initializeEverything();
    applyCollapsedSectionsState();
    setupCollapsibleSectionEvents();
    initializeCategorySliderService();
    initializeCentralizedFontManager();
    initializeFullScreenManager();
    initializeCardEventListeners();
    initColorTextSystem();
    // initColorSearchSystem(); // ELIMINADO CORRECTAMENTE
    initializeAlarmClock();
    initWorldClock();
    initializeStopwatch();
    initializeTimerController();
    initializeRingingController(); 
    initLocationManager();
    setupEventListeners();
    batchMigrateTooltips();
    initializeMobileSidebarTooltips();
    initializeScrollShadow();
}

function finalizeInitialization() {
    applicationState.isReady = true;
    const refreshConfig = createRefreshConfig({
        source: REFRESH_SOURCES.INITIALIZATION,
        immediate: false,
        preset: 'TRANSLATIONS_ONLY'
    });
    setTimeout(() => {
        forceRefresh(refreshConfig);
    }, 500);
}

function logInitializationComplete() {
    setTimeout(() => {
        logPersonalizationData();
    }, 300);
}

function dispatchAppReadyEvent() {
    appFunctions.getCurrentLanguage = getModuleManagerCurrentLanguage;
    appFunctions.getCurrentTheme = getModuleManagerCurrentTheme;
    const appReadyEvent = new CustomEvent(EVENT_NAMES.APP_READY, {
        detail: {
            functions: appFunctions
        }
    });
    document.dispatchEvent(appReadyEvent);
}

function logPersonalizationData() { }

function setupEventListeners() {
    setupRefreshEventListeners();
    setupMutationObserver();
    document.addEventListener(EVENT_NAMES.CLICK, (e) => {
        const feedbackButton = e.target.closest('[data-action="submit-feedback"]');
        if (feedbackButton) {
            e.preventDefault();
            activateModule('toggleFeedbackMenu');
        }
    });
    document.addEventListener('moduleDeactivated', (e) => {
        if (e.detail && (e.detail.module === 'controlCenter' || e.detail.module === 'toggleControlCenter')) {
            if (typeof resetLocationSearch === 'function') {
                resetLocationSearch();
            }
        }
    });
}

function setupRefreshEventListeners() {
    let languageChangeTimeout = null;
    let themeChangeTimeout = null;
    let translationsAppliedTimeout = null;
    document.addEventListener(EVENT_NAMES.LANGUAGE_CHANGED, () => {
        if (languageChangeTimeout) clearTimeout(languageChangeTimeout);
        languageChangeTimeout = setTimeout(() => { }, 100);
    });
    document.addEventListener(EVENT_NAMES.THEME_CHANGED, () => {
        if (themeChangeTimeout) clearTimeout(themeChangeTimeout);
        themeChangeTimeout = setTimeout(() => {
            const refreshConfig = createRefreshConfig({
                source: REFRESH_SOURCES.THEME_CHANGED,
                immediate: false,
                preset: 'TRANSLATIONS_ONLY'
            });
            forceRefresh(refreshConfig);
        }, 300);
    });
    document.addEventListener(EVENT_NAMES.TRANSLATIONS_APPLIED, () => {
        if (translationsAppliedTimeout) clearTimeout(translationsAppliedTimeout);
        translationsAppliedTimeout = setTimeout(() => {
            handleTranslationsApplied();
        }, 200);
    });
    document.addEventListener(EVENT_NAMES.SECTION_CHANGED, () => handleSectionChange());
    document.addEventListener('textColorChanged', () => {
        const refreshConfig = createRefreshConfig({
            source: 'textColorChanged',
            preset: 'TOOLTIPS_ONLY'
        });
        forceRefresh(refreshConfig);
    });
    document.addEventListener('searchColorSelected', () => {
        const refreshConfig = createRefreshConfig({
            source: REFRESH_SOURCES.SEARCH_UPDATE,
            preset: 'TOOLTIPS_ONLY'
        });
        forceRefresh(refreshConfig);
    });
    setupStorageListeners();
    setupClickListeners();
}

function handleSectionChange() {
    const refreshConfig = createRefreshConfig({
        source: REFRESH_SOURCES.SECTION_CHANGED,
        preset: 'TRANSLATIONS_ONLY'
    });
    forceRefresh(refreshConfig);
}

function handleTranslationsApplied() {
    const refreshConfig = createRefreshConfig({
        source: REFRESH_SOURCES.TRANSLATIONS_APPLIED_EVENT,
        immediate: false,
        preset: 'TOOLTIPS_ONLY'
    });
    forceRefresh(refreshConfig);
}

function setupStorageListeners() {
    let storageTimeout = null;
    window.addEventListener(EVENT_NAMES.STORAGE, (e) => {
        if (!applicationState.isReady) return;
        if (storageTimeout) clearTimeout(storageTimeout);
        storageTimeout = setTimeout(() => {
            const storageHandlers = {
                [STORAGE_KEYS.APP_LANGUAGE]: () => { },
                [STORAGE_KEYS.APP_THEME]: () => { }
            };
            const handler = storageHandlers[e.key];
            if (handler) {
                handler();
            }
        }, 300);
    });
}

function setupClickListeners() {
    document.addEventListener(EVENT_NAMES.CLICK, (e) => {
        handleSidebarButtonClick(e);
    });
}

function handleSidebarButtonClick(e) {
    const sidebarButton = e.target.closest(DOM_SELECTORS.SIDEBAR_BUTTON);
    if (!sidebarButton) return;
    setTimeout(() => {
        const refreshConfig = createRefreshConfig({
            source: 'sidebarButtonClick',
            preset: 'TRANSLATIONS_ONLY'
        });
        forceRefresh(refreshConfig);
    }, TIMING_CONFIG.SECTION_CHANGE_DELAY);
}

function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;
    let mutationTimeout = null;
    const observer = new MutationObserver((mutations) => {
        if (!applicationState.isReady) return;
        const needsRefresh = mutations.some(mutation =>
            shouldRefreshForMutation(mutation)
        );
        if (needsRefresh) {
            if (mutationTimeout) clearTimeout(mutationTimeout);
            mutationTimeout = setTimeout(() => {
                const refreshConfig = createRefreshConfig({
                    source: REFRESH_SOURCES.DYNAMIC_ELEMENTS,
                    preset: 'TOOLTIPS_ONLY'
                });
                forceRefresh(refreshConfig);
            }, 500);
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-translate', 'data-translate-category', 'data-translate-target', 'data-tooltip', 'data-hex']
    });
}

function shouldRefreshForMutation(mutation) {
    if (mutation.type === 'childList') {
        return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const relevantSelector = `${DOM_SELECTORS.DATA_TRANSLATE}, [data-tooltip], .color-content`;
            if (node.matches && node.matches(relevantSelector)) {
                return true;
            }
            const children = node.querySelectorAll && node.querySelectorAll(relevantSelector);
            return children && children.length > 0;
        });
    } else if (mutation.type === 'attributes') {
        return ['data-translate', 'data-tooltip', 'data-hex'].includes(mutation.attributeName);
    }
    return false;
}

function debugTranslations() { }

function testTranslationSystem() {
    debugTranslations();
    const refreshConfig = createRefreshConfig({
        source: REFRESH_SOURCES.TRANSLATION_TEST,
        immediate: true,
        preset: 'TRANSLATIONS_ONLY'
    });
    forceRefresh(refreshConfig);
}

function getSystemStatus() {
    return {
        isReady: applicationState.isReady,
        isRefreshing: applicationState.isRefreshing,
        isInitializing: applicationState.isInitializing,
        hasRefreshTimeout: !!applicationState.refreshTimeout,
        lastRefreshSource: applicationState.lastRefreshSource,
        lastRefreshTime: applicationState.lastRefreshTime,
        debugEnabled: debugConfig.enableLogs,
        moduleManagerLoading: isModuleManagerLoading(),
        moduleManagerStatus: {
            currentTheme: getModuleManagerCurrentTheme(),
            currentLanguage: getModuleManagerCurrentLanguage()
        },
        translationSystemStatus: getTranslationFunction ? {
            isReady: getTranslationFunction.isSystemReady && getTranslationFunction.isSystemReady(),
            currentLanguage: getTranslationCurrentLanguage()
        } : 'Not initialized',
        tooltipSystemStatus: typeof getTooltipSystemStatus === 'function' ? getTooltipSystemStatus() : 'Not initialized',
        generalToolsStatus: {
            fontManager: typeof window.centralizedFontManager === 'object' ? 'Initialized' : 'Not initialized',
            categorySlider: 'Initialized',
            colorSystem: typeof window.colorTextManager === 'object' ? 'Initialized' : 'Not initialized'
        }
    };
}

function setDebugMode(enabled) {
    debugConfig.enableLogs = enabled;
}

function getAppFunctions() {
    return {
        ...appFunctions,
        debugTranslations,
        testTranslationSystem,
        getSystemStatus,
        setDebugMode,
        logPersonalizationData
    };
}

appFunctions.debugTranslations = debugTranslations;
appFunctions.testTranslationSystem = testTranslationSystem;
appFunctions.getSystemStatus = getSystemStatus;
appFunctions.setDebugMode = setDebugMode;
appFunctions.logPersonalizationData = logPersonalizationData;

function autoInitialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

autoInitialize();

export {
    initApp,
    getAppFunctions,
    forceRefresh,
    debugTranslations,
    testTranslationSystem,
    debouncedRefresh,
    getSystemStatus,
    setDebugMode,
    logPersonalizationData
};