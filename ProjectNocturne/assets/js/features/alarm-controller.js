import { use24HourFormat, activateModule, getCurrentActiveOverlay, allowCardMovement, rememberExpandedSectionsOnNav } from '../app/main.js';
import { prepareAlarmForEdit } from '../ui/menu-interactions.js';
import { playSound, stopSound, getAvailableSounds, handleAlarmCardAction, getSoundNameById, createExpandableToolContainer, createToolCard } from '../features/general-tools.js';
import { showSimpleNotification, hideSimpleNotification } from '../ui/notification-controller.js';
import { updateEverythingWidgets } from '../features/everything-controller.js';
import { getTranslation } from '../core/translations-controller.js';
import { showModal } from '../ui/menu-interactions.js';
import { trackEvent } from '../services/event-tracker.js';
import { showRingingScreen, hideRingingScreen } from '../ui/ringing-controller.js';


const ALARMS_STORAGE_KEY = 'user-alarms';
const ALARM_SECTIONS_STORAGE_KEY = 'user-alarm-sections';
const DEFAULT_ALARMS_STORAGE_KEY = 'default-alarms-order';
const LAST_VISIT_KEY = 'last-alarm-visit-timestamp';
let expandedAlarmSections = new Set();

const DEFAULT_ALARMS = [
    { id: 'default-2', title: 'lunch_time', hour: 13, minute: 0, sound: 'gentle_chime', enabled: false, type: 'default' },
    { id: 'default-3', title: 'read_book', hour: 21, minute: 0, sound: 'peaceful_tone', enabled: false, type: 'default' },
    { id: 'default-5', title: 'take_a_break', hour: 16, minute: 0, sound: 'gentle_chime', enabled: false, type: 'default' }
];

let userAlarms = [];
let defaultAlarmsState = [];
let alarmSections = [];

// --- FUNCIÓN DE SEGURIDAD ---
function isAnyAlarmRinging() {
    return [...userAlarms, ...defaultAlarmsState].some(a => a.isRinging);
}

function toggleAlarmsSection(type) {
    const grid = document.querySelector(`.tool-grid[data-alarm-grid="${type}"]`);
    if (!grid) return;
    const container = grid.closest('.alarms-container');
    if (!container) return;
    const btn = container.querySelector('.expandable-card-toggle-btn');
    const isActive = grid.classList.toggle('active');
    btn.classList.toggle('expanded', isActive);

    if (isActive) {
        expandedAlarmSections.add(type);
    } else {
        expandedAlarmSections.delete(type);
    }
}

function createAlarmSection(sectionName) {
    if (isAnyAlarmRinging()) return null;
    if (alarmSections.length >= 11) {
        showSimpleNotification(
            'error',
            'limit_reached_message_premium',
            'notifications',
            { type: getTranslation('alarms', 'tooltips') }
        );
        return null;
    }

    const sectionId = `alarm-section-${Date.now()}`;
    const newSection = {
        id: sectionId,
        name: sectionName,
        type: 'user'
    };
    alarmSections.push(newSection);
    saveAlarmSectionsToStorage();
    return newSection;
}

function saveAlarmSectionsToStorage() {
    localStorage.setItem(ALARM_SECTIONS_STORAGE_KEY, JSON.stringify(alarmSections));
}

function loadAlarmSectionsFromStorage() {
    const storedSections = localStorage.getItem(ALARM_SECTIONS_STORAGE_KEY);
    if (storedSections) {
        try {
            alarmSections = JSON.parse(storedSections);
        } catch (e) {
            alarmSections = [];
        }
    }
}

function renderAlarmSections() {
    const wrapper = document.querySelector('.alarms-list-wrapper');
    if (wrapper) {
        wrapper.querySelectorAll('.alarms-container[data-container-type="user"]').forEach(el => el.remove());

        const myAlarmsContainer = createExpandableToolContainer({
            type: 'user',
            titleKey: 'my_alarms',
            translationCategory: 'alarms',
            icon: 'alarm',
            containerClass: 'alarms-container',
            badgeClass: 'alarm-count-badge',
            gridAttribute: 'data-alarm-grid',
            toggleFunction: toggleAlarmsSection
        });
        myAlarmsContainer.dataset.containerType = 'user';
        const defaultContainer = wrapper.querySelector('[data-container="default"]');
        if (defaultContainer) {
            wrapper.insertBefore(myAlarmsContainer, defaultContainer);
        } else {
            wrapper.appendChild(myAlarmsContainer);
        }

        alarmSections.forEach(section => {
            if (userAlarms.some(alarm => alarm.sectionId === section.id)) {
                const userSectionContainer = createExpandableToolContainer({
                    type: section.id,
                    titleKey: section.name,
                    translationCategory: 'alarms',
                    icon: 'alarm',
                    containerClass: 'alarms-container',
                    badgeClass: 'alarm-count-badge',
                    gridAttribute: 'data-alarm-grid',
                    toggleFunction: toggleAlarmsSection
                });
                userSectionContainer.dataset.containerType = 'user';
                wrapper.appendChild(userSectionContainer);
            }
        });

        updateAlarmCounts();
    }
}

function formatTimeSince(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const minute = 60, hour = 3600, day = 86400, year = 31536000;

    if (seconds < minute) return `${seconds} ${getTranslation('seconds', 'timer')}`;
    if (seconds < hour) return `${Math.floor(seconds / minute)} ${getTranslation('minutes', 'timer')}`;
    if (seconds < day) return `${Math.floor(seconds / hour)} ${getTranslation('hours', 'timer')}`;
    if (seconds < year) return `${Math.floor(seconds / day)} ${getTranslation('days', 'timer')}`;

    return `${Math.floor(seconds / year)} ${getTranslation('years', 'timer')}`;
}

