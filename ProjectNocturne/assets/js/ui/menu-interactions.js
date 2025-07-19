"use strict";
import { use24HourFormat, deactivateModule, activateModule, isModuleActive } from '../app/main.js';
import { getTranslation } from '../core/translations-controller.js';
import { addTimerAndRender, updateTimer } from '../features/timer-controller.js';
import { showDynamicIslandNotification } from './notification-controller.js';
import { playSound, stopSound, generateSoundList, handleAudioUpload, deleteUserAudio, getSoundNameById } from '../features/general-tools.js';
import { getCurrentLocation } from '../services/location-manager.js';
// import { clearSearchColors } from './color-search-system.js'; // LÍNEA CRÍTICA ELIMINADA

let onConfirmCallback = null;
let activeModalType = null;
const CREATION_TIMEOUT = 500;

function generateFeedbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}


function populateConfirmationModal(data) {
    const modalMenu = document.querySelector('.menu-component[data-menu="delete"]');
    if (!modalMenu) return;
    const headerTitleElement = modalMenu.querySelector('[data-delete-item="header-title"]');
    const itemTypeLabelElement = modalMenu.querySelector('[data-delete-item="item-type-label"]');
    const itemNameElement = modalMenu.querySelector('[data-delete-item="name"]');
    const confirmButton = modalMenu.querySelector('.menu-button--danger');
    const cancelButton = modalMenu.querySelector('.menu-button:not(.menu-button--danger)');
    if (!headerTitleElement || !itemTypeLabelElement || !itemNameElement || !confirmButton || !cancelButton) {
        return;
    }
    const { type: itemType, name } = data;
    const headerTitleKey = `confirm_delete_title_${itemType}`;
    const itemTypeLabelKey = `delete_${itemType}_title_prefix`;
    headerTitleElement.textContent = getTranslation(headerTitleKey, 'confirmation');
    itemTypeLabelElement.textContent = getTranslation(itemTypeLabelKey, 'confirmation');
    itemNameElement.value = name;
    confirmButton.querySelector('span').setAttribute('data-translate', 'delete');
    confirmButton.querySelector('span').textContent = getTranslation('delete', 'confirmation');
    cancelButton.querySelector('span').setAttribute('data-translate', 'cancel');
    cancelButton.querySelector('span').textContent = getTranslation('cancel', 'confirmation');
}

function setupModalEventListeners() {
    const deleteMenu = document.querySelector('.menu-component[data-menu="delete"]');
    if (!deleteMenu) return;
    const confirmBtn = deleteMenu.querySelector('.menu-button--danger');
    const cancelBtn = deleteMenu.querySelector('.menu-button:not(.menu-button--danger)');
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => {
            addSpinnerToCreateButton(newConfirmBtn);
            setTimeout(() => {
                if (typeof onConfirmCallback === 'function') {
                    onConfirmCallback();
                }
                hideModal();
                removeSpinnerFromCreateButton(newConfirmBtn);
            }, CREATION_TIMEOUT);
        });
    }
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', () => navigateBack());
    }
}

function showModal(type, data = {}, onConfirm = null) {
    activeModalType = type;
    onConfirmCallback = onConfirm;

    if (!isModuleActive('overlayContainer')) {
        const moduleToActivate = type === 'confirmation' ? 'toggleDeleteMenu' : 'toggleFeedbackMenu';
        activateModule(moduleToActivate);
    }

    if (type === 'confirmation') {
        navigateToMenu('delete');
        populateConfirmationModal(data);
        setupModalEventListeners();
    } else if (type === 'feedback') {
        navigateToMenu('feedback');
    }
}

function hideModal() {
    if (activeModalType) {
        const moduleToDeactivate = activeModalType === 'confirmation' ? 'toggleDeleteMenu' : 'toggleFeedbackMenu';
        deactivateModule(moduleToDeactivate, { source: `hide-modal-${activeModalType}` });
        activeModalType = null;
        onConfirmCallback = null;
    }
}

let currentlyPlayingSound = null;
let soundTimeout = null;
const autoIncrementState = {
    isActive: false,
    intervalId: null,
    timeoutId: null,
    initialDelay: 500,
    repeatInterval: 120
};

const initialState = {
    alarm: { hour: 0, minute: 0, sound: 'classic_beep', sectionId: 'user', sectionName: 'Mis Alarmas' },
    timer: {
        currentTab: 'countdown',
        duration: { hours: 0, minutes: 5, seconds: 0 },
        countTo: { date: new Date(), selectedDate: null, selectedHour: null, selectedMinute: null, timeSelectionStep: 'hour', sound: 'classic_beep' },
        endAction: 'stop',
        sound: 'classic_beep',
        sectionId: 'user',
        sectionName: 'Mis Temporizadores'
    },
    worldClock: { country: '', timezone: '', countryCode: '', isEditing: false, editingId: null }
};

const state = JSON.parse(JSON.stringify(initialState));
state.timer.countTo.date = new Date();

const dropdownMap = {
    'toggleTimerEndActionDropdown': '.menu-timer-end-action',
    'toggleTimerTypeDropdown': '.menu-timer-type'
};

const menuTimeouts = {};
let areGlobalListenersInitialized = false;
let soundSelectionContext = null;
const menuStack = [];

const resetCreateSectionMenu = (menuElement) => {
    if (!menuElement) return;

    menuElement.removeAttribute('data-editing-id');
    const sectionNameInput = menuElement.querySelector('#section-name-input');
    if (sectionNameInput) {
        sectionNameInput.value = '';
        validateField(sectionNameInput.parentElement, true);
    }

    const titleSpan = menuElement.querySelector('.search-content-text span');
    if (titleSpan) {
        titleSpan.textContent = getTranslation('create_new_section', 'general');
        titleSpan.setAttribute('data-translate', 'create_new_section');
    }

    const iconSpan = menuElement.querySelector('.search-content-icon span');
    if (iconSpan) {
        iconSpan.textContent = 'add';
    }

    const actionButton = menuElement.querySelector('.menu-button--primary');
    if (actionButton) {
        actionButton.dataset.action = 'create-section';
        const buttonSpan = actionButton.querySelector('span');
        if (buttonSpan) {
            buttonSpan.textContent = getTranslation('create_section_button', 'general');
            buttonSpan.setAttribute('data-translate', 'create_section_button');
        }
    }

    const availableSections = menuElement.querySelector('[data-menu-part="available-sections"]');
    if (availableSections) {
        availableSections.classList.remove('disabled');
    }
};

function resetOverlayNavigation() {
    if (currentlyPlayingSound) {
        stopSound();
        clearTimeout(soundTimeout);
        const prevButton = currentlyPlayingSound.button;
        if (prevButton) {
            const prevIcon = prevButton.querySelector('.material-symbols-rounded');
            if (prevIcon) prevIcon.textContent = 'play_arrow';
            const prevLink = prevButton.closest('.menu-link');
            if (prevLink) {
                prevLink.classList.remove('sound-playing');
                const prevActions = prevLink.querySelector('.card-menu-container');
                if (prevActions) {
                    prevActions.classList.add('disabled');
                }
            }
        }
        currentlyPlayingSound = null;
    }
    const overlay = document.querySelector('.module-overlay');
    if (!overlay) return;

    // Se eliminaron '.menu-notifications' y '.menu-ringing-list' de la lista de selectores.
    const subMenus = overlay.querySelectorAll('.menu-component[data-menu="sounds"], .menu-component[data-menu="country"], .menu-component[data-menu="timeZone"], .menu-component[data-menu="calendar"], .menu-component[data-menu="timePicker"], .menu-component[data-menu="delete"], .menu-component[data-menu="feedback"], .menu-component[data-menu="feedbackTypes"], .menu-component[data-menu="createSection"]');

    subMenus.forEach(subMenu => {
        subMenu.classList.remove('active');
        subMenu.classList.add('disabled');
        const searchInput = subMenu.querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (subMenu.dataset.menu === 'createSection') {
            resetCreateSectionMenu(subMenu);
        }
    });
    menuStack.length = 0;
}

function navigateToMenu(menuName) {
    const overlay = document.querySelector('.module-overlay');
    if (!overlay) return;
    const currentMenu = overlay.querySelector('[data-menu].active:not(.disabled)');
    if (currentMenu) {
        menuStack.push(currentMenu.dataset.menu);
        currentMenu.classList.remove('active');
        currentMenu.classList.add('disabled');
    }
    const nextMenu = overlay.querySelector(`[data-menu="${menuName}"]`);
    if (nextMenu) {
        nextMenu.classList.remove('disabled');
        nextMenu.classList.add('active');
    }
}

