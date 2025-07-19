import { activateModule, deactivateAllModules, deactivateModule, getActiveModule, isAnyModuleActive, isModuleActive, isModuleCurrentlyChanging, logModuleStates, resetModuleChangeFlag, showControlCenterMenu, showSpecificOverlay, toggleModule } from '../core/module-manager.js';
import { initializeTextStyleManager } from '../features/general-tools.js';
import { isGradientColor } from '../ui/palette-colors.js';
import { populateHourSelectionMenu } from '../ui/menu-interactions.js';
import { trackEvent } from '../services/event-tracker.js';

let use24HourFormat = localStorage.getItem('use24HourFormat') === 'false' ? false : true;
let allowCardMovement = true;
let keyboardShortcutsEnabled = true;

let rememberExpandedSectionsOnNav = false;

const keyState = {};

function initSidebarMobile() {
    const btn = document.querySelector('[data-module="toggleSidebarMovile"]');
    const sidebar = document.querySelector('.sidebar-wrapper.mobile-sidebar');
    if (!btn || !sidebar) {
        return;
    }
    function handleSidebarToggle(e) {
        if (e) e.stopPropagation();
        if (btn.hasAttribute('disabled')) {
            btn.removeAttribute('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
        }
        if (sidebar.classList.contains('disabled')) {
            sidebar.classList.remove('disabled');
            sidebar.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            sidebar.classList.add('disabled');
        }
    }
    btn.addEventListener('click', handleSidebarToggle);
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !btn.contains(e.target)) {
            handleSidebarToggle();
        }
    });
    document.addEventListener('sectionChanged', () => {
        if (sidebar.classList.contains('active')) {
            handleSidebarToggle();
        }
    });
    function updateSidebarVisibility() {
        const screenWidth = window.innerWidth;
        if (screenWidth > 768) {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebar.classList.add('disabled');
            }
            btn.removeAttribute('disabled');
        }
    }
    updateSidebarVisibility();
    window.addEventListener('resize', updateSidebarVisibility);
}

const activeSectionStates = {
    everything: true,
    alarm: false,
    stopwatch: false,
    timer: false,
    worldClock: false,
    'privacy-policy': false,
    'terms-conditions': false,
    'cookies-policy': false
};

const sectionStates = {
    currentView: 'tools',
    activeSection: 'everything'
};

function logSectionStates() {
}

function activateSection(sectionName, showLog = true) {
    const oldSection = document.querySelector('.section-content > .active');
    const oldSectionName = oldSection ? oldSection.dataset.section : null;

    if (activeSectionStates[sectionName] === true) {
        return;
    }
    for (const section in activeSectionStates) {
        activeSectionStates[section] = false;
    }
    if (activeSectionStates.hasOwnProperty(sectionName)) {
        activeSectionStates[sectionName] = true;
        sectionStates.activeSection = sectionName;
    }

    if (oldSection) {
        oldSection.classList.remove('active');
        oldSection.classList.add('disabled');
    }

    const newSection = document.querySelector(`.section-content > [data-section="${sectionName}"]`);
    if (newSection) {
        newSection.classList.remove('disabled');
        newSection.classList.add('active');
    } else {
    }
    updateSidebarButtons(sectionName);
    if (showLog) {
        logSectionStates();
    }

    const event = new CustomEvent('sectionChanged', {
        detail: {
            activeSection: sectionName,
            previousSection: oldSectionName,
            view: sectionStates.currentView,
            states: activeSectionStates
        }
    });

    trackEvent('section_visit', sectionName);
    document.dispatchEvent(event);
}

function updateSidebarButtons(activeSection) {
    document.querySelectorAll('.sidebar-button').forEach(button => {
        const sectionName = button.dataset.sectionName;
        if (sectionName === activeSection) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function switchToLegalView(sectionName) {
    sectionStates.currentView = 'legal';
    document.querySelector('.sidebar-tools')?.classList.add('disabled');
    document.querySelector('.sidebar-legal-options')?.classList.remove('disabled');
    document.querySelector('.mobile-sidebar .sidebar-tools')?.classList.add('disabled');
    document.querySelector('.mobile-sidebar .sidebar-legal-options')?.classList.remove('disabled');
    activateSection(sectionName);
}

function switchToToolsView(showLog = false) {
    sectionStates.currentView = 'tools';
    document.querySelector('.sidebar-legal-options')?.classList.add('disabled');
    document.querySelector('.sidebar-tools')?.classList.remove('disabled');
    document.querySelector('.mobile-sidebar .sidebar-legal-options')?.classList.add('disabled');
    document.querySelector('.mobile-sidebar .sidebar-tools')?.classList.remove('disabled');
    activateSection('everything', showLog);
}

function initSectionManagement() {
    document.querySelectorAll('.sidebar-tools .sidebar-button').forEach(button => {
        button.addEventListener('click', () => {
            const sectionName = button.dataset.sectionName;
            if (sectionName) {
                if (sectionStates.currentView !== 'tools') {
                    switchToToolsView();
                }
                activateSection(sectionName);
            }
        });
    });
    document.querySelector('.module-control-center').addEventListener('click', (e) => {
        const legalLink = e.target.closest('[data-action="privacy-policy"], [data-action="terms-conditions"], [data-action="cookies-policy"]');
        if (legalLink) {
            const sectionName = legalLink.dataset.action;
            switchToLegalView(sectionName);
            deactivateModule('controlCenter');
        }
    });
    document.querySelectorAll('.sidebar-legal-options .sidebar-button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const sectionName = button.dataset.sectionName;
            if (action === 'back-to-tools') {
                switchToToolsView(true);
            } else if (sectionName) {
                activateSection(sectionName);
            }
        });
    });

    switchToToolsView(false);
}