function clearRangAtTag(alarmId) {
    const alarm = findAlarmById(alarmId);
    if (!alarm || !alarm.rangAt) return;

    delete alarm.rangAt;

    const isUserAlarm = userAlarms.some(a => a.id === alarmId);
    if (isUserAlarm) {
        saveAlarmsToStorage();
    } else {
        saveDefaultAlarmsOrder();
    }

    updateAlarmCardVisuals(alarm);
    refreshSearchResults();
}

function shouldShowRangAtTag(alarm) {
    return alarm.rangAt && !alarm.enabled && !alarm.isRinging;
}

function getAlarmControlsState(alarm) {
    const isRinging = !!alarm.isRinging;
    const isEnabled = !!alarm.enabled;
    const hasRangAt = !!alarm.rangAt;

    return {
        toggleDisabled: isRinging,
        testDisabled: isRinging,
        editDisabled: isRinging,
        deleteDisabled: isRinging,
        isRinging,
        isEnabled,
        hasRangAt
    };
}

function checkAlarms() {
    const now = new Date();
    if (now.getSeconds() !== 0) return;
    if (isAnyAlarmRinging()) return;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const allAlarms = [...userAlarms, ...defaultAlarmsState];

    allAlarms.forEach(alarm => {
        if (alarm.enabled && alarm.hour === currentHour && alarm.minute === currentMinute) {
            if (!alarm.lastTriggered || (now.getTime() - alarm.lastTriggered) > 59000) {
                alarm.lastTriggered = now.getTime();
                triggerAlarm(alarm);
            }
        }
    });
}

function startClock() {
    function tick() {
        updateLocalTime();
        checkAlarms();
        const now = new Date();
        const msUntilNextSecond = 1000 - now.getMilliseconds();
        setTimeout(tick, msUntilNextSecond);
    }
    tick();
    window.addEventListener('beforeunload', () => {
        localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
    });
}

function loadAndRestoreAlarms() {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const lastVisitTime = lastVisit ? parseInt(lastVisit, 10) : null;

    const storedUser = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (storedUser) {
        try {
            userAlarms = JSON.parse(storedUser);
        } catch (e) { userAlarms = []; }
    }

    const storedDefault = localStorage.getItem(DEFAULT_ALARMS_STORAGE_KEY);
    if (storedDefault) {
        try {
            defaultAlarmsState = JSON.parse(storedDefault);
        } catch (e) {
            loadDefaultAlarmsOrder();
        }
    } else {
        loadDefaultAlarmsOrder();
    }

    if (lastVisitTime) {
        const now = Date.now();

        [...userAlarms, ...defaultAlarmsState].forEach(alarm => {
            alarm.type = alarm.id.startsWith('default-') ? 'default' : 'user';

            if (alarm.isRinging) {
                let whenItRang = now;

                if (alarm.lastTriggered) {
                    whenItRang = alarm.lastTriggered;
                } else {
                    const todayAlarmTime = new Date();
                    todayAlarmTime.setHours(alarm.hour, alarm.minute, 0, 0);

                    if (todayAlarmTime <= now) {
                        whenItRang = todayAlarmTime.getTime();
                    } else {
                        const yesterdayAlarmTime = new Date(todayAlarmTime);
                        yesterdayAlarmTime.setDate(yesterdayAlarmTime.getDate() - 1);
                        whenItRang = yesterdayAlarmTime.getTime();
                    }
                }

                alarm.rangAt = whenItRang;
                alarm.isRinging = false;
                alarm.enabled = false;

            } else if (alarm.enabled) {
                const todayAlarmTime = new Date();
                todayAlarmTime.setHours(alarm.hour, alarm.minute, 0, 0);

                let lastExpectedRingTime = todayAlarmTime;
                if (todayAlarmTime > now) {
                    lastExpectedRingTime.setDate(lastExpectedRingTime.getDate() - 1);
                }

                const shouldHaveRung = lastExpectedRingTime.getTime() > lastVisitTime &&
                    lastExpectedRingTime.getTime() <= now;

                const creationTime = alarm.created ? new Date(alarm.created) : new Date(0);
                const wasCreatedBeforeRing = lastExpectedRingTime > creationTime;

                if (shouldHaveRung && wasCreatedBeforeRing) {
                    alarm.rangAt = lastExpectedRingTime.getTime();
                    alarm.enabled = false;
                }
            }
        });
    }

    saveAlarmsToStorage();
    saveDefaultAlarmsOrder();
}

function toggleAlarm(alarmId) {
    if (isAnyAlarmRinging()) return;
    const alarm = findAlarmById(alarmId);
    if (!alarm) return;

    alarm.enabled = !alarm.enabled;

    if (alarm.enabled) {
        clearRangAtTag(alarmId);
    }

    if (alarm.type === 'user') {
        saveAlarmsToStorage();
    } else if (alarm.type === 'default') {
        saveDefaultAlarmsOrder();
    }

    updateAlarmCardVisuals(alarm);
    refreshSearchResults();
    updateEverythingWidgets();
    updateAlarmControlsState();
}