function navigateBack() {
    const overlay = document.querySelector('.module-overlay');
    if (!overlay) return;
    const currentMenu = overlay.querySelector('[data-menu].active:not(.disabled)');
    if (currentMenu) {
        currentMenu.classList.remove('active');
        currentMenu.classList.add('disabled');
        const searchInput = currentMenu.querySelector('input[type="text"]');
        if (['sounds', 'country', 'timeZone', 'createSection'].includes(currentMenu.dataset.menu)) {
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        if (currentMenu.dataset.menu === 'timePicker') {
            const hourList = currentMenu.querySelector('[data-list-type="hours"]');
            const minuteList = currentMenu.querySelector('[data-list-type="minutes"]');
            if (hourList && minuteList) {
                hourList.classList.remove('disabled');
                hourList.classList.add('active');
                minuteList.classList.remove('active');
                minuteList.classList.add('disabled');
            }
        }
    }
    const previousMenuName = menuStack.pop();
    if (previousMenuName) {
        const previousMenu = overlay.querySelector(`[data-menu="${previousMenuName}"]`);
        if (previousMenu) {
            previousMenu.classList.remove('disabled');
            previousMenu.classList.add('active');
        }
    } else {
        deactivateModule('overlayContainer');
    }
}

const toggleDropdown = (action, parentMenu) => {
    const targetSelector = dropdownMap[action];
    if (!targetSelector || !parentMenu) return;
    const targetDropdown = parentMenu.querySelector(targetSelector);
    if (!targetDropdown) return;
    const isCurrentlyOpen = !targetDropdown.classList.contains('disabled');
    document.querySelectorAll('.dropdown-menu-container').forEach(d => {
        if (d !== targetDropdown) {
            d.classList.add('disabled');
        }
    });
    if (!isCurrentlyOpen) {
        targetDropdown.classList.remove('disabled');
    } else {
        targetDropdown.classList.add('disabled');
    }
};

function getMenuElement(menuName) {
    const menuSelectorMap = {
        'menuAlarm': '.menu-component[data-menu="alarm"]',
        'menuTimer': '.menu-component[data-menu="timer"]',
        'menuWorldClock': '.menu-component[data-menu="worldClock"]',
        'menuCalendar': '.menu-component[data-menu="calendar"]',
        'timePicker': '.menu-component[data-menu="timePicker"]',
        'timeZone': '.menu-component[data-menu="timeZone"]',
        'menuFeedbackTypes': '.menu-component[data-menu="feedbackTypes"]',
        'menuFeedback': '.menu-component[data-menu="feedback"]',
        'createSection': '.menu-component[data-menu="createSection"]',
        'menuPaletteColors': '.menu-component[data-menu="paletteColors"]',
        'menuSounds': '.menu-component[data-menu="sounds"]',
        'menuCountry': '.menu-component[data-menu="country"]',
        'menuDelete': '.menu-component[data-menu="delete"]',
        'menuNotifications': '.menu-component[data-menu="notifications"]'
    };
    return document.querySelector(menuSelectorMap[menuName]);
};

function startAutoIncrement(actionFn) {
    stopAutoIncrement();
    autoIncrementState.isActive = true;
    actionFn();
    autoIncrementState.timeoutId = setTimeout(() => {
        autoIncrementState.intervalId = setInterval(actionFn, autoIncrementState.repeatInterval);
    }, autoIncrementState.initialDelay);
}

function stopAutoIncrement() {
    if (autoIncrementState.timeoutId) clearTimeout(autoIncrementState.timeoutId);
    if (autoIncrementState.intervalId) clearInterval(autoIncrementState.intervalId);
    autoIncrementState.isActive = false;
    autoIncrementState.timeoutId = null;
    autoIncrementState.intervalId = null;
}

function addSpinnerToCreateButton(button) {
    button.classList.add('disabled-interactive');
    const originalTextSpan = button.querySelector('span');
    if (originalTextSpan) {
        button.setAttribute('data-original-text', originalTextSpan.textContent);
        originalTextSpan.style.display = 'none';
    }
    const loader = document.createElement('span');
    loader.className = 'material-symbols-rounded spinning';
    loader.textContent = 'progress_activity';
    button.appendChild(loader);
}

function removeSpinnerFromCreateButton(button) {
    button.classList.remove('disabled-interactive');
    const originalText = button.getAttribute('data-original-text');
    const textSpan = button.querySelector('span[data-translate]');
    const loader = button.querySelector('.spinning');
    if (loader) loader.remove();
    if (textSpan) {
        textSpan.textContent = originalText;
        textSpan.style.display = 'inline';
        button.removeAttribute('data-original-text');
    }
}

function validateField(element, condition) {
    if (condition) {
        element.classList.remove('input-error');
        return true;
    } else {
        element.classList.add('input-error');
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        return false;
    }
}

const setAlarmDefaults = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    state.alarm.hour = now.getHours();
    state.alarm.minute = now.getMinutes();
};

const resetAlarmMenu = (menuElement) => {
    setAlarmDefaults();
    state.alarm.sound = 'classic_beep';
    state.alarm.sectionId = 'user';
    state.alarm.sectionName = getTranslation('my_alarms', 'alarms');

    const titleInput = menuElement.querySelector('#alarm-title');
    if (titleInput) {
        titleInput.value = '';
        titleInput.removeAttribute('disabled');
        titleInput.parentElement.classList.remove('disabled-interactive', 'input-error');
    }
    updateAlarmDisplay(menuElement);
    updateDisplay('#alarm-selected-sound', getSoundNameById(state.alarm.sound), menuElement);
    updateDisplay('#alarm-selected-section', state.alarm.sectionName, menuElement);
    const createButton = menuElement.querySelector('.menu-button--primary');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'createAlarm';
        const buttonText = createButton.querySelector('span[data-translate]');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'create_alarm');
            buttonText.textContent = getTranslation('create_alarm', 'alarms');
        }
    }
    menuElement.removeAttribute('data-editing-id');
};

const resetTimerMenu = (menuElement) => {
    state.timer = JSON.parse(JSON.stringify(initialState.timer));
    state.timer.countTo.date = new Date();
    state.timer.sectionId = 'user';
    state.timer.sectionName = getTranslation('my_timers', 'timer');

    const countdownTitle = menuElement.querySelector('#timer-title');
    if (countdownTitle) {
        countdownTitle.value = '';
        countdownTitle.removeAttribute('disabled');
        countdownTitle.parentElement.classList.remove('disabled-interactive', 'input-error');
    }
    const countToTitle = menuElement.querySelector('#countto-title');
    if (countToTitle) {
        countToTitle.value = '';
        countToTitle.removeAttribute('disabled');
        countToTitle.parentElement.classList.remove('disabled-interactive', 'input-error');
    }
    const timerTypeDropdown = menuElement.querySelector('[data-action="toggleTimerTypeDropdown"]');
    if (timerTypeDropdown) {
        timerTypeDropdown.classList.remove('disabled-interactive');
    }
    updateTimerTabView(menuElement);
    updateTimerDurationDisplay(menuElement);
    renderCalendar();
    updateDisplay('#selected-date-display', '-- / -- / ----', menuElement);
    updateDisplay('#selected-hour-display', '--', menuElement);
    updateDisplay('#selected-minute-display', '--', menuElement);
    updateDisplay('#countdown-selected-sound', getSoundNameById(state.timer.sound), menuElement);
    updateDisplay('#count-to-date-selected-sound', getSoundNameById(state.timer.countTo.sound), menuElement);
    updateDisplay('#timer-selected-section', state.timer.sectionName, menuElement);
    const createButton = menuElement.querySelector('.menu-button--primary');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'createTimer';
        const buttonText = createButton.querySelector('span[data-translate]');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'create_timer');
            buttonText.textContent = getTranslation('create_timer', 'timer');
        }
    }
    menuElement.removeAttribute('data-editing-id');
};

const resetWorldClockMenu = (menuElement) => {
    state.worldClock = JSON.parse(JSON.stringify(initialState.worldClock));
    const titleInput = menuElement.querySelector('#worldclock-title');
    if (titleInput) {
        titleInput.value = '';
        titleInput.parentElement.classList.add('disabled-interactive');
        titleInput.setAttribute('disabled', 'true');
        titleInput.parentElement.classList.remove('input-error');
    }
    updateDisplay('#worldclock-selected-country', getTranslation('select_a_country', 'world_clock'), menuElement);
    updateDisplay('#worldclock-selected-timezone', getTranslation('select_a_timezone', 'world_clock'), menuElement);
    const timezoneSelector = menuElement.querySelector('[data-action="open-timezone-menu"]');
    if (timezoneSelector) {
        timezoneSelector.classList.add('disabled-interactive');
        timezoneSelector.classList.remove('input-error');
    }
    const createButton = menuElement.querySelector('.menu-button--primary');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'addWorldClock';
        const buttonText = createButton.querySelector('span[data-translate]');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'add_clock');
            buttonText.textContent = getTranslation('add_clock', 'tooltips');
        }
    }
    menuElement.removeAttribute('data-editing-id');
};

const resetFeedbackMenu = (menuElement) => {
    if (!menuElement) return;
    const feedbackForm = menuElement.querySelector('#feedback-form');
    if (!feedbackForm) return;
    feedbackForm.reset();
    const typeDisplay = feedbackForm.querySelector('#feedback-type-display');
    const typeInput = feedbackForm.querySelector('#feedback-type-value');
    if (typeDisplay && typeInput) {
        const defaultTypeKey = 'feedback_type_contact_support';
        typeDisplay.setAttribute('data-translate', defaultTypeKey);
        typeDisplay.textContent = getTranslation(defaultTypeKey, 'menu');
        typeInput.value = 'contact_support';
    }
    const emailInputParent = feedbackForm.querySelector('#feedback-email').parentElement;
    const messageInputParent = feedbackForm.querySelector('#feedback-text').parentElement;
    if (emailInputParent) {
        emailInputParent.classList.remove('input-error');
    }
    if (messageInputParent) {
        messageInputParent.classList.remove('input-error');
    }
};