function getActiveSection() {
    return sectionStates.activeSection;
}

function getAllSectionStates() {
    return { ...activeSectionStates };
}

function switchToSection(sectionName) {
    if (activeSectionStates.hasOwnProperty(sectionName)) {
        activateSection(sectionName);
        return true;
    }
    return false;
}

function toggleTimeFormat() {
    use24HourFormat = !use24HourFormat;
    localStorage.setItem('use24HourFormat', use24HourFormat);
    updateTimeFormatInAllSections();

    if (window.centralizedFontManager) {
        setTimeout(() => {
            window.centralizedFontManager.adjustAndApplyFontSizeToSection('alarm');
            window.centralizedFontManager.adjustAndApplyFontSizeToSection('worldClock');
        }, 50);
    }

    const timePickerMenu = document.querySelector('.menu-timePicker[data-menu="timePicker"]');
    if (timePickerMenu && timePickerMenu.classList.contains('active')) {
        populateHourSelectionMenu();
    }
    const event = new CustomEvent('timeFormatChanged');
    document.dispatchEvent(event);
}

function updateTimeFormatInAllSections() {
    if (window.alarmManager?.renderAllAlarmCards) {
        window.alarmManager.renderAllAlarmCards();
    }
    if (window.timerManager?.renderAllTimerCards) {
        window.timerManager.renderAllTimerCards();
    }
    if (window.worldClockManager?.updateExistingCardsTranslations) {
        window.worldClockManager.updateExistingCardsTranslations();
    }
}

function initModuleToggleListeners() {
    const controlCenterToggle = document.querySelector('[data-module="toggleControlCenter"]');
    if (controlCenterToggle) {
        controlCenterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleModule('controlCenter');
        });
    }

    const notificationsToggle = document.querySelector('[data-module="toggleNotifications"]');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleModule('toggleNotifications');
        });
    }
}

function closeActiveModule(options = {}) {
    const activeModule = getActiveModule();
    if (activeModule) {
        deactivateModule(activeModule, options);
    }
}

function closeAllModules(options = {}) {
    const { source = 'closeAllModules' } = options;
    if (isAnyModuleActive()) {
        deactivateAllModules();
    }
}

function activateModuleByName(moduleName) {
    activateModule(moduleName);
}

function toggleModuleByName(moduleName) {
    toggleModule(moduleName);
}

function getModuleInfo(moduleName) {
    return {
        active: isModuleActive(moduleName),
        name: moduleName
    };
}

function isControlCenterActive() {
    return isModuleActive('controlCenter');
}

function isAnyOverlayActive() {
    return isModuleActive('menuAlarm') ||
        isModuleActive('menuTimer') ||
        isModuleActive('menuWorldClock') ||
        isModuleActive('menuPaletteColors') ||
        isModuleActive('overlayContainer') ||
        isModuleActive('overlayContainerRight');
}

function activateSpecificOverlay(overlayName) {
    const overlayToToggleMap = {
        'menuAlarm': 'toggleMenuAlarm',
        'menuTimer': 'toggleMenuTimer',
        'menuWorldClock': 'toggleMenuWorldClock',
        'menuPaletteColors': 'togglePaletteColors',
        'menuNotifications': 'toggleNotifications'
    };
    const toggle = overlayToToggleMap[overlayName];
    if (toggle) {
        activateModule(toggle);
        return true;
    }
    return false;
}

function closeSpecificOverlay(overlayName) {
    const normalizedName = normalizeModuleName(overlayName);
    if (isModuleActive(normalizedName)) {
        deactivateModule(normalizedName);
        return true;
    }
    return false;
}

function switchOverlay(overlayName) {
    const normalizedName = normalizeModuleName(overlayName);
    const activeModule = getActiveModule();
    if (activeModule && activeModule !== normalizedName) {
        deactivateModule(activeModule);
        activateModule(normalizedName);
    } else if (!activeModule) {
        activateModule(normalizedName);
    }
}