function updateAlarm(alarmId, newData) {
    if (isAnyAlarmRinging()) return;
    const alarm = findAlarmById(alarmId);
    if (!alarm) return;

    const oldSectionId = alarm.sectionId; 

    if (alarm.type === 'default' && newData.sectionId && oldSectionId !== newData.sectionId) {
        showSimpleNotification('error', 'default_alarm_cant_change_section', 'alarms');
        return; 
    }

    Object.assign(alarm, newData);

    if (newData.sectionId && oldSectionId !== alarm.sectionId) {
        renderAllAlarmCards(); 
    } else {
        updateAlarmCardVisuals(alarm);
    }
    
    clearRangAtTag(alarmId);

    if (alarm.type === 'user') {
        saveAlarmsToStorage();
    } else if (alarm.type === 'default') {
        saveDefaultAlarmsOrder();
    }

    refreshSearchResults();
    const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    showSimpleNotification('success', 'alarm_updated', 'notifications', { title: translatedTitle });
    updateEverythingWidgets();
}

function updateAlarmCardVisuals(alarm) {
    const card = document.getElementById(alarm.id);
    if (!card) return;

    if (alarm.enabled && alarm.rangAt) {
        delete alarm.rangAt;
    }

    const title = card.querySelector('.card-title');
    const time = card.querySelector('.card-value');
    const sound = card.querySelector('.card-tag[data-sound-id]');
    const toggleLink = card.querySelector('[data-action="toggle-alarm"]');
    const toggleIcon = toggleLink?.querySelector('.material-symbols-rounded');
    const toggleText = toggleLink?.querySelector('.menu-link-text span');

    const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    if (title) {
        title.textContent = translatedTitle;
        title.title = translatedTitle;
    }
    if (time) time.innerHTML = formatTime(alarm.hour, alarm.minute);
    if (sound) {
        sound.textContent = getSoundNameById(alarm.sound);
        sound.dataset.soundId = alarm.sound;
    }
    if (toggleIcon) toggleIcon.textContent = alarm.enabled ? 'toggle_on' : 'toggle_off';
    if (toggleText) {
        const key = alarm.enabled ? 'deactivate_alarm' : 'activate_alarm';
        toggleText.setAttribute('data-translate', key);
        toggleText.textContent = getTranslation(key, 'alarms');
    }

    let rangAgoTag = card.querySelector('.rang-ago-tag');

    if (shouldShowRangAtTag(alarm)) {
        if (!rangAgoTag) {
            rangAgoTag = document.createElement('span');
            rangAgoTag.className = 'card-tag rang-ago-tag';
            card.querySelector('.card-tags').appendChild(rangAgoTag);
        }
        const timeAgo = formatTimeSince(alarm.rangAt);
        rangAgoTag.textContent = getTranslation('rang_ago', 'timer').replace('{time}', timeAgo);
    } else if (rangAgoTag) {
        rangAgoTag.remove();
    }

    card.classList.toggle('alarm-disabled', !alarm.enabled);
    updateAlarmControlsState();
}

function updateAlarmControlsState() {
    const isRinging = isAnyAlarmRinging();
    const ringingAlarmId = isRinging ? [...userAlarms, ...defaultAlarmsState].find(a => a.isRinging)?.id : null;

    const allControls = document.querySelectorAll(
        '.section-alarm [data-action], .section-alarm [data-module="toggleMenuAlarm"]'
    );

    allControls.forEach(control => {
        const card = control.closest('.tool-card, .search-result-item');
        const cardId = card?.dataset.id;
        const action = control.dataset.action || control.dataset.module;

        const isDismissAction = action === 'dismiss-alarm';
        const isRingingCardControl = cardId === ringingAlarmId;
        
        let shouldBeDisabled = false;
        if (isRinging) {
            if (isRingingCardControl) {
                shouldBeDisabled = !isDismissAction;
            } else {
                shouldBeDisabled = true;
            }
        }

        control.classList.toggle('disabled-interactive', shouldBeDisabled);
    });
}


function triggerAlarm(alarm) {
    let soundToPlay = alarm.sound;
    const availableSounds = getAvailableSounds();
    if (!availableSounds.some(s => s.id === soundToPlay)) {
        soundToPlay = 'classic_beep';
        alarm.sound = soundToPlay;
        updateAlarm(alarm.id, { sound: soundToPlay });
    }
    playSound(soundToPlay, alarm.id);

    alarm.isRinging = true;

    if (alarm.type === 'user') {
        saveAlarmsToStorage();
    } else {
        saveDefaultAlarmsOrder();
    }

    updateAlarmCardVisuals(alarm);
    updateAlarmControlsState();

    const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(getTranslation('alarm_ringing_title', 'notifications'), {
            body: getTranslation('alarm_ringing', 'notifications').replace('{title}', translatedTitle),
            icon: '/favicon.ico'
        });
    }

    const card = document.getElementById(alarm.id);
    card?.querySelector('.card-options-container')?.classList.add('active');

    showRingingScreen('alarm', {
        title: translatedTitle,
        sound: alarm.sound,
        toolId: alarm.id
    }, (dismissedId) => {
        if (dismissedId === alarm.id) {
            dismissAlarm(alarm.id);
        }
    }, (snoozedId) => {
        if (snoozedId === alarm.id) {
            snoozeAlarm(alarm.id);
        }
    });
}