const resetSearchableMenu = (menuElement) => {
    if (!menuElement) return;
    const searchInput = menuElement.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.value = '';
        // Dispatch an 'input' event to ensure any attached listeners for clearing results are triggered
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

function resetMenuForOverlay(menuName) {
    const menuElement = getMenuElement(menuName);
    if (!menuElement) return;
    switch (menuName) {
        case 'menuAlarm':
            resetAlarmMenu(menuElement);
            break;
        case 'menuTimer':
            resetTimerMenu(menuElement);
            break;
        case 'menuWorldClock':
            resetWorldClockMenu(menuElement);
            break;
        case 'menuFeedback':
            resetFeedbackMenu(menuElement);
            break;
        case 'menuPaletteColors':
             // MODIFICADO: Llamada segura al módulo cargado dinámicamente
            if (window.colorSearchManager && typeof window.colorSearchManager.clear === 'function') {
                window.colorSearchManager.clear();
            }
            break;
        case 'menuSounds':
        case 'menuCountry':
        case 'menuTimeZone':
            resetSearchableMenu(menuElement);
            break;
        case 'menuCreateSection':
             resetCreateSectionMenu(menuElement);
             break;
        // Other menus like calendar, timePicker, delete, notifications, feedback-types don't hold complex state
        // and are reset implicitly by being hidden and re-initialized, so no specific reset logic is needed here.
    }
}

function prepareAlarmForEdit(alarmData) {
    const menuElement = getMenuElement('menuAlarm');
    if (!menuElement) return;

    state.alarm.hour = alarmData.hour;
    state.alarm.minute = alarmData.minute;
    state.alarm.sound = alarmData.sound;
    state.alarm.sectionId = alarmData.sectionId || 'user';

    const sectionName = alarmData.sectionId ? (window.alarmManager.getAllSections().find(s => s.id === alarmData.sectionId)?.name || getTranslation('my_alarms', 'alarms')) : getTranslation('my_alarms', 'alarms');
    state.alarm.sectionName = sectionName;

    const titleInput = menuElement.querySelector('#alarm-title');
    const sectionSelector = menuElement.querySelector('[data-action="open-create-section-menu"]');

    if (titleInput) {
        if (alarmData.type === 'default') {
            titleInput.value = getTranslation(alarmData.title, 'alarms');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
            if (sectionSelector) sectionSelector.classList.add('disabled-interactive');
        } else {
            titleInput.value = alarmData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
            if (sectionSelector) sectionSelector.classList.remove('disabled-interactive');
        }
    }

    updateAlarmDisplay(menuElement);
    updateDisplay('#alarm-selected-sound', getSoundNameById(alarmData.sound), menuElement);
    updateDisplay('#alarm-selected-section', state.alarm.sectionName, menuElement);

    const createButton = menuElement.querySelector('[data-action="createAlarm"], [data-action="saveAlarmChanges"]');
    if (createButton) {
        createButton.dataset.action = 'saveAlarmChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.textContent = getTranslation('save_changes', 'alarms');
        }
    }
    menuElement.setAttribute('data-editing-id', alarmData.id);
}

function prepareTimerForEdit(timerData) {
    const menuElement = getMenuElement('menuTimer');
    if (!menuElement) return;
    state.timer.currentTab = 'countdown';
    updateTimerTabView(menuElement);
    const durationInMs = timerData.initialDuration;
    const totalSeconds = Math.floor(durationInMs / 1000);
    state.timer.duration.hours = Math.floor(totalSeconds / 3600);
    state.timer.duration.minutes = Math.floor((totalSeconds % 3600) / 60);
    state.timer.duration.seconds = totalSeconds % 60;
    state.timer.sound = timerData.sound;
    state.timer.sectionId = timerData.sectionId || 'user';

    const sectionName = timerData.sectionId ? (window.timerManager.getAllSections().find(s => s.id === timerData.sectionId)?.name || getTranslation('my_timers', 'timer')) : getTranslation('my_timers', 'timer');
    state.timer.sectionName = sectionName;

    const titleInput = menuElement.querySelector('#timer-title');
    const sectionSelector = menuElement.querySelector('[data-action="open-create-section-menu"]');

    if (titleInput) {
        if (timerData.id.startsWith('default-timer-')) {
            titleInput.value = getTranslation(timerData.title, 'timer');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
            if (sectionSelector) sectionSelector.classList.add('disabled-interactive');
        } else {
            titleInput.value = timerData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
            if (sectionSelector) sectionSelector.classList.remove('disabled-interactive');
        }
    }

    menuElement.querySelector('[data-action="toggleTimerTypeDropdown"]').classList.add('disabled-interactive');
    updateTimerDurationDisplay(menuElement);
    updateDisplay('#countdown-selected-sound', getSoundNameById(timerData.sound), menuElement);
    updateDisplay('#timer-selected-section', state.timer.sectionName, menuElement);

    const createButton = menuElement.querySelector('[data-action="createTimer"], [data-action="saveTimerChanges"]');
    if (createButton) {
        createButton.dataset.action = 'saveTimerChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.textContent = getTranslation('save_changes', 'timer');
        }
    }
    menuElement.setAttribute('data-editing-id', timerData.id);
}

function getFormattedDate(date) {
    const location = getCurrentLocation();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    let locale = 'default';
    if (location && location.code.toLowerCase() === 'us') locale = 'en-US';
    return date.toLocaleDateString(locale, options);
}

function prepareCountToDateForEdit(timerData) {
    const menuElement = getMenuElement('menuTimer');
    if (!menuElement) return;
    state.timer.currentTab = 'count_to_date';
    updateTimerTabView(menuElement);
    const titleInput = menuElement.querySelector('#countto-title');
    if (titleInput) {
        if (timerData.id.startsWith('default-timer-')) {
            titleInput.value = getTranslation(timerData.title, 'timer');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
        } else {
            titleInput.value = timerData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
        }
    }
    menuElement.querySelector('[data-action="toggleTimerTypeDropdown"]').classList.add('disabled-interactive');
    state.timer.countTo.sound = timerData.sound;
    const targetDate = new Date(timerData.targetDate);
    state.timer.countTo.date = targetDate;
    state.timer.countTo.selectedDate = targetDate.toISOString();
    state.timer.countTo.selectedHour = targetDate.getHours();
    state.timer.countTo.selectedMinute = targetDate.getMinutes();
    updateDisplay('#selected-date-display', getFormattedDate(targetDate), menuElement);
    updateDisplay('#selected-hour-display', String(targetDate.getHours()).padStart(2, '0'), menuElement);
    updateDisplay('#selected-minute-display', String(targetDate.getMinutes()).padStart(2, '0'), menuElement);
    updateDisplay('#count-to-date-selected-sound', getSoundNameById(timerData.sound), menuElement);
    renderCalendar();
    const createButton = menuElement.querySelector('[data-action="createTimer"], [data-action="saveCountToDateChanges"]');
    if (createButton) {
        createButton.dataset.action = 'saveCountToDateChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.textContent = getTranslation('save_changes', 'timer');
        }
    }
    menuElement.setAttribute('data-editing-id', timerData.id);
}

function prepareWorldClockForEdit(clockData) {
    const menuElement = getMenuElement('menuWorldClock');
    if (!menuElement) return;
    state.worldClock.isEditing = true;
    state.worldClock.editingId = clockData.id;
    state.worldClock.country = clockData.country;
    state.worldClock.timezone = clockData.timezone;
    state.worldClock.countryCode = clockData.countryCode;
    const titleInput = menuElement.querySelector('#worldclock-title');
    if (titleInput) {
        titleInput.value = clockData.title;
        titleInput.removeAttribute('disabled');
        titleInput.parentElement.classList.remove('disabled-interactive');
    }
    updateDisplay('#worldclock-selected-country', clockData.country, menuElement);
    const timezoneSelector = menuElement.querySelector('[data-action="open-timezone-menu"]');
    if (timezoneSelector) {
        timezoneSelector.classList.remove('disabled-interactive');
    }
    const ct = window.ct;
    const tzObject = ct.getTimezone(clockData.timezone);
    const cityName = tzObject.name.split('/').pop().replace(/_/g, ' ');
    const displayName = `(UTC ${tzObject.utcOffsetStr}) ${cityName}`;
    updateDisplay('#worldclock-selected-timezone', displayName, menuElement);
    const createButton = menuElement.querySelector('[data-action="addWorldClock"], [data-action="saveWorldClockChanges"]');
    if (createButton) {
        createButton.dataset.action = 'saveWorldClockChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.textContent = getTranslation('save_changes', 'world_clock_options');
        }
    }
    menuElement.setAttribute('data-editing-id', clockData.id);
}

const initializeAlarmMenu = (menuElement) => {
    if (!menuElement.hasAttribute('data-editing-id')) setAlarmDefaults();
    updateAlarmDisplay(menuElement);
};

const initializeTimerMenu = (menuElement) => {
    updateTimerDurationDisplay(menuElement);
    renderCalendar();
    populateHourSelectionMenu();
};

const initializeWorldClockMenu = (menuElement) => {
    if (!menuElement.hasAttribute('data-editing-id')) {
        const timezoneSelector = menuElement.querySelector('[data-action="open-timezone-menu"]');
        if (timezoneSelector) {
            timezoneSelector.classList.add('disabled-interactive');
        }
    }
};