function getCurrentActiveOverlay() {
    const overlayContainer = document.querySelector('.module-overlay.active');
    if (overlayContainer) {
        const activeOverlay = overlayContainer.querySelector('[data-menu].active');
        if (activeOverlay) {
            return `menu${activeOverlay.dataset.menu.charAt(0).toUpperCase() + activeOverlay.dataset.menu.slice(1)}`;
        }
    }

    const overlayRightContainer = document.querySelector('.module-overlay-right.active');
    if (overlayRightContainer) {
        const activeOverlay = overlayRightContainer.querySelector('[data-menu].active');
        if (activeOverlay) return `menu${activeOverlay.dataset.menu.charAt(0).toUpperCase() + activeOverlay.dataset.menu.slice(1)}`;
    }

    return null;
}

function activateControlCenterMenu(menuName) {
    if (isControlCenterActive()) {
        showControlCenterMenu(menuName);
        return true;
    } else {
        activateModule('controlCenter');
        setTimeout(() => {
            showControlCenterMenu(menuName);
        }, 100);
        return true;
    }
}

function switchControlCenterMenu(menuName) {
    return activateControlCenterMenu(menuName);
}

function getSystemStatus() {
    return {
        sections: {
            active: getActiveSection(),
            all: getAllSectionStates()
        },
        modules: {
            active: getActiveModule(),
            anyActive: isAnyModuleActive(),
            controlCenterActive: isControlCenterActive(),
            anyOverlayActive: isAnyOverlayActive(),
            currentActiveOverlay: getCurrentActiveOverlay(),
            isChanging: isModuleCurrentlyChanging()
        }
    };
}

function closeControlCenter(options = {}) {
    deactivateModule('controlCenter', options);
}

function closeOverlays(options = {}) {
    if (isModuleActive('overlayContainer')) {
        deactivateModule('overlayContainer', options);
    }
    if (isModuleActive('overlayContainerRight')) {
        deactivateModule('overlayContainerRight', options);
    }
}

function closeOverlayByName(overlayName) {
    const currentOverlay = getCurrentActiveOverlay();
    if (currentOverlay === overlayName) {
        return closeSpecificOverlay(overlayName);
    }
    return false;
}

function dispatchModuleEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
        detail: {
            ...detail,
            timestamp: Date.now(),
            activeModule: getActiveModule(),
            activeSection: getActiveSection()
        }
    });
    document.dispatchEvent(event);
}

function onModuleActivated(callback) {
    document.addEventListener('moduleActivated', callback);
}

function onModuleDeactivated(callback) {
    document.addEventListener('moduleDeactivated', callback);
}

function onOverlayChanged(callback) {
    document.addEventListener('overlayChanged', callback);
}

function isModuleBusy() {
    return isModuleCurrentlyChanging();
}

function waitForModuleReady() {
    return new Promise((resolve) => {
        if (!isModuleCurrentlyChanging()) {
            resolve();
            return;
        }
        const checkReady = () => {
            if (!isModuleCurrentlyChanging()) {
                resolve();
            } else {
                setTimeout(checkReady, 50);
            }
        };
        setTimeout(checkReady, 50);
    });
}

function executeWhenModuleReady(callback) {
    waitForModuleReady().then(callback);
}

function setModulePreference(moduleName, preference, value) {
    try {
        const key = `module-${moduleName}-${preference}`;
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        return false;
    }
}