function dismissAlarm(alarmId) {
    stopSound(alarmId);
    hideRingingScreen(alarmId); 

    const alarm = findAlarmById(alarmId);
    if (!alarm) return;

    alarm.isRinging = false;
    delete alarm.rangAt;

    if (alarm.enabled) {
        alarm.enabled = false;
    }

    if (alarm.type === 'user') {
        saveAlarmsToStorage();
    } else if (alarm.type === 'default') {
        saveDefaultAlarmsOrder();
    }

    updateAlarmCardVisuals(alarm);
    updateEverythingWidgets();
    refreshSearchResults();
    updateAlarmControlsState();

    const alarmCard = document.getElementById(alarmId);
    if (alarmCard) {
        const optionsContainer = alarmCard.querySelector('.card-options-container');
        if (optionsContainer) {
            optionsContainer.classList.remove('active');
        }
    }
}

function snoozeAlarm(alarmId) {
    const alarm = findAlarmById(alarmId);
    if (!alarm) return;

    dismissAlarm(alarmId);

    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);

    createAlarm(
        `${alarm.title} (Snoozed)`,
        now.getHours(),
        now.getMinutes(),
        alarm.sound
    );
}

function renderAlarmSearchResults(searchTerm) {
    const menuElement = document.querySelector('.menu-component[data-menu="alarm"]');
    if (!menuElement) return;

    const resultsWrapper = menuElement.querySelector('.search-results-wrapper');
    const creationWrapper = menuElement.querySelector('.creation-wrapper');
    const menuBottom = menuElement.querySelector('.menu-section-bottom');

    if (!resultsWrapper || !creationWrapper || !menuBottom) return;

    if (!searchTerm) {
        resultsWrapper.classList.add('disabled');
        creationWrapper.classList.remove('disabled');
        menuBottom.classList.remove('disabled');
        resultsWrapper.innerHTML = '';
        return;
    }

    const allAlarms = [...userAlarms, ...defaultAlarmsState];
    const filteredAlarms = allAlarms.filter(alarm => {
        const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
        return translatedTitle.toLowerCase().includes(searchTerm.toLowerCase());
    });

    creationWrapper.classList.add('disabled');
    resultsWrapper.classList.remove('disabled');
    menuBottom.classList.add('disabled');

    resultsWrapper.innerHTML = '';

    if (filteredAlarms.length > 0) {
        const list = document.createElement('div');
        list.className = 'menu-list';
        filteredAlarms.forEach(alarm => {
            const item = createSearchResultItem(alarm);
            list.appendChild(item);
            addSearchItemEventListeners(item);
        });
        resultsWrapper.appendChild(list);
    } else {
        resultsWrapper.innerHTML = `<p class="no-results-message">${getTranslation('no_results', 'search')} "${searchTerm}"</p>`;
    }
}

function createSearchResultItem(alarm) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.id = `search-alarm-${alarm.id}`;
    item.dataset.id = alarm.id;
    item.dataset.type = 'alarm';
    item.classList.toggle('alarm-disabled', !alarm.enabled);
    const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    const time = formatTime(alarm.hour, alarm.minute);
    const isRinging = isAnyAlarmRinging();
    const deleteLinkHtml = alarm.type === 'default' ? '' : `
        <div class="menu-link ${isRinging ? 'disabled-interactive' : ''}" data-action="delete-alarm">
            <div class="menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
            <div class="menu-link-text"><span data-translate="delete_alarm" data-translate-category="alarms">${getTranslation('delete_alarm', 'alarms')}</span></div>
        </div>
    `;
    item.innerHTML = `
        <div class="result-info">
            <span class="result-title">${translatedTitle}</span>
            <span class="result-time">${time}</span>
        </div>
        <div class="card-menu-container disabled">
            <button class="card-action-btn" data-action="toggle-item-menu"
                    data-translate="options"
                    data-translate-category="world_clock_options"
                    data-translate-target="tooltip">
                <span class="material-symbols-rounded">more_horiz</span>
            </button>
            <div class="card-dropdown-menu disabled body-title">
                 <div class="menu-link ${isRinging ? 'disabled-interactive' : ''}" data-action="toggle-alarm">
                     <div class="menu-link-icon"><span class="material-symbols-rounded">${alarm.enabled ? 'toggle_on' : 'toggle_off'}</span></div>
                     <div class="menu-link-text"><span data-translate="${alarm.enabled ? 'deactivate_alarm' : 'activate_alarm'}" data-translate-category="alarms">${getTranslation(alarm.enabled ? 'deactivate_alarm' : 'activate_alarm', 'alarms')}</span></div>
                 </div>
                 <div class="menu-link ${isRinging ? 'disabled-interactive' : ''}" data-action="test-alarm">
                     <div class="menu-link-icon"><span class="material-symbols-rounded">volume_up</span></div>
                     <div class="menu-link-text"><span data-translate="test_alarm" data-translate-category="alarms">${getTranslation('test_alarm', 'alarms')}</span></div>
                 </div>
                 <div class="menu-link ${isRinging ? 'disabled-interactive' : ''}" data-action="edit-alarm">
                     <div class="menu-link-icon"><span class="material-symbols-rounded">edit</span></div>
                     <div class="menu-link-text"><span data-translate="edit_alarm" data-translate-category="alarms">${getTranslation('edit_alarm', 'alarms')}</span></div>
                 </div>
                 ${deleteLinkHtml}
            </div>
        </div>
    `;
    return item;
}