function initializeMenuForOverlay(menuName) {
    const menuElement = getMenuElement(menuName);
    if (!menuElement) return;
    switch (menuName) {
        case 'menuAlarm': initializeAlarmMenu(menuElement); break;
        case 'menuTimer': initializeTimerMenu(menuElement); break;
        case 'menuWorldClock': initializeWorldClockMenu(menuElement); break;
    }
}

const loadCountriesAndTimezones = () => new Promise((resolve, reject) => {
    if (window.ct) return resolve(window.ct);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/manuelmhtr/countries-and-timezones@latest/dist/index.min.js';
    script.onload = () => window.ct ? resolve(window.ct) : reject(new Error('Library loaded but ct object not found'));
    script.onerror = () => reject(new Error('Failed to load script'));
    document.head.appendChild(script);
});

const updateDisplay = (selector, text, parent = document) => {
    const element = parent.querySelector(selector);
    if (element) element.textContent = text;
};

const updateAlarmDisplay = (parent) => {
    const hour = state.alarm.hour;
    const minute = state.alarm.minute;
    let finalHourText;
    let finalAmPm = '';
    if (use24HourFormat) {
        finalHourText = String(hour).padStart(2, '0');
    } else {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        let hour12 = hour % 12;
        hour12 = hour12 ? hour12 : 12;
        finalHourText = String(hour12).padStart(2, '0');
        finalAmPm = ` ${ampm}`;
    }
    updateDisplay('#hour-display', finalHourText, parent);
    updateDisplay('#minute-display', `${String(minute).padStart(2, '0')}${finalAmPm}`, parent);
};

const updateTimerDurationDisplay = (timerMenu) => {
    if (!timerMenu) return;
    const hourText = getTranslation('h', 'timer');
    const minuteText = getTranslation('min', 'timer');
    const secondText = getTranslation('s', 'timer');
    updateDisplay('#timer-hour-display', `${state.timer.duration.hours} ${hourText}`, timerMenu);
    updateDisplay('#timer-minute-display', `${state.timer.duration.minutes} ${minuteText}`, timerMenu);
    updateDisplay('#timer-second-display', `${state.timer.duration.seconds} ${secondText}`, timerMenu);
};

const updateTimerTabView = (timerMenu) => {
    if (!timerMenu) return;
    const display = timerMenu.querySelector('#timer-type-display');
    const iconDisplay = timerMenu.querySelector('#timer-type-icon');
    if (display && iconDisplay) {
        const isCountdown = state.timer.currentTab === 'countdown';
        const key = isCountdown ? 'countdown' : 'count_to_date';
        display.textContent = getTranslation(key, 'timer');
        iconDisplay.textContent = isCountdown ? 'timer' : 'event';
    }
    const dropdown = timerMenu.querySelector('.menu-timer-type');
    if (dropdown) {
        dropdown.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === state.timer.currentTab) {
                link.classList.add('active');
            }
        });
    }
    timerMenu.querySelectorAll('.menu-content-wrapper[data-tab-content]').forEach(c => {
        c.classList.remove('active');
        c.classList.add('disabled');
    });
    const activeContent = timerMenu.querySelector(`.menu-content-wrapper[data-tab-content="${state.timer.currentTab}"]`);
    if (activeContent) {
        activeContent.classList.remove('disabled');
        activeContent.classList.add('active');
    }
};

const renderCalendar = () => {
    const calendarMenu = getMenuElement('menuCalendar');
    if (!calendarMenu) return;
    const monthYearDisplay = calendarMenu.querySelector('#calendar-month-year');
    const daysContainer = calendarMenu.querySelector('.calendar-days');
    if (!monthYearDisplay || !daysContainer) return;
    const date = state.timer.countTo.date;
    monthYearDisplay.textContent = date.toLocaleDateString(navigator.language, { month: 'long', year: 'numeric' });
    daysContainer.innerHTML = '';
    const firstDayIndex = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) daysContainer.innerHTML += `<div class="day other-month"></div>`;
    for (let i = 1; i <= lastDate; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day'; dayEl.textContent = i; dayEl.dataset.day = i;
        const today = new Date();
        if (i === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) dayEl.classList.add('today');
        if (state.timer.countTo.selectedDate && i === new Date(state.timer.countTo.selectedDate).getDate() && date.getMonth() === new Date(state.timer.countTo.selectedDate).getMonth() && date.getFullYear() === new Date(state.timer.countTo.selectedDate).getFullYear()) {
            dayEl.classList.add('selected');
        }
        daysContainer.appendChild(dayEl);
    }
};

const selectCalendarDate = (day) => {
    state.timer.countTo.selectedDate = new Date(state.timer.countTo.date.getFullYear(), state.timer.countTo.date.getMonth(), day).toISOString();
    const selectedDate = new Date(state.timer.countTo.selectedDate);
    updateDisplay('#selected-date-display', getFormattedDate(selectedDate), getMenuElement('menuTimer'));
    renderCalendar();
    navigateBack();
};

function populateHourSelectionMenu() {
    const timePickerMenu = getMenuElement('timePicker');
    if (!timePickerMenu) return;
    const hourMenu = timePickerMenu.querySelector('.menu-list[data-list-type="hours"]');
    if (!hourMenu) return;
    hourMenu.innerHTML = '';
    if (use24HourFormat) {
        for (let i = 0; i < 24; i++) {
            const hour = String(i).padStart(2, '0');
            const link = document.createElement('div');
            link.className = 'menu-link';
            link.setAttribute('data-action', 'selectTimerHour');
            link.setAttribute('data-hour', i);
            link.innerHTML = `<div class="menu-link-text"><span>${hour}:00</span></div>`;
            hourMenu.appendChild(link);
        }
    } else {
        for (let i = 0; i < 24; i++) {
            const hour12 = i % 12 === 0 ? 12 : i % 12;
            const ampm = i < 12 ? 'AM' : 'PM';
            const displayHour = String(hour12);
            const link = document.createElement('div');
            link.className = 'menu-link';
            link.setAttribute('data-action', 'selectTimerHour');
            link.setAttribute('data-hour', i);
            link.innerHTML = `<div class="menu-link-text"><span>${displayHour}:00 ${ampm}</span></div>`;
            hourMenu.appendChild(link);
        }
    }
}

const populateMinuteSelectionMenu = (hour) => {
    const timePickerMenu = getMenuElement('timePicker');
    if (!timePickerMenu) return;
    const minuteMenu = timePickerMenu.querySelector('.menu-list[data-list-type="minutes"]');
    if (!minuteMenu) return;
    minuteMenu.innerHTML = '';
    for (let j = 0; j < 60; j += 5) {
        let displayHour;
        let displayAmPm = '';
        if (use24HourFormat) {
            displayHour = String(hour).padStart(2, '0');
        } else {
            const h12 = hour % 12 === 0 ? 12 : hour % 12;
            displayHour = String(h12);
            displayAmPm = hour < 12 ? ' AM' : ' PM';
        }
        const minuteStr = String(j).padStart(2, '0');
        const link = document.createElement('div');
        link.className = 'menu-link';
        link.setAttribute('data-action', 'selectTimerMinute');
        link.setAttribute('data-hour', hour);
        link.setAttribute('data-minute', j);
        link.innerHTML = `<div class="menu-link-text"><span>${displayHour}:${minuteStr}${displayAmPm}</span></div>`;
        minuteMenu.appendChild(link);
    }
};

async function populateCountryDropdown(parentMenu) {
    const countryList = parentMenu.querySelector('.country-list-container');
    if (!countryList) return;
    const loadingText = getTranslation('loading_countries', 'world_clock');
    countryList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${loadingText}</span></div>`;
    try {
        const ct = await loadCountriesAndTimezones();
        const countries = Object.values(ct.getAllCountries()).sort((a, b) => a.name.localeCompare(b.name));
        countryList.innerHTML = '';
        countries.forEach(country => {
            const link = document.createElement('div');
            link.className = 'menu-link'; link.setAttribute('data-action', 'selectCountry'); link.setAttribute('data-country-code', country.id);
            link.innerHTML = `<div class="menu-link-icon"><span class="material-symbols-rounded">public</span></div><div class="menu-link-text"><span>${country.name}</span></div>`;
            countryList.appendChild(link);
        });
    } catch (error) {
        countryList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${getTranslation('error_loading_countries', 'world_clock')}</span></div>`;
    }
}