function getModulePreference(moduleName, preference, defaultValue = null) {
    try {
        const key = `module-${moduleName}-${preference}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

function getAppliedColor() {
    if (window.colorTextManager && typeof window.colorTextManager.getCurrentColor === 'function' && typeof window.colorTextManager.getColorInfo === 'function') {
        const color = window.colorTextManager.getCurrentColor();
        const info = window.colorTextManager.getColorInfo();
        return {
            color: color,
            colorName: info.activeColorName,
            isGradient: isGradientColor(color),
            isValidForTheme: window.colorTextManager.isValidForTheme(color)
        };
    }
    return {
        color: 'N/A',
        colorName: 'N/A',
        isGradient: 'N/A',
        isValidForTheme: 'N/A'
    };
}

function getAppliedFontScale() {
    if (window.centralizedFontManager && typeof window.centralizedFontManager.getCurrentScale === 'function' && typeof window.centralizedFontManager.getCurrentActualSize === 'function') {
        const scale = window.centralizedFontManager.getCurrentScale();
        const pixelSize = window.centralizedFontManager.getCurrentActualSize();
        return {
            scale: scale,
            pixelSize: pixelSize
        };
    }
    return { scale: 'N/A', pixelSize: 'N/A' };
}

function getAppliedTextStyle() {
    return {
        isBold: localStorage.getItem('textStyle_isBold') === 'true',
        isItalic: localStorage.getItem('textStyle_isItalic') === 'true'
    };
}

function handleKeyDown(e) {
    if (!keyboardShortcutsEnabled || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    const key = e.key.toLowerCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    const isFontSizeKey = ctrlOrMeta && (key === '+' || key === '-' || key === '=');
    if (keyState[key] && !isFontSizeKey) {
        return;
    }
    keyState[key] = true;
    const activeSectionName = getActiveSection();
    const activeSectionElement = document.querySelector(`.section-content > .active`);
    if (!activeSectionElement) return;

    // Verificación para saber si hay alguna herramienta sonando
    const isAnyToolRinging = window.ringingState && Object.keys(window.ringingState.tools).length > 0;

    if (ctrlOrMeta) {
        switch (key) {
            case 'm':
                e.preventDefault();
                toggleModule('toggleControlCenter');
                break;
        }
    }

    switch (activeSectionName) {
        case 'everything':
            break;
        case 'alarm':
            if (key === 'a' && !isAnyToolRinging) activeSectionElement.querySelector('[data-module="toggleMenuAlarm"]')?.click();
            break;
        case 'timer':
            if (key === ' ') {
                e.preventDefault();
                const startBtn = activeSectionElement.querySelector('[data-action="start-pinned-timer"]');
                const pauseBtn = activeSectionElement.querySelector('[data-action="pause-pinned-timer"]');
                if (startBtn && !startBtn.classList.contains('disabled-interactive')) {
                    startBtn.click();
                } else if (pauseBtn && !pauseBtn.classList.contains('disabled-interactive')) {
                    pauseBtn.click();
                }
            }
            if (key === 'r') {
                const resetBtn = activeSectionElement.querySelector('[data-action="reset-pinned-timer"]');
                if (resetBtn && !resetBtn.classList.contains('disabled-interactive')) {
                    resetBtn.click();
                }
            }
            if (key === 'a' && !isAnyToolRinging) activeSectionElement.querySelector('[data-module="toggleMenuTimer"]')?.click();
            break;
        case 'stopwatch':
            if (key === ' ') {
                e.preventDefault();
                const startBtn = activeSectionElement.querySelector('[data-action="start"]');
                const stopBtn = activeSectionElement.querySelector('[data-action="stop"]');
                if (startBtn && !startBtn.classList.contains('disabled-interactive')) {
                    startBtn.click();
                } else if (stopBtn && !stopBtn.classList.contains('disabled-interactive')) {
                    stopBtn.click();
                }
            }
            if (key === 'l') activeSectionElement.querySelector('[data-action="lap"]')?.click();
            if (key === 'r') {
                const resetBtn = activeSectionElement.querySelector('[data-action="reset"]');
                if (resetBtn && !resetBtn.classList.contains('disabled-interactive')) {
                    resetBtn.click();
                }
            }
            if (ctrlOrMeta && key === 'c') {
                e.preventDefault();
                activeSectionElement.querySelector('[data-action="change-format"]')?.click();
            }
            if (ctrlOrMeta && key === 'e') {
                e.preventDefault();
                activeSectionElement.querySelector('[data-action="export-laps"]')?.click();
            }
            break;
        case 'worldClock':
            if (key === 'a' && !isAnyToolRinging) activeSectionElement.querySelector('[data-module="toggleMenuWorldClock"]')?.click();
            break;
    }
}

function handleKeyUp(e) {
    if (!e.key) {
        return;
    }
    const key = e.key.toLowerCase();
    delete keyState[key];
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.addEventListener('DOMContentLoaded', initializeTextStyleManager);

export { activateControlCenterMenu, activateModuleByName as activateModule, activateSection, activateSpecificOverlay, allowCardMovement, closeActiveModule, closeAllModules, closeControlCenter };
export { closeOverlayByName, closeOverlays, deactivateModule, dispatchModuleEvent, executeWhenModuleReady, getActiveModule, getActiveSection, getAllSectionStates };
export { getAppliedColor, getAppliedFontScale, getAppliedTextStyle, getCurrentActiveOverlay, getModuleInfo, getModulePreference, getSystemStatus, initModuleToggleListeners as initControlCenter };
export { initSectionManagement as initSidebarSections, initSidebarMobile, isAnyModuleActive, isAnyOverlayActive, isControlCenterActive, isModuleActive, isModuleBusy };
export { isModuleCurrentlyChanging, keyboardShortcutsEnabled, logModuleStates, logSectionStates, onModuleActivated, onModuleDeactivated, onOverlayChanged, resetModuleChangeFlag, setModulePreference, showControlCenterMenu, showSpecificOverlay, switchControlCenterMenu, switchOverlay, switchToSection, toggleModuleByName as toggleModule, toggleTimeFormat, use24HourFormat, waitForModuleReady, rememberExpandedSectionsOnNav };