function addSearchItemEventListeners(item) {
    const menuContainer = item.querySelector('.card-menu-container');
    if (!menuContainer) return;
    item.addEventListener('mouseenter', () => {
        menuContainer.classList.remove('disabled');
    });
    item.addEventListener('mouseleave', () => {
        const dropdown = menuContainer.querySelector('.card-dropdown-menu');
        if (dropdown?.classList.contains('disabled')) {
            menuContainer.classList.add('disabled');
        }
    });
    item.addEventListener('click', e => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        if (isAnyAlarmRinging()) {
            showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            e.stopPropagation();
            return;
        }

        if (actionTarget.classList.contains('disabled-interactive')) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
        const action = actionTarget.dataset.action;
        const alarmId = item.dataset.id;
        if (action === 'toggle-item-menu') {
            const dropdown = item.querySelector('.card-dropdown-menu');
            const isOpening = dropdown.classList.contains('disabled');
            document.querySelectorAll('.search-results-wrapper .card-dropdown-menu').forEach(d => {
                if (d !== dropdown) {
                    d.classList.add('disabled');
                }
            });
            if (isOpening) {
                dropdown.classList.remove('disabled');
            } else {
                dropdown.classList.add('disabled');
            }
            if (!dropdown.classList.contains('disabled')) {
                menuContainer.classList.remove('disabled');
            }
        } else {
            handleAlarmCardAction(action, alarmId, actionTarget);
        }
    });
}

function refreshSearchResults() {
    const searchInput = document.getElementById('alarm-search-input');
    if (searchInput && searchInput.value) {
        renderAlarmSearchResults(searchInput.value.toLowerCase());
    }
}

function getActiveAlarmsCount() {
    const allAlarms = [...userAlarms, ...defaultAlarmsState].filter(alarm => alarm.enabled);
    return allAlarms.length;
}

function updateAlarmCounts() {
    const myAlarms = userAlarms.filter(alarm => !alarm.sectionId || alarm.sectionId === 'user');
    const myAlarmsCount = myAlarms.length;
    const myAlarmsContainer = document.querySelector('.alarms-container[data-container="user"]');
    if (myAlarmsContainer) {
        const myAlarmsBadge = myAlarmsContainer.querySelector('.alarm-count-badge');
        if (myAlarmsBadge) myAlarmsBadge.textContent = myAlarmsCount;
        myAlarmsContainer.classList.toggle('disabled', myAlarmsCount === 0);
        myAlarmsContainer.classList.toggle('active', myAlarmsCount > 0);
    }

    alarmSections.forEach(section => {
        const sectionAlarms = userAlarms.filter(alarm => alarm.sectionId === section.id);
        const sectionCount = sectionAlarms.length;
        const sectionContainer = document.querySelector(`.alarms-container[data-container="${section.id}"]`);
        if (sectionContainer) {
            const sectionBadge = sectionContainer.querySelector('.alarm-count-badge');
            if (sectionBadge) sectionBadge.textContent = sectionCount;
        }
    });

    const defaultAlarmsCount = defaultAlarmsState.length;
    const defaultContainer = document.querySelector('.alarms-container[data-container="default"]');
    if (defaultContainer) {
        const defaultBadge = defaultContainer.querySelector('.alarm-count-badge');
        if (defaultBadge) defaultBadge.textContent = defaultAlarmsCount;
        defaultContainer.classList.toggle('disabled', defaultAlarmsCount === 0);
        defaultContainer.classList.toggle('active', defaultAlarmsCount > 0);
    }

    updateEverythingWidgets();
}


function getAlarmCount() {
    return userAlarms.length;
}

function getAlarmLimit() {
    return 100;
}

function createAlarm(title, hour, minute, sound, sectionId = 'user') {
    if (isAnyAlarmRinging()) {
        showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
        return false;
    }
    const alarmLimit = getAlarmLimit();
    if (userAlarms.length >= alarmLimit) {
        showSimpleNotification(
            'error',
            'limit_reached_message_premium',
            'notifications',
            { type: getTranslation('alarms', 'tooltips') }
        );
        return false;
    }
    const alarm = {
        id: `alarm-${Date.now()}`,
        title,
        hour,
        minute,
        sound,
        enabled: true,
        type: 'user',
        created: new Date().toISOString(),
        sectionId: sectionId
    };
    trackEvent('interaction', 'create_alarm');
    userAlarms.push(alarm);
    saveAlarmsToStorage();
    renderAllAlarmCards();
    updateAlarmCounts();
    showSimpleNotification('success', 'alarm_created', 'notifications', { title: alarm.title });
    updateEverythingWidgets();
    return true;
}

function renderAllAlarmCards() {
    renderAlarmSections();
    document.querySelectorAll('.tool-grid[data-alarm-grid]').forEach(grid => grid.innerHTML = '');

    userAlarms.forEach(alarm => {
        const grid = document.querySelector(`.tool-grid[data-alarm-grid="${alarm.sectionId || 'user'}"]`);
        if(grid){
            const card = createAlarmCardFromData(alarm);
            grid.appendChild(card);
        }
    });

    defaultAlarmsState.forEach(alarm => {
        const grid = document.querySelector(`.tool-grid[data-alarm-grid="default"]`);
        if(grid){
            const card = createAlarmCardFromData(alarm);
            grid.appendChild(card);
        }
    });
    
    applyCollapsedSectionsState();
    applySavedSectionOrder();
    initializeAlarmSortable();
}