async function populateTimezoneDropdown(parentMenu, countryCode) {
    const timezoneList = parentMenu.querySelector('.timezone-list-container');
    if (!timezoneList) return;
    timezoneList.innerHTML = '';
    try {
        const ct = await loadCountriesAndTimezones();
        const timezones = ct.getTimezonesForCountry(countryCode);
        if (timezones && timezones.length > 0) {
            timezones.forEach(tz => {
                const cityName = tz.name.split('/').pop().replace(/_/g, ' ');
                const displayName = `(UTC ${tz.utcOffsetStr}) ${cityName}`;
                const link = document.createElement('div');
                link.className = 'menu-link'; link.setAttribute('data-action', 'selectTimezone'); link.setAttribute('data-timezone', tz.name);
                link.innerHTML = `<div class="menu-link-icon"><span class="material-symbols-rounded">schedule</span></div><div class="menu-link-text"><span>${displayName}</span></div>`;
                timezoneList.appendChild(link);
            });
        } else {
            timezoneList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${getTranslation('no_timezones_found', 'world_clock')}</span></div>`;
        }
    } catch (error) {
        timezoneList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${getTranslation('error_loading_timezones', 'world_clock')}</span></div>`;
    }
}

async function populateSoundsMenu(context) {
    const soundsMenu = document.querySelector('.menu-component[data-menu="sounds"]');
    if (!soundsMenu) return;
    const uploadContainer = soundsMenu.querySelector('#upload-audio-wrapper');
    const listContainer = soundsMenu.querySelector('#sound-list-wrapper');
    let activeSoundId = '';
    if (context === 'alarm') {
        activeSoundId = state.alarm.sound;
    } else if (context === 'countdown') {
        activeSoundId = state.timer.sound;
    } else if (context === 'count_to_date') {
        activeSoundId = state.timer.countTo.sound;
    }
    await generateSoundList(uploadContainer, listContainer, 'stageSound', activeSoundId);
}

function setupGlobalEventListeners() {
    if (areGlobalListenersInitialized) return;
    document.addEventListener('click', (event) => {
        const soundMenuToggle = event.target.closest('[data-module="toggleSoundsMenu"]');
        if (soundMenuToggle) {
            const context = soundMenuToggle.dataset.context;
            soundSelectionContext = context;
            populateSoundsMenu(context);
        }
    }, true);
    document.addEventListener('click', (event) => {
        const isClickInsideDropdown = event.target.closest('.dropdown-menu-container');
        const isClickOnToggle = event.target.closest('[data-action]')?.dataset.action in dropdownMap;
        if (!isClickInsideDropdown && !isClickOnToggle) {
            document.querySelectorAll('.dropdown-menu-container').forEach(d => d.classList.add('disabled'));
        }
    });
    document.body.addEventListener('input', (event) => {
        const target = event.target;
        if (!['sound-search-input', 'country-search-input', 'timezone-search-input'].includes(target.id)) return;
        const menu = target.closest('.menu-component[data-menu="sounds"], .menu-component[data-menu="country"], .menu-component[data-menu="timeZone"]');
        if (!menu) return;
        const searchTerm = target.value.toLowerCase();
        const creationWrapper = menu.querySelector('.creation-wrapper');
        const resultsWrapper = menu.querySelector('.search-results-wrapper');
        if (!creationWrapper || !resultsWrapper) return;
        if (!searchTerm) {
            resultsWrapper.innerHTML = '';
            resultsWrapper.classList.add('disabled');
            creationWrapper.classList.remove('disabled');
            return;
        }
        creationWrapper.classList.add('disabled');
        resultsWrapper.classList.remove('disabled');
        resultsWrapper.innerHTML = '';
        if (target.id === 'sound-search-input') {
            const originalListContainer = creationWrapper.querySelector('#sound-list-wrapper');
            if (!originalListContainer) return;
            const allSoundItems = originalListContainer.querySelectorAll('.menu-link');
            const filteredItems = Array.from(allSoundItems).filter(item => {
                const textSpan = item.querySelector('.menu-link-text span');
                if (!textSpan) return false;
                let itemName = '';
                const translateKey = textSpan.getAttribute('data-translate');
                if (translateKey && typeof window.getTranslation === 'function') {
                    itemName = window.getTranslation(translateKey, 'sounds');
                }
                if (!itemName || itemName === translateKey) {
                    itemName = textSpan.textContent;
                }
                const matches = itemName.toLowerCase().includes(searchTerm);
                return matches;
            });
            if (filteredItems.length > 0) {
                const newList = document.createElement('div');
                newList.className = 'menu-list';
                const headers = originalListContainer.querySelectorAll('.menu-content-header-sm');
                if (headers.length > 0) {
                    headers.forEach(header => {
                        const sectionItems = [];
                        let nextElement = header.nextElementSibling;
                        while (nextElement && !nextElement.classList.contains('menu-content-header-sm')) {
                            if (filteredItems.includes(nextElement)) {
                                sectionItems.push(nextElement);
                            }
                            nextElement = nextElement.nextElementSibling;
                        }
                        if (sectionItems.length > 0) {
                            const headerClone = header.cloneNode(true);
                            newList.appendChild(headerClone);
                            sectionItems.forEach(item => {
                                const itemClone = item.cloneNode(true);
                                newList.appendChild(itemClone);
                            });
                        }
                    });
                } else {
                    filteredItems.forEach(item => {
                        const itemClone = item.cloneNode(true);
                        newList.appendChild(itemClone);
                    });
                }
                if (newList.hasChildNodes()) {
                    resultsWrapper.appendChild(newList);
                } else {
                    resultsWrapper.innerHTML = `<p class="no-results-message">${getTranslation('no_results', 'search')} "${searchTerm}"</p>`;
                }
            } else {
                resultsWrapper.innerHTML = `<p class="no-results-message">${getTranslation('no_results', 'search')} "${searchTerm}"</p>`;
            }
        } else {
            const originalListContainer = creationWrapper.querySelector('.menu-list, .country-list-container, .timezone-list-container');
            if (!originalListContainer) return;
            const allItems = originalListContainer.querySelectorAll('.menu-link');
            const filteredItems = Array.from(allItems).filter(item => {
                const itemName = item.querySelector('.menu-link-text span')?.textContent.toLowerCase();
                return itemName && itemName.includes(searchTerm);
            });
            if (filteredItems.length > 0) {
                const newList = document.createElement('div');
                newList.className = 'menu-list';
                filteredItems.forEach(item => newList.appendChild(item.cloneNode(true)));
                resultsWrapper.appendChild(newList);
            } else {
                resultsWrapper.innerHTML = `<p class="no-results-message">${getTranslation('no_results', 'search')} "${searchTerm}"</p>`;
            }
        }
    });

    document.addEventListener('timeFormatChanged', () => {
        const timePickerMenu = getMenuElement('timePicker');
        if (timePickerMenu && timePickerMenu.classList.contains('active')) {
            populateHourSelectionMenu();

            const minuteList = timePickerMenu.querySelector('.menu-list[data-list-type="minutes"]');

            if (minuteList && minuteList.classList.contains('active')) {
                if (state.timer.countTo.selectedHour !== null) {
                    populateMinuteSelectionMenu(state.timer.countTo.selectedHour);
                }
            }
        }
    });

    document.body.addEventListener('click', (event) => {
        const parentMenu = event.target.closest('.menu-component');
        if (!parentMenu || autoIncrementState.isActive) return;
        handleMenuClick(event, parentMenu);
    });
    const incrementDecrementActions = {
        'increaseHour': (p) => { state.alarm.hour = (state.alarm.hour + 1) % 24; updateAlarmDisplay(p); },
        'decreaseHour': (p) => { state.alarm.hour = (state.alarm.hour - 1 + 24) % 24; updateAlarmDisplay(p); },
        'increaseMinute': (p) => { state.alarm.minute = (state.alarm.minute + 1) % 60; updateAlarmDisplay(p); },
        'decreaseMinute': (p) => { state.alarm.minute = (state.alarm.minute - 1 + 60) % 60; updateAlarmDisplay(p); },
        'increaseTimerHour': (p) => { state.timer.duration.hours = (state.timer.duration.hours + 1) % 100; updateTimerDurationDisplay(p); },
        'decreaseTimerHour': (p) => { state.timer.duration.hours = (state.timer.duration.hours - 1 + 100) % 100; updateTimerDurationDisplay(p); },
        'increaseTimerMinute': (p) => { state.timer.duration.minutes = (state.timer.duration.minutes + 1) % 60; updateTimerDurationDisplay(p); },
        'decreaseTimerMinute': (p) => { state.timer.duration.minutes = (state.timer.duration.minutes - 1 + 60) % 60; updateTimerDurationDisplay(p); },
        'increaseTimerSecond': (p) => { state.timer.duration.seconds = (state.timer.duration.seconds + 1) % 60; updateTimerDurationDisplay(p); },
        'decreaseTimerSecond': (p) => { state.timer.duration.seconds = (state.timer.duration.seconds - 1 + 60) % 60; updateTimerDurationDisplay(p); },
    };
    Object.keys(incrementDecrementActions).forEach(action => {
        document.querySelectorAll(`[data-action="${action}"]`).forEach(button => {
            const parentMenu = button.closest('.menu-component[data-menu="alarm"], .menu-component[data-menu="timer"]');
            if (!parentMenu) return;
            const actionFn = () => incrementDecrementActions[action](parentMenu);
            button.addEventListener('mousedown', () => startAutoIncrement(actionFn));
            button.addEventListener('touchstart', (e) => { e.preventDefault(); startAutoIncrement(actionFn); });
        });
    });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(eventType => {
        document.addEventListener(eventType, stopAutoIncrement);
    });
    areGlobalListenersInitialized = true;
}

async function handleMenuClick(event, parentMenu) {
    const dayTarget = event.target.closest('.calendar-days .day:not(.other-month)');
    if (dayTarget && dayTarget.dataset.day) {
        event.stopPropagation();
        selectCalendarDate(parseInt(dayTarget.dataset.day, 10));
        return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'edit-section') {
        event.stopPropagation();
        const menuLink = target.closest('.menu-link');
        const sectionId = menuLink.dataset.sectionId;
        const sectionName = menuLink.dataset.sectionName;
        const createSectionMenu = document.querySelector('.menu-component[data-menu="createSection"]');

        createSectionMenu.setAttribute('data-editing-id', sectionId);
        createSectionMenu.querySelector('#section-name-input').value = sectionName;

        const titleSpan = createSectionMenu.querySelector('.search-content-text span');
        titleSpan.textContent = getTranslation('edit_section', 'general');
        titleSpan.setAttribute('data-translate', 'edit_section');

        const iconSpan = createSectionMenu.querySelector('.search-content-icon span');
        iconSpan.textContent = 'edit';

        const saveButton = createSectionMenu.querySelector('.menu-button--primary');
        saveButton.dataset.action = 'save-section-changes';
        const buttonSpan = saveButton.querySelector('span');
        buttonSpan.textContent = getTranslation('save_changes', 'general');
        buttonSpan.setAttribute('data-translate', 'save_changes');

        const availableSections = createSectionMenu.querySelector('[data-menu-part="available-sections"]');
        if (availableSections) {
            availableSections.classList.add('disabled');
        }

        return;
    }

    if (action === 'save-section-changes') {
        const context = soundSelectionContext;
        if (context === 'alarm' && window.alarmManager && window.alarmManager.isAnyAlarmRinging()) {
            showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }
        if (context === 'timer' && window.timerManager && window.timerManager.isAnyTimerRinging()) {
            showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }
        const saveButton = target;
        addSpinnerToCreateButton(saveButton);

        setTimeout(() => {
            const createSectionMenu = document.querySelector('.menu-component[data-menu="createSection"]');
            const sectionId = createSectionMenu.getAttribute('data-editing-id');
            const sectionNameInput = createSectionMenu.querySelector('#section-name-input');
            const newSectionName = sectionNameInput.value.trim();

            if (!newSectionName) {
                validateField(sectionNameInput.parentElement, false);
                removeSpinnerFromCreateButton(saveButton);
                return;
            }

            if (context === 'alarm') {
                if (window.alarmManager && typeof window.alarmManager.updateAlarmSection === 'function') {
                    window.alarmManager.updateAlarmSection(sectionId, newSectionName);
                }
            } else if (context === 'timer') {
                if (window.timerManager && typeof window.timerManager.updateTimerSection === 'function') {
                    window.timerManager.updateTimerSection(sectionId, newSectionName);
                } else {
                    // Fallback por si la función no se ha exportado correctamente aún
                    console.warn('timerManager.updateTimerSection no está disponible.');
                }
            }

            resetCreateSectionMenu(createSectionMenu);
            populateSectionsList(context);
            navigateBack();
            removeSpinnerFromCreateButton(saveButton);
        }, 500);
        return;
    }


    if (action === 'delete-section') {
        const sectionId = target.closest('.menu-link').dataset.sectionId;
        const sectionName = target.closest('.menu-link').dataset.sectionName;
        const context = soundSelectionContext;

        showModal('confirmation', { type: 'section', name: sectionName }, () => {
            if (context === 'alarm') {
                if (window.alarmManager && typeof window.alarmManager.deleteAlarmSection === 'function') {
                    window.alarmManager.deleteAlarmSection(sectionId);
                }
            } else if (context === 'timer') {
                if (window.timerManager && typeof window.timerManager.deleteTimerSection === 'function') {
                    window.timerManager.deleteTimerSection(sectionId);
                }
            }
            populateSectionsList(context);
        });
        return;
    }
    if (action === 'select-section') {
        const sectionId = target.dataset.sectionId;
        const sectionName = target.querySelector('.menu-link-text span').textContent;
        const context = soundSelectionContext;
        if (context === 'alarm') {
            state.alarm.sectionId = sectionId;
            state.alarm.sectionName = sectionName;
            updateDisplay('#alarm-selected-section', sectionName, getMenuElement('menuAlarm'));
        } else if (context === 'timer') {
            state.timer.sectionId = sectionId;
            state.timer.sectionName = sectionName;
            updateDisplay('#timer-selected-section', sectionName, getMenuElement('menuTimer'));
        }
        navigateBack();
        return;
    }

    if (action === 'open-create-section-menu') {
        if (target.dataset.context) {
            const context = target.dataset.context;
            soundSelectionContext = context;
            navigateToMenu('createSection');
            populateSectionsList(context);
        }
        return;
    }

    if (action === 'create-section') {
        const context = soundSelectionContext;
        if (context === 'alarm' && window.alarmManager && window.alarmManager.isAnyAlarmRinging()) {
            showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }
        if (context === 'timer' && window.timerManager && window.timerManager.isAnyTimerRinging()) {
            showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }

        const createButton = target;
        addSpinnerToCreateButton(createButton);

        const sectionNameInput = parentMenu.querySelector('#section-name-input');
        const sectionName = sectionNameInput.value.trim();

        if (!sectionName) {
            validateField(sectionNameInput.parentElement, false);
            removeSpinnerFromCreateButton(createButton);
            return;
        } else {
            validateField(sectionNameInput.parentElement, true);
        }

        let existingSections = [];
        if (context === 'alarm') {
            existingSections = window.alarmManager.getAllSections();
        } else if (context === 'timer') {
            existingSections = window.timerManager.getAllSections();
        }

        const isDuplicate = existingSections.some(section => section.name.toLowerCase() === sectionName.toLowerCase());

        if (isDuplicate) {
            showDynamicIslandNotification('error', 'duplicate_section_name', 'notifications', { name: sectionName });
            removeSpinnerFromCreateButton(createButton);
            validateField(sectionNameInput.parentElement, false);
            return;
        }

        setTimeout(() => {
            let newSection;
            if (context === 'alarm') {
                newSection = window.alarmManager.createAlarmSection(sectionName);
                if (newSection) {
                    state.alarm.sectionId = newSection.id;
                    state.alarm.sectionName = newSection.name;
                    updateDisplay('#alarm-selected-section', newSection.name, getMenuElement('menuAlarm'));
                    navigateBack();
                }
            } else if (context === 'timer') {
                newSection = window.timerManager.createTimerSection(sectionName);
                if (newSection) {
                    state.timer.sectionId = newSection.id;
                    state.timer.sectionName = newSection.name;
                    updateDisplay('#timer-selected-section', newSection.name, getMenuElement('menuTimer'));
                    navigateBack();
                }
            }
            removeSpinnerFromCreateButton(createButton);
        }, 500);
        return;
    }

    if (action === 'open-feedback-types-menu') {
        navigateToMenu('feedbackTypes');
        return;
    }
    if (action === 'select-feedback-type') {
        event.stopPropagation();
        const option = target.closest('[data-value]');
        if (!option) return;
        const value = option.dataset.value;
        const textSpan = option.querySelector('span[data-translate]');
        const feedbackMenu = document.querySelector('.menu-component[data-menu="feedback"]');
        if (!feedbackMenu) return;
        const display = feedbackMenu.querySelector('#feedback-type-display');
        const hiddenInput = feedbackMenu.querySelector('#feedback-type-value');
        if (display && textSpan && hiddenInput) {
            hiddenInput.value = value;
            const translateKey = textSpan.getAttribute('data-translate');
            const translateCategory = textSpan.getAttribute('data-translate-category');
            if (translateKey && translateCategory) {
                display.setAttribute('data-translate', translateKey);
                display.setAttribute('data-translate-category', translateCategory);
                display.textContent = getTranslation(translateKey, translateCategory);
            } else {
                display.textContent = textSpan.textContent;
            }
            navigateBack();
        }
        return;
    }
    const testSoundActions = ['test-sound', 'previewAlarmSound', 'previewCountdownSound', 'previewCountToDateSound'];
    if (testSoundActions.includes(action)) {
        event.stopPropagation();
        let soundId;
        const soundTestButton = target.closest('.sound-test-btn') || target;
        const menuLink = soundTestButton.closest('.menu-link');
        if (action === 'test-sound') {
            soundId = menuLink.dataset.soundId;
        } else {
            if (action === 'previewAlarmSound') soundId = state.alarm.sound;
            if (action === 'previewCountdownSound') soundId = state.timer.sound;
            if (action === 'previewCountToDateSound') soundId = state.timer.countTo.sound;
        }
        const icon = soundTestButton.querySelector('.material-symbols-rounded');
        if (currentlyPlayingSound && currentlyPlayingSound.id === soundId) {
            stopSound();
            clearTimeout(soundTimeout);
            if (icon) icon.textContent = 'play_arrow';
            if (menuLink) {
                menuLink.classList.remove('sound-playing');
                const menuContainer = menuLink.querySelector('.card-menu-container');
                if (menuContainer) {
                    menuContainer.classList.add('disabled');
                }
            }
            currentlyPlayingSound = null;
        } else {
            if (currentlyPlayingSound) {
                stopSound();
                clearTimeout(soundTimeout);
                const prevButton = currentlyPlayingSound.button;
                if (prevButton) {
                    const prevIcon = prevButton.querySelector('.material-symbols-rounded');
                    if (prevIcon) prevIcon.textContent = 'play_arrow';
                    const prevLink = prevButton.closest('.menu-link');
                    if (prevLink) {
                        prevLink.classList.remove('sound-playing');
                        const prevActions = prevLink.querySelector('.card-menu-container');
                        if (prevActions) {
                            prevActions.classList.add('disabled');
                        }
                    }
                }
            }
            playSound(soundId);
            if (icon) icon.textContent = 'stop';
            if (menuLink) menuLink.classList.add('sound-playing');
            currentlyPlayingSound = { id: soundId, button: soundTestButton };
            soundTimeout = setTimeout(() => {
                if (currentlyPlayingSound && currentlyPlayingSound.id === soundId) {
                    stopSound();
                    if (icon) icon.textContent = 'play_arrow';
                    if (menuLink) {
                        menuLink.classList.remove('sound-playing');
                        if (menuLink.dataset.hovering !== 'true') {
                            const menuContainer = menuLink.querySelector('.card-menu-container');
                            if (menuContainer) {
                                menuContainer.classList.add('disabled');
                            }
                        }
                    }
                    currentlyPlayingSound = null;
                }
            }, 3000);
        }
        return;
    }
    if (dropdownMap[action]) {
        toggleDropdown(action, parentMenu);
        return;
    }
    switch (action) {
        case 'selectTimerTab': {
            event.stopPropagation();
            const tab = target.dataset.tab;
            if (tab) {
                state.timer.currentTab = tab;
                updateTimerTabView(parentMenu);
                target.closest('.dropdown-menu-container')?.classList.add('disabled');
            }
            break;
        }
        case 'open-calendar-menu':
            navigateToMenu('calendar');
            renderCalendar();
            break;
        case 'open-time-picker-menu':
            navigateToMenu('timePicker');
            populateHourSelectionMenu();
            break;
        case 'open-country-menu':
            navigateToMenu('country');
            populateCountryDropdown(document.querySelector('.menu-component[data-menu="country"]'));
            break;
        case 'open-timezone-menu':
            if (target.classList.contains('disabled-interactive')) return;
            navigateToMenu('timeZone');
            populateTimezoneDropdown(document.querySelector('.menu-component[data-menu="timeZone"]'), state.worldClock.countryCode);
            break;
        case 'open-sounds-menu':
            if (target.dataset.context) {
                const context = target.dataset.context;
                soundSelectionContext = context;
                navigateToMenu('sounds');
                populateSoundsMenu(context);
            }
            break;
        case 'back-to-previous-menu':
            const createSectionMenu = parentMenu.closest('.menu-component[data-menu="createSection"]');
            if (createSectionMenu && createSectionMenu.hasAttribute('data-editing-id')) {
                resetCreateSectionMenu(createSectionMenu);
            } else {
                navigateBack();
            }
            break;
        case 'stageSound': {
            event.stopPropagation();
            const selectedLink = target.closest('.menu-link');
            if (!selectedLink) return;
            const allLinks = parentMenu.querySelectorAll('.menu-link[data-action="stageSound"]');
            allLinks.forEach(link => link.classList.remove('active'));
            selectedLink.classList.add('active');
            break;
        }
        case 'select-audio': {
            event.stopPropagation();
            const soundsMenu = document.querySelector('.menu-component[data-menu="sounds"]');
            const stagedSoundLink = soundsMenu.querySelector('.menu-link[data-action="stageSound"].active');
            if (stagedSoundLink) {
                const soundId = stagedSoundLink.dataset.soundId;
                const soundName = getSoundNameById(soundId);
                if (soundSelectionContext === 'alarm') {
                    state.alarm.sound = soundId;
                    updateDisplay('#alarm-selected-sound', soundName, getMenuElement('menuAlarm'));
                } else if (soundSelectionContext === 'countdown') {
                    state.timer.sound = soundId;
                    updateDisplay('#countdown-selected-sound', soundName, getMenuElement('menuTimer'));
                } else if (soundSelectionContext === 'count_to_date') {
                    state.timer.countTo.sound = soundId;
                    updateDisplay('#count-to-date-selected-sound', soundName, getMenuElement('menuTimer'));
                }
                navigateBack();
            }
            break;
        }
        case 'selectCountry':
            event.stopPropagation();
            const countryCode = target.closest('.menu-link').getAttribute('data-country-code');
            state.worldClock.country = target.closest('.menu-link').querySelector('.menu-link-text span')?.textContent;
            state.worldClock.countryCode = countryCode;
            const worldClockMenu = getMenuElement('menuWorldClock');
            updateDisplay('#worldclock-selected-country', state.worldClock.country, worldClockMenu);
            const timezoneSelector = worldClockMenu.querySelector('[data-action="open-timezone-menu"]');
            timezoneSelector.classList.remove('disabled-interactive');
            updateDisplay('#worldclock-selected-timezone', getTranslation('select_a_timezone', 'world_clock'), worldClockMenu);
            state.worldClock.timezone = '';
            const titleInput = worldClockMenu.querySelector('#worldclock-title');
            if (titleInput) {
                titleInput.value = state.worldClock.country;
                titleInput.removeAttribute('disabled');
                titleInput.parentElement.classList.remove('disabled-interactive');
            }
            navigateBack();
            break;
        case 'selectTimezone':
            event.stopPropagation();
            state.worldClock.timezone = target.closest('.menu-link').getAttribute('data-timezone');
            const tzDisplayName = target.closest('.menu-link').querySelector('.menu-link-text span')?.textContent;
            updateDisplay('#worldclock-selected-timezone', tzDisplayName, getMenuElement('menuWorldClock'));
            navigateBack();
            break;
        case 'selectTimerHour': {
            event.stopPropagation();
            const hour = parseInt(target.dataset.hour, 10);
            state.timer.countTo.selectedHour = hour;
            let displayHour;
            let displayAmPm = '';
            if (use24HourFormat) {
                displayHour = String(hour).padStart(2, '0');
            } else {
                const h12 = hour % 12 === 0 ? 12 : hour % 12;
                displayHour = String(h12);
                displayAmPm = hour < 12 ? ' AM' : ' PM';
            }
            updateDisplay('#selected-hour-display', displayHour, getMenuElement('menuTimer'));
            const minuteDisplay = getMenuElement('menuTimer').querySelector('#selected-minute-display');
            if (minuteDisplay) {
                minuteDisplay.textContent = '--' + displayAmPm;
            }
            const hourList = parentMenu.querySelector('[data-list-type="hours"]');
            const minuteList = parentMenu.querySelector('[data-list-type="minutes"]');
            if (hourList && minuteList) {
                hourList.classList.remove('active');
                hourList.classList.add('disabled');
                minuteList.classList.remove('disabled');
                minuteList.classList.add('active');
                populateMinuteSelectionMenu(hour);
            }
            break;
        }
        case 'selectTimerMinute': {
            event.stopPropagation();
            const minute = parseInt(target.dataset.minute, 10);
            state.timer.countTo.selectedMinute = minute;
            let displayAmPm = '';
            if (!use24HourFormat) {
                displayAmPm = state.timer.countTo.selectedHour < 12 ? ' AM' : ' PM';
            }
            const minuteDisplay = getMenuElement('menuTimer').querySelector('#selected-minute-display');
            if (minuteDisplay) {
                minuteDisplay.textContent = String(minute).padStart(2, '0') + displayAmPm;
            }
            navigateBack();
            break;
        }
        case 'upload-audio':
            event.stopPropagation();
            handleAudioUpload(() => populateSoundsMenu(soundSelectionContext));
            break;
        case 'delete-user-audio':
            event.stopPropagation();
            deleteUserAudio(target.closest('.menu-link').dataset.soundId, () => populateSoundsMenu(soundSelectionContext));
            break;
        case 'createAlarm': {
            if (window.alarmManager && window.alarmManager.getAlarmCount() >= window.alarmManager.getAlarmLimit()) {
                showDynamicIslandNotification('error', 'limit_reached_message_premium', 'notifications', { type: getTranslation('alarms', 'tooltips') });
                return;
            }
            const alarmTitleInput = parentMenu.querySelector('#alarm-title');
            if (!validateField(alarmTitleInput.parentElement, alarmTitleInput.value.trim())) return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                window.alarmManager?.createAlarm(alarmTitleInput.value.trim(), state.alarm.hour, state.alarm.minute, state.alarm.sound, state.alarm.sectionId);
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
        case 'createTimer': {
            if (window.timerManager && window.timerManager.getTimersCount() >= window.timerManager.getTimerLimit()) {
                showDynamicIslandNotification('error', 'limit_reached_message_premium', 'notifications', { type: getTranslation('timer', 'tooltips') });
                return;
            }
            if (state.timer.currentTab === 'countdown') {
                const timerTitleInput = parentMenu.querySelector('#timer-title');
                const { hours, minutes, seconds } = state.timer.duration;
                if (!validateField(timerTitleInput.parentElement, timerTitleInput.value.trim()) || (hours === 0 && minutes === 0 && seconds === 0)) return;
                addSpinnerToCreateButton(target);
                setTimeout(() => {
                    addTimerAndRender({ type: 'countdown', title: timerTitleInput.value.trim(), duration: (hours * 3600 + minutes * 60 + seconds) * 1000, sound: state.timer.sound }, state.timer.sectionId);
                    deactivateModule('overlayContainer');
                }, CREATION_TIMEOUT);
            } else {
                const eventTitleInput = parentMenu.querySelector('#countto-title');
                const { selectedDate, selectedHour, selectedMinute } = state.timer.countTo;
                if (!validateField(eventTitleInput.parentElement, eventTitleInput.value.trim()) || !selectedDate || typeof selectedHour !== 'number' || typeof selectedMinute !== 'number') return;
                addSpinnerToCreateButton(target);
                setTimeout(() => {
                    const targetDate = new Date(selectedDate);
                    targetDate.setHours(selectedHour, selectedMinute, 0, 0);
                    addTimerAndRender({ type: 'count_to_date', title: eventTitleInput.value.trim(), targetDate: targetDate.toISOString(), sound: state.timer.countTo.sound }, state.timer.sectionId);
                    deactivateModule('overlayContainer');
                }, CREATION_TIMEOUT);
            }
            break;
        }
        case 'addWorldClock': {
            if (window.worldClockManager && window.worldClockManager.getClockCount() >= window.worldClockManager.getClockLimit()) {
                showDynamicIslandNotification('error', 'limit_reached_message_premium', 'notifications', { type: getTranslation('world_clock', 'tooltips') });
                return;
            }
            const clockTitleInput = parentMenu.querySelector('#worldclock-title');
            const { country, timezone } = state.worldClock;
            if (!validateField(clockTitleInput.parentElement, clockTitleInput.value.trim()) || !country || !timezone) return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                window.worldClockManager?.createAndStartClockCard(clockTitleInput.value.trim(), country, timezone);
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
        case 'saveAlarmChanges': {
            const editingId = parentMenu.getAttribute('data-editing-id');
            if (!editingId) return;
            const alarmTitleInput = parentMenu.querySelector('#alarm-title');
            if (!validateField(alarmTitleInput.parentElement, alarmTitleInput.value.trim())) return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                window.alarmManager?.updateAlarm(editingId, {
                    title: alarmTitleInput.value.trim(),
                    hour: state.alarm.hour,
                    minute: state.alarm.minute,
                    sound: state.alarm.sound,
                    sectionId: state.alarm.sectionId // <- Añadido
                });
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
        case 'saveTimerChanges': {
            const editingId = parentMenu.getAttribute('data-editing-id');
            if (!editingId) return;
            const timerTitleInput = parentMenu.querySelector('#timer-title');
            const { hours, minutes, seconds } = state.timer.duration;
            if (!validateField(timerTitleInput.parentElement, timerTitleInput.value.trim()) || (hours === 0 && minutes === 0 && seconds === 0)) return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                updateTimer(editingId, {
                    title: timerTitleInput.value.trim(),
                    duration: (hours * 3600 + minutes * 60 + seconds) * 1000,
                    sound: state.timer.sound,
                    sectionId: state.timer.sectionId // <- Añadido
                });
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
        case 'saveCountToDateChanges': {
            const editingId = parentMenu.getAttribute('data-editing-id');
            if (!editingId) return;
            const eventTitleInput = parentMenu.querySelector('#countto-title');
            const { selectedDate, selectedHour, selectedMinute } = state.timer.countTo;
            if (!validateField(eventTitleInput.parentElement, eventTitleInput.value.trim()) || !selectedDate || typeof selectedHour !== 'number' || typeof selectedMinute !== 'number') return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                const targetDate = new Date(selectedDate);
                targetDate.setHours(selectedHour, selectedMinute, 0, 0);
                updateTimer(editingId, {
                    title: eventTitleInput.value.trim(),
                    targetDate: targetDate.toISOString(),
                    sound: state.timer.countTo.sound
                });
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
        case 'saveWorldClockChanges': {
            const editingId = parentMenu.getAttribute('data-editing-id');
            if (!editingId) return;
            const clockTitleInput = parentMenu.querySelector('#worldclock-title');
            const { country, timezone } = state.worldClock;
            if (!validateField(clockTitleInput.parentElement, clockTitleInput.value.trim()) || !country || !timezone) return;
            addSpinnerToCreateButton(target);
            setTimeout(() => {
                window.worldClockManager?.updateClockCard(editingId, {
                    title: clockTitleInput.value.trim(),
                    country: country,
                    timezone: timezone
                });
                deactivateModule('overlayContainer');
            }, CREATION_TIMEOUT);
            break;
        }
    }
}
function populateSectionsList(context) {
    const menu = document.querySelector('.menu-component[data-menu="createSection"]');
    if (!menu) return;
    const listContainer = menu.querySelector('.sections-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    let sections = [];
    let defaultSectionName = '';
    let defaultSectionId = 'user';

    if (context === 'alarm') {
        sections = window.alarmManager.getAllSections();
        defaultSectionName = getTranslation('my_alarms', 'alarms');
    } else if (context === 'timer') {
        sections = window.timerManager.getAllSections();
        defaultSectionName = getTranslation('my_timers', 'timer');
    }
    const defaultOption = document.createElement('div');
    defaultOption.className = 'menu-link';
    defaultOption.dataset.action = 'select-section';
    defaultOption.dataset.sectionId = defaultSectionId;
    defaultOption.innerHTML = `<div class="menu-link-icon"><span class="material-symbols-rounded">folder</span></div>
                             <div class="menu-link-text"><span>${defaultSectionName}</span></div>`;
    listContainer.appendChild(defaultOption);

    sections.forEach(section => {
        const option = document.createElement('div');
        option.className = 'menu-link';
        option.dataset.action = 'select-section';
        option.dataset.sectionId = section.id;
        option.dataset.sectionName = section.name;
        option.innerHTML = `
            <div class="menu-link-icon"><span class="material-symbols-rounded">folder</span></div>
            <div class="menu-link-text"><span>${section.name}</span></div>
            <div class="card-menu-container disabled">
                <button class="card-action-btn" data-action="edit-section">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="card-action-btn" data-action="delete-section">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>`;
        listContainer.appendChild(option);

        const menuContainer = option.querySelector('.card-menu-container');

        option.addEventListener('mouseenter', () => {
            menuContainer.classList.remove('disabled');
        });

        option.addEventListener('mouseleave', () => {
            menuContainer.classList.add('disabled');
        });
    });
}
function initializeFeedbackForm() {
    const feedbackMenu = document.querySelector('.menu-component[data-menu="feedback"]');
    if (!feedbackMenu) return;
    const submitButton = feedbackMenu.querySelector('[data-action="submit-feedback-form"]');
    if (!submitButton) return;
    submitButton.addEventListener('click', async function (e) {
        e.preventDefault();
        const messageInput = feedbackMenu.querySelector('#feedback-text');
        const emailInput = feedbackMenu.querySelector('#feedback-email');
        const typeInput = feedbackMenu.querySelector('#feedback-type-value');
        let isValid = true;
        if (messageInput.value.trim() === '') {
            validateField(messageInput.parentElement, false);
            isValid = false;
        } else {
            validateField(messageInput.parentElement, true);
        }
        if (emailInput.value.trim() === '' || !/^\S+@\S+\.\S+$/.test(emailInput.value)) {
            validateField(emailInput.parentElement, false);
            isValid = false;
        } else {
            validateField(emailInput.parentElement, true);
        }
        if (!isValid) {
            if (navigator.vibrate) navigator.vibrate(100);
            return;
        }
        addSpinnerToCreateButton(submitButton);
        setTimeout(async () => {
            try {
                const formData = new FormData();
                formData.append('feedback_type', typeInput.value);
                formData.append('email', emailInput.value);
                formData.append('feedback_text', messageInput.value);
                const uuid = localStorage.getItem('user-unique-id');
                if (uuid) {
                    formData.append('uuid', uuid);
                }
                const feedbackUUID = generateFeedbackUUID();
                formData.append('feedback_uuid', feedbackUUID);

                const response = await fetch('api/submit-feedback.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    showDynamicIslandNotification('success', 'feedback_success_sent', 'notifications');
                    emailInput.value = '';
                    messageInput.value = '';
                    typeInput.value = 'contact_support';
                    const typeDisplay = feedbackMenu.querySelector('#feedback-type-display');
                    if (typeDisplay) {
                        typeDisplay.setAttribute('data-translate', 'feedback_type_contact_support');
                        typeDisplay.textContent = getTranslation('feedback_type_contact_support', 'menu');
                    }
                    deactivateModule('toggleFeedbackMenu');
                } else {
                    showDynamicIslandNotification('error', result.message || 'feedback_error_sending', 'notifications');
                }
            } catch (error) {
                showDynamicIslandNotification('error', 'feedback_error_server', 'notifications');
            } finally {
                removeSpinnerFromCreateButton(submitButton);
            }
        }, CREATION_TIMEOUT);
    });
    const cancelButton = feedbackMenu.querySelector('[data-action="cancel-feedback"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            deactivateModule('toggleFeedbackMenu');
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeFeedbackForm);
window.getCurrentlyPlayingSoundId = () => currentlyPlayingSound ? currentlyPlayingSound.id : null;

function initMenuInteractions() {
    setupGlobalEventListeners();
}

export {
    populateConfirmationModal, setupModalEventListeners, showModal, hideModal,
    resetOverlayNavigation, navigateToMenu, navigateBack, getMenuElement,
    startAutoIncrement, stopAutoIncrement, addSpinnerToCreateButton,
    removeSpinnerFromCreateButton, validateField, prepareAlarmForEdit,
    prepareTimerForEdit, prepareCountToDateForEdit, prepareWorldClockForEdit,
    initializeMenuForOverlay, resetMenuForOverlay, populateHourSelectionMenu,
    initMenuInteractions
};