function createAlarmCardFromData(alarm) {
    const translatedTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    const soundName = getSoundNameById(alarm.sound);
    const controlsState = getAlarmControlsState(alarm);
    const timeValue = formatTime(alarm.hour, alarm.minute);

    let tags = [{ text: soundName, soundId: alarm.sound }];
    if (shouldShowRangAtTag(alarm)) {
        const timeAgo = formatTimeSince(alarm.rangAt);
        const rangAgoText = getTranslation('rang_ago', 'timer').replace('{time}', timeAgo);
        tags.push({ text: rangAgoText, className: 'rang-ago-tag' });
    }

    const menuItems = [
        { action: 'toggle-alarm', icon: alarm.enabled ? 'toggle_on' : 'toggle_off', textKey: alarm.enabled ? 'deactivate_alarm' : 'activate_alarm', textCategory: 'alarms', disabled: controlsState.toggleDisabled },
        { action: 'test-alarm', icon: 'volume_up', textKey: 'test_alarm', textCategory: 'alarms', disabled: controlsState.testDisabled },
        { action: 'edit-alarm', icon: 'edit', textKey: 'edit_alarm', textCategory: 'alarms', disabled: controlsState.editDisabled },
    ];

    if (alarm.type !== 'default') {
        menuItems.push({ action: 'delete-alarm', icon: 'delete', textKey: 'delete_alarm', textCategory: 'alarms', disabled: controlsState.deleteDisabled });
    }

    return createToolCard({
        id: alarm.id,
        cardClass: 'alarm-card',
        cardType: 'alarm',
        title: translatedTitle,
        value: timeValue,
        tags: tags,
        menuItems: menuItems,
        dismissAction: 'dismiss-alarm',
        isDisabled: !alarm.enabled,
        type: alarm.type
    });
}

function findAlarmById(alarmId) {
    return userAlarms.find(a => a.id === alarmId) || defaultAlarmsState.find(a => a.id === alarmId);
}

function deleteAlarm(alarmId) {
    if (isAnyAlarmRinging()) return;
    const alarm = findAlarmById(alarmId);
    if (!alarm) return;
    if (alarm.type === 'default') {
        return;
    }

    const originalTitle = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;
    if (alarm.type === 'user') {
        userAlarms = userAlarms.filter(a => a.id !== alarmId);
        saveAlarmsToStorage();
    } else {
        defaultAlarmsState = defaultAlarmsState.filter(a => a.id !== alarmId);
        saveDefaultAlarmsOrder();
    }
    const alarmCard = document.getElementById(alarmId);
    if (alarmCard) {
        alarmCard.remove();
    }
    updateAlarmCounts();
    if (window.hideSimpleNotification) {
        window.hideSimpleNotification();
    }
    trackEvent('interaction', 'delete_alarm');
    showSimpleNotification('success', 'alarm_deleted', 'notifications', { title: originalTitle });
    refreshSearchResults();
    updateEverythingWidgets();
}

function saveAlarmsToStorage() {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(userAlarms));
}

function saveDefaultAlarmsOrder() {
    localStorage.setItem(DEFAULT_ALARMS_STORAGE_KEY, JSON.stringify(defaultAlarmsState));
}

function loadDefaultAlarmsOrder() {
    const stored = localStorage.getItem(DEFAULT_ALARMS_STORAGE_KEY);
    if (stored) {
        try {
            defaultAlarmsState = JSON.parse(stored);
            const defaultIds = new Set(defaultAlarmsState.map(alarm => alarm.id));
            DEFAULT_ALARMS.forEach(defaultAlarm => {
                if (!defaultIds.has(defaultAlarm.id)) {
                    defaultAlarmsState.push({ ...defaultAlarm });
                }
            });
        } catch (error) {
            defaultAlarmsState = JSON.parse(JSON.stringify(DEFAULT_ALARMS));
        }
    } else {
        defaultAlarmsState = JSON.parse(JSON.stringify(DEFAULT_ALARMS));
    }
}

function loadDefaultAlarms() {
    loadDefaultAlarmsOrder();
}

function formatTime(hour, minute) {
    if (use24HourFormat) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const tempDate = new Date();
    tempDate.setHours(hour, minute, 0, 0);

    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    const parts = new Intl.DateTimeFormat(navigator.language, options).formatToParts(tempDate);
    
    let timeString = '';
    let ampmString = '';

    parts.forEach(part => {
        if (part.type === 'dayPeriod') {
            ampmString = part.value;
        } else {
            timeString += part.value;
        }
    });
    
    timeString = timeString.trim();

    return `${timeString}<span class="ampm">${ampmString}</span>`;
}

function applyCollapsedSectionsState() {
    document.querySelectorAll('.alarms-container').forEach(container => {
        const type = container.dataset.container;
        const grid = container.querySelector(`.tool-grid[data-alarm-grid="${type}"]`);
        const btn = container.querySelector('.expandable-card-toggle-btn');

        if (grid && btn) {
            if (expandedAlarmSections.has(type)) {
                grid.classList.add('active');
                btn.classList.add('expanded');
            } else {
                grid.classList.remove('active');
                btn.classList.remove('expanded');
            }
        }
    });
}


function updateLocalTime() {
    const el = document.querySelector('.tool-alarm span');
    if (el) {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !use24HourFormat };

        const parts = new Intl.DateTimeFormat(navigator.language, options).formatToParts(now);
        const timeString = parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('');
        const ampmString = parts.find(p => p.type === 'dayPeriod')?.value || '';

        let ampmEl = el.querySelector('.ampm');
        
        if (!ampmEl || (ampmString && ampmEl.textContent === '')) {
            el.innerHTML = `${timeString}<span class="ampm">${ampmString}</span>`;
        } else {
            if (el.firstChild.nodeType === Node.TEXT_NODE) {
                el.firstChild.nodeValue = timeString;
            } else { 
                el.innerHTML = `${timeString}<span class="ampm">${ampmString}</span>`;
            }
            if (ampmString) ampmEl.textContent = ampmString;
            else ampmEl.textContent = '';
        }

        if (window.centralizedFontManager) {
            window.centralizedFontManager.adjustAndApplyFontSizeToSection('alarm');
        }
    }
}
function handleEditAlarm(alarmId) {
    if (isAnyAlarmRinging()) return;
    const alarmData = findAlarmById(alarmId);
    if (alarmData) {
        prepareAlarmForEdit(alarmData);
        const searchInput = document.getElementById('alarm-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        renderAlarmSearchResults('');
        if (getCurrentActiveOverlay() !== 'menuAlarm') {
            activateModule('toggleMenuAlarm');
        }
    }
}

function handleDeleteAlarm(alarmId) {
    if (isAnyAlarmRinging()) return;
    const alarm = findAlarmById(alarmId);
    if (!alarm) return;

    const alarmName = alarm.type === 'default' ? getTranslation(alarm.title, 'alarms') : alarm.title;

    setTimeout(() => {
        showModal('confirmation', { type: 'alarm', name: alarmName }, () => {
            deleteAlarm(alarmId);
        });
    }, 50);
}

function testAlarm(alarmId) {
    if (isAnyAlarmRinging()) return;
    const alarm = findAlarmById(alarmId);
    if (alarm && alarm.sound) {
        playSound(alarm.sound);
        setTimeout(() => stopSound(), 3000);
    }
}

function applySavedSectionOrder() {
    const wrapper = document.querySelector('.alarms-list-wrapper');
    const savedOrder = JSON.parse(localStorage.getItem('alarm-sections-order'));

    if (wrapper && savedOrder) {
        const sections = Array.from(wrapper.children);
        const sectionsById = sections.reduce((acc, section) => {
            if (section.dataset.container) {
                acc[section.dataset.container] = section;
            }
            return acc;
        }, {});

        savedOrder.forEach(sectionId => {
            if (sectionsById[sectionId]) {
                wrapper.appendChild(sectionsById[sectionId]);
            }
        });
    }
}

function initializeAlarmSortable() {
    const wrapper = document.querySelector('.alarms-list-wrapper');
    if (wrapper) {
        new Sortable(wrapper, {
            group: 'alarm-sections',
            animation: 150,
            handle: '.expandable-card-header',
            delay: 200, 
            delayOnTouchOnly: true,
            filter: '.expandable-card-toggle-btn, .tool-grid, .card-menu-container',
            ghostClass: 'tool-card-placeholder',
            forceFallback: true,
            fallbackClass: 'tool-card-dragging',
             onStart: function () { 
                document.body.style.cursor = 'grabbing';
                setTimeout(() => {
                    const fallbackElement = document.querySelector('.tool-card-dragging');
                    if (fallbackElement) {
                        fallbackElement.style.opacity = '1';
                    }
                }, 0);
            },
            onEnd: function (evt) {
                document.body.style.cursor = '';
                const wrapper = document.querySelector('.alarms-list-wrapper');
                const newOrderIds = Array.from(wrapper.querySelectorAll('.alarms-container'))
                                       .map(el => el.dataset.container);

                localStorage.setItem('alarm-sections-order', JSON.stringify(newOrderIds));

                const userSectionIds = newOrderIds.filter(id => id && id.startsWith('alarm-section-'));
                alarmSections.sort((a, b) => userSectionIds.indexOf(a.id) - userSectionIds.indexOf(b.id));
                saveAlarmSectionsToStorage();
            }
        });
    }

     const grids = document.querySelectorAll('.tool-grid[data-alarm-grid]');
    grids.forEach(grid => {
        new Sortable(grid, {
            group: `alarms-cards-${grid.dataset.alarmGrid}`,
            animation: 150,
            delay: 200, 
            delayOnTouchOnly: true, 
            filter: '.card-menu-container',
            ghostClass: 'tool-card-placeholder',
            forceFallback: true,
            fallbackClass: 'tool-card-dragging',

            onStart: function () {
                document.body.style.cursor = 'grabbing';
                setTimeout(() => {
                    const fallbackElement = document.querySelector('.tool-card-dragging');
                    if (fallbackElement) {
                        fallbackElement.style.opacity = '1';
                    }
                }, 0);
            },
            onEnd: function (evt) {
                document.body.style.cursor = '';
                if (evt.from !== evt.to) {
                    return;
                }

                const grid = evt.to;
                const newOrderIds = Array.from(grid.children).map(item => item.id);

                if (grid.dataset.alarmGrid === 'default') {
                    defaultAlarmsState.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                    saveDefaultAlarmsOrder();
                } else {
                    const allUserGrids = document.querySelectorAll('.tool-grid[data-alarm-grid="user"], .tool-grid[data-alarm-grid^="alarm-section-"]');
                    const newUserAlarms = [];
                    allUserGrids.forEach(g => {
                        Array.from(g.children).forEach(card => {
                            const alarm = userAlarms.find(a => a.id === card.id);
                            if (alarm) {
                                newUserAlarms.push(alarm);
                            }
                        });
                    });
                    userAlarms = newUserAlarms;
                    saveAlarmsToStorage();
                }
            }
        });
    });
}
function deleteAlarmSection(sectionId) {
    if (isAnyAlarmRinging()) return;
    const section = alarmSections.find(s => s.id === sectionId);
    if (!section) return;

    userAlarms = userAlarms.filter(alarm => alarm.sectionId !== sectionId);
    alarmSections = alarmSections.filter(s => s.id !== sectionId);

    saveAlarmsToStorage();
    saveAlarmSectionsToStorage();
    renderAllAlarmCards();
    updateAlarmCounts();
    showSimpleNotification('success', 'section_deleted', 'notifications', { name: section.name });
}
function updateAlarmSection(sectionId, newName) {
    if (isAnyAlarmRinging()) return;
    const section = alarmSections.find(s => s.id === sectionId);
    if (section) {
        section.name = newName;
        saveAlarmSectionsToStorage();
        renderAllAlarmCards();
        updateAlarmCounts();
        showSimpleNotification('success', 'section_updated_success', 'notifications', { name: newName });
    }
}
function initializeAlarmClock() {
    startClock();
    const wrapper = document.querySelector('.alarms-list-wrapper');
    if (wrapper) {
        const userContainer = createExpandableToolContainer({
            type: 'user',
            titleKey: 'my_alarms',
            translationCategory: 'alarms',
            icon: 'alarm',
            containerClass: 'alarms-container',
            badgeClass: 'alarm-count-badge',
            gridAttribute: 'data-alarm-grid',
            toggleFunction: toggleAlarmsSection
        });
        userContainer.dataset.containerType = 'user';

        const defaultContainer = createExpandableToolContainer({
            type: 'default',
            titleKey: 'default_alarms',
            translationCategory: 'alarms',
            icon: 'alarm_on',
            containerClass: 'alarms-container',
            badgeClass: 'alarm-count-badge',
            gridAttribute: 'data-alarm-grid',
            toggleFunction: toggleAlarmsSection
        });
        wrapper.appendChild(userContainer);
        wrapper.appendChild(defaultContainer);
    }

    const alarmSection = document.querySelector('.section-alarm');
    if (alarmSection) {
        const addAlarmBtn = alarmSection.querySelector('[data-module="toggleMenuAlarm"]');
        if (addAlarmBtn) {
            addAlarmBtn.addEventListener('click', (e) => {
                if (isAnyAlarmRinging()) {
                    e.preventDefault();
                    e.stopPropagation();
                    showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                }
            }, true); // Usar fase de captura
        }
    }

    const menuElement = document.querySelector('.menu-component[data-menu="alarm"]');
    if (menuElement) {
        const createButton = menuElement.querySelector('[data-action="createAlarm"]');
        if (createButton) {
            createButton.addEventListener('click', (e) => {
                if (isAnyAlarmRinging()) {
                    e.preventDefault();
                    e.stopPropagation();
                    showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                    return;
                }
            });
        }
    }


    loadAlarmSectionsFromStorage();
    loadAndRestoreAlarms();
    loadDefaultAlarms();
    renderAllAlarmCards();
    updateAlarmCounts();
    applySavedSectionOrder();
    initializeAlarmSortable();


    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    const searchInput = document.getElementById('alarm-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderAlarmSearchResults(e.target.value));
    }

    window.alarmManager = {
        createAlarm,
        createAlarmSection,
        deleteAlarmSection,
        toggleAlarm,
        deleteAlarm,
        updateAlarm,
        toggleAlarmsSection,
        dismissAlarm,
        findAlarmById,
        handleEditAlarm,
        testAlarm,
        updateAlarmSection,
        handleDeleteAlarm,
        getUpcomingAlarms: () => [...userAlarms, ...defaultAlarmsState].filter(a => a.enabled).sort((a,b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute)),
        getAlarmCount,
        getAlarmLimit,
        getActiveAlarmsCount,
        getAllAlarms: () => ({ userAlarms, defaultAlarms: defaultAlarmsState }),
        getAllSections: () => alarmSections,
        saveAllAlarms: () => {
            saveAlarmsToStorage();
            saveDefaultAlarmsOrder();
        },
        renderAllAlarmCards,
        isAnyAlarmRinging
    };

    updateEverythingWidgets();

    document.addEventListener('translationsApplied', () => {
        const allAlarms = [...userAlarms, ...defaultAlarmsState];
        allAlarms.forEach(alarm => {
            updateAlarmCardVisuals(alarm);
        });
        document.querySelectorAll('[data-translate-category="alarms"]').forEach(element => {
            const key = element.dataset.translate;
            if (key) {
                element.textContent = getTranslation(key, 'alarms');
            }
        });
        const searchInput = document.getElementById('alarm-search-input');
        if (searchInput && searchInput.value) {
            renderAlarmSearchResults(searchInput.value.toLowerCase());
        }
    });

    document.addEventListener('moduleDeactivated', (e) => {
        if (e.detail && e.detail.module === 'toggleMenuAlarm') {
            const searchInput = document.getElementById('alarm-search-input');
            if (searchInput) {
                searchInput.value = '';
                renderAlarmSearchResults('');
            }
        }
    });

    document.addEventListener('sectionChanged', (e) => {
        if (rememberExpandedSectionsOnNav === false) {
            if (e.detail.previousSection === 'alarm' && e.detail.activeSection !== 'alarm') {
                expandedAlarmSections.clear();
            }
            if (e.detail.activeSection === 'alarm') {
                applyCollapsedSectionsState();
            }
        }
    });

}

export { getAlarmCount, getAlarmLimit, initializeAlarmClock };