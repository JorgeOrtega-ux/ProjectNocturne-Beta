import { getTranslation } from '../core/translations-controller.js';
import { activateModule, getCurrentActiveOverlay, rememberExpandedSectionsOnNav } from '../app/main.js';
import { prepareTimerForEdit, prepareCountToDateForEdit } from '../ui/menu-interactions.js';
import { playSound, stopSound, getAvailableSounds, handleTimerCardAction, getSoundNameById, createExpandableToolContainer, createToolCard } from '../features/general-tools.js';
import { showDynamicIslandNotification, hideDynamicIsland } from '../ui/notification-controller.js';
import { updateEverythingWidgets } from '../features/everything-controller.js';
import { showModal } from '../ui/menu-interactions.js';
import { trackEvent } from '../services/event-tracker.js';
import { showRingingScreen, hideRingingScreen } from '../ui/ringing-controller.js';

const TIMERS_STORAGE_KEY = 'user-timers';
const TIMER_SECTIONS_STORAGE_KEY = 'user-timer-sections';
const DEFAULT_TIMERS_STORAGE_KEY = 'default-timers-order';
const LAST_VISIT_KEY = 'last-timer-visit-timestamp';
let userTimers = [];
let defaultTimersState = [];
let timerSections = [];
let activeTimers = new Map();
let pinnedTimerId = null;
let expandedTimerSections = new Set();

const DEFAULT_TIMERS = [
    { id: 'default-timer-2', title: 'short_break_5', type: 'countdown', initialDuration: 300000, remaining: 300000, sound: 'peaceful_tone', isRunning: false, isPinned: false },
    { id: 'default-timer-4', title: 'exercise_30', type: 'countdown', initialDuration: 1800000, remaining: 1800000, sound: 'digital_alarm', isRunning: false, isPinned: false },
    { id: 'default-timer-5', title: 'study_session_45', type: 'countdown', initialDuration: 2700000, remaining: 2700000, sound: 'gentle_chime', isRunning: false, isPinned: false }
];

// --- FUNCIÓN DE SEGURIDAD ---
function isAnyTimerRinging() {
    return [...userTimers, ...defaultTimersState].some(t => t.isRinging);
}

function toggleTimersSection(type) {
    const grid = document.querySelector(`.tool-grid[data-timer-grid="${type}"]`);
    if (!grid) return;
    const container = grid.closest('.timers-container');
    if (!container) return;
    const btn = container.querySelector('.expandable-card-toggle-btn');
    const isActive = grid.classList.toggle('active');
    btn.classList.toggle('expanded', isActive);

    if (isActive) {
        expandedTimerSections.add(type);
    } else {
        expandedTimerSections.delete(type);
    }
}

function createTimerSection(sectionName) {
    if (isAnyTimerRinging()) return null;
    if (timerSections.length >= 10) {
        showDynamicIslandNotification(
            'error',
            'limit_reached_message_premium',
            'notifications',
            { type: getTranslation('timer', 'tooltips') }
        );
        return null;
    }

    const sectionId = `timer-section-${Date.now()}`;
    const newSection = {
        id: sectionId,
        name: sectionName,
        type: 'user'
    };
    timerSections.push(newSection);
    saveTimerSectionsToStorage();
    return newSection;
}
function saveTimerSectionsToStorage() {
    localStorage.setItem(TIMER_SECTIONS_STORAGE_KEY, JSON.stringify(timerSections));
}

function loadTimerSectionsFromStorage() {
    const storedSections = localStorage.getItem(TIMER_SECTIONS_STORAGE_KEY);
    if (storedSections) {
        try {
            timerSections = JSON.parse(storedSections);
        } catch (e) {
            timerSections = [];
        }
    }
}

function renderTimerSections() {
    const wrapper = document.querySelector('.timers-list-wrapper');
    if (wrapper) {
        wrapper.querySelectorAll('.timers-container[data-container-type="user"]').forEach(el => el.remove());

        const myTimersContainer = createExpandableToolContainer({
            type: 'user',
            titleKey: 'my_timers',
            translationCategory: 'timer',
            icon: 'timer',
            containerClass: 'timers-container',
            badgeClass: 'timer-count-badge',
            gridAttribute: 'data-timer-grid',
            toggleFunction: toggleTimersSection
        });
        myTimersContainer.dataset.containerType = 'user';
        const defaultContainer = wrapper.querySelector('[data-container="default"]');
        if (defaultContainer) {
            wrapper.insertBefore(myTimersContainer, defaultContainer);
        } else {
            wrapper.appendChild(myTimersContainer);
        }


        timerSections.forEach(section => {
            if (userTimers.some(timer => timer.sectionId === section.id)) {
                const userSectionContainer = createExpandableToolContainer({
                    type: section.id,
                    titleKey: section.name,
                    translationCategory: 'timer',
                    icon: 'timer',
                    containerClass: 'timers-container',
                    badgeClass: 'timer-count-badge',
                    gridAttribute: 'data-timer-grid',
                    toggleFunction: toggleTimersSection
                });
                userSectionContainer.dataset.containerType = 'user';
                wrapper.appendChild(userSectionContainer);
            }
        });

        updateTimerCounts();
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

function clearRangAtTag(timerId) {
    const timer = findTimerById(timerId);
    if (!timer || !timer.rangAt) return;

    delete timer.rangAt;

    const isUserTimer = userTimers.some(t => t.id === timerId);
    if (isUserTimer) {
        saveTimersToStorage();
    } else {
        saveDefaultTimersOrder();
    }

    updateTimerCardVisuals(timer);
    refreshSearchResults();
}

function shouldShowRangAtTag(timer) {
    return timer.rangAt && !timer.isRunning && !timer.isRinging;
}

function getTimerControlsState(timer) {
    const isRinging = !!timer.isRinging;
    const isRunning = !!timer.isRunning;
    const hasRangAt = !!timer.rangAt;
    const isCountdown = timer.type === 'countdown';

    if (!isCountdown) {
        return {
            startDisabled: true,
            pauseDisabled: true,
            resetDisabled: true,
            editDisabled: isRinging,
            deleteDisabled: isRinging,
            showPlayPause: false,
            showReset: false,
            isRinging,
            isRunning,
            hasRangAt
        };
    }

    const canStart = timer.remaining > 0 || hasRangAt;

    const isAtOriginalStateClean = timer.remaining >= timer.initialDuration && !hasRangAt;
    const isRestoredWithTag = timer.remaining >= timer.initialDuration && hasRangAt;
    const resetDisabled = isRinging || isRunning || isAtOriginalStateClean || isRestoredWithTag;

    return {
        startDisabled: isRinging || isRunning || !canStart,
        pauseDisabled: isRinging || !isRunning,
        resetDisabled,
        editDisabled: isRinging, // Corregido
        deleteDisabled: isRinging, // Corregido
        showPlayPause: true,
        showReset: true,
        playPauseAction: isRunning ? 'pause-card-timer' : 'start-card-timer',
        playPauseIcon: isRunning ? 'pause' : 'play_arrow',
        playPauseTextKey: isRunning ? 'pause' : 'play',
        isRinging,
        isRunning,
        hasRangAt
    };
}
function loadAndRestoreTimers() {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const lastVisitTime = lastVisit ? parseInt(lastVisit, 10) : null;

    const storedUserTimers = localStorage.getItem(TIMERS_STORAGE_KEY);
    if (storedUserTimers) {
        try {
            userTimers = JSON.parse(storedUserTimers);
        } catch (e) { userTimers = []; }
    }

    const storedDefaultTimers = localStorage.getItem(DEFAULT_TIMERS_STORAGE_KEY);
    if (storedDefaultTimers) {
        try {
            defaultTimersState = JSON.parse(storedDefaultTimers);
            const defaultIds = new Set(defaultTimersState.map(t => t.id));
            DEFAULT_TIMERS.forEach(defaultTimer => {
                if (!defaultIds.has(defaultTimer.id)) {
                    defaultTimersState.push({ ...defaultTimer });
                }
            });
        } catch (e) {
            defaultTimersState = JSON.parse(JSON.stringify(DEFAULT_TIMERS));
        }
    } else {
        defaultTimersState = JSON.parse(JSON.stringify(DEFAULT_TIMERS));
    }

    const allTimers = [...userTimers, ...defaultTimersState];
    const now = Date.now();

    if (lastVisitTime) {
        allTimers.forEach(timer => {
            if (timer.type === 'countdown') {
                if (timer.isRinging) {
                    let whenItRang = now;

                    if (timer.targetTime) {
                        whenItRang = timer.targetTime;
                    } else if (timer.lastTriggered) {
                        whenItRang = timer.lastTriggered;
                    } else {
                        const timeSinceLastVisit = now - lastVisitTime;

                        if (timeSinceLastVisit < 60000) {
                            whenItRang = lastVisitTime - 2000;
                        } else {
                            whenItRang = now - Math.min(timeSinceLastVisit / 2, 300000);
                        }
                    }

                    timer.rangAt = whenItRang;
                    timer.remaining = timer.initialDuration;
                    timer.isRunning = false;
                    timer.isRinging = false;
                    delete timer.targetTime;
                    delete timer.lastTriggered;

                } else if (timer.isRunning && timer.targetTime) {
                    const timeWhenFinished = timer.targetTime;

                    if (now >= timeWhenFinished) {
                        timer.rangAt = timeWhenFinished;
                        timer.remaining = timer.initialDuration;
                        timer.isRunning = false;
                        timer.isRinging = false;
                        delete timer.targetTime;
                        delete timer.lastTriggered;

                    } else {
                        const rawRemaining = timeWhenFinished - now;
                        timer.remaining = Math.max(0, rawRemaining);
                        startCountdownTimer(timer);
                        updateTimerCardControls(timer.id);
                    }
                } else if (timer.remaining <= 0 && !timer.rangAt) {
                    timer.remaining = timer.initialDuration;
                    timer.isRunning = false;
                    timer.isRinging = false;
                    delete timer.targetTime;
                    delete timer.lastTriggered;

                    if (lastVisitTime) {
                        const timeSinceLastVisit = now - lastVisitTime;

                        if (timeSinceLastVisit < 300000) {
                            timer.rangAt = lastVisitTime - 10000;
                        } else {
                            timer.rangAt = now - Math.min(timeSinceLastVisit * 0.8, 1800000);
                        }
                    } else {
                        timer.rangAt = now - (60 * 1000);
                    }
                }
            } else if (timer.type === 'count_to_date' && timer.isRunning) {
                const rawRemaining = new Date(timer.targetDate).getTime() - now;
                timer.remaining = Math.max(0, rawRemaining);
                if (timer.remaining <= 0) {
                    timer.remaining = 0;
                    timer.isRunning = false;
                    timer.rangAt = new Date(timer.targetDate).getTime();
                } else {
                    startCountToDateTimer(timer);
                }
            }
        });
    }

    let pinnedTimer = allTimers.find(t => t.isPinned);
    if (!pinnedTimer && allTimers.length > 0) {
        pinnedTimer = allTimers[0];
        if (pinnedTimer) pinnedTimer.isPinned = true;
    }
    pinnedTimerId = pinnedTimer ? pinnedTimer.id : null;
    allTimers.forEach(t => t.isPinned = (t.id === pinnedTimerId));

    saveAllTimersState();
    updateAllTimerControls();
}

function startTimer(timerId) {
    if (isAnyTimerRinging()) return;
    const timer = findTimerById(timerId);
    if (!timer || timer.isRunning || (timer.remaining <= 0 && !timer.rangAt)) return;

    trackEvent('interaction', 'start_timer');

    handlePinTimer(timerId);
    clearRangAtTag(timerId);

    timer.isRunning = true;

    if (timer.type === 'countdown') {
        timer.targetTime = Date.now() + timer.remaining;
        startCountdownTimer(timer);
    } else {
        startCountToDateTimer(timer);
    }

    updateAllTimerControls();
    refreshSearchResults();
    updateEverythingWidgets();
    saveAllTimersState();
}

function pauseTimer(timerId) {
    if (isAnyTimerRinging()) return;
    const timer = findTimerById(timerId);
    if (!timer || !timer.isRunning) return;

    trackEvent('interaction', 'pause_timer');

    timer.isRunning = false;
    if (activeTimers.has(timer.id)) {
        cancelAnimationFrame(activeTimers.get(timer.id));
        activeTimers.delete(timer.id);
    }

    if (timer.type === 'countdown') {
        const rawRemaining = timer.targetTime - Date.now();
        if (rawRemaining <= 0) {
            timer.remaining = 0;
        } else {
            timer.remaining = rawRemaining;
        }
    }
    delete timer.targetTime;

    updateAllTimerControls();
    refreshSearchResults();
    updateEverythingWidgets();
    saveAllTimersState();
}

function resetTimer(timerId) {
    if (isAnyTimerRinging()) return;
    const timer = findTimerById(timerId);
    if (!timer) return;

    trackEvent('interaction', 'reset_timer');

    timer.isRunning = false;
    if (activeTimers.has(timerId)) {
        cancelAnimationFrame(activeTimers.get(timerId));
        activeTimers.delete(timerId);
    }

    clearRangAtTag(timerId);

    delete timer.targetTime;
    timer.isRinging = false;
    if (timer.type !== 'count_to_date') {
        timer.remaining = timer.initialDuration;
    }

    updateCardDisplay(timerId);
    if (timer.id === pinnedTimerId) updateMainDisplay();
    updateAllTimerControls();
    refreshSearchResults();
    updateEverythingWidgets();
    saveAllTimersState();
}

function updateTimer(timerId, newData) {
    if (isAnyTimerRinging()) return;
    trackEvent('interaction', 'edit_timer');

    const timerIndex = userTimers.findIndex(t => t.id === timerId);
    const defaultTimerIndex = defaultTimersState.findIndex(t => t.id === timerId);

    if (timerIndex === -1 && defaultTimerIndex === -1) return;

    if (activeTimers.has(timerId)) {
        cancelAnimationFrame(activeTimers.get(timerId));
        activeTimers.delete(timerId);
    }

    const isUserTimer = timerIndex !== -1;
    const targetArray = isUserTimer ? userTimers : defaultTimersState;
    const index = isUserTimer ? timerIndex : defaultTimerIndex;
    const oldTimer = targetArray[index];

    if (oldTimer.type === 'default' && newData.sectionId && oldTimer.sectionId !== newData.sectionId) {
        showDynamicIslandNotification('error', 'default_timer_cant_change_section', 'timers');
        return;
    }

    const updatedTimer = { ...oldTimer, ...newData, isRunning: false };

    delete updatedTimer.rangAt;

    if (updatedTimer.type === 'count_to_date') {
        updatedTimer.remaining = new Date(updatedTimer.targetDate).getTime() - Date.now();
        delete updatedTimer.targetTime;
        targetArray[index] = updatedTimer;
        startTimer(timerId);
    } else {
        updatedTimer.initialDuration = updatedTimer.duration;
        updatedTimer.remaining = updatedTimer.initialDuration;
        delete updatedTimer.targetTime;
        targetArray[index] = updatedTimer;
    }

    if (isUserTimer) saveTimersToStorage(); else saveDefaultTimersOrder();
    
    if (newData.sectionId && oldTimer.sectionId !== newData.sectionId) {
        renderAllTimerCards();
    } else {
        updateTimerCardVisuals(updatedTimer);
    }

    updateMainDisplay();
    updateAllTimerControls();

    const titleForNotification = updatedTimer.id.startsWith('default-timer-') ? getTranslation(updatedTimer.title, 'timer') : updatedTimer.title;
    showDynamicIslandNotification('success', 'timer_updated', 'notifications', { title: titleForNotification });
    updateEverythingWidgets();
}

function updateTimerCardVisuals(timer) {
    const card = document.getElementById(timer.id);
    if (!card) return;

    if (timer.isRunning && timer.rangAt) {
        delete timer.rangAt;
    }

    const titleElement = card.querySelector('.card-title');
    if (titleElement) {
        const isDefault = timer.id.startsWith('default-timer-');
        const titleText = isDefault ? getTranslation(timer.title, 'timer') : timer.title;
        titleElement.textContent = titleText;
        titleElement.title = titleText;
    }

    const timeElement = card.querySelector('.card-value');
    if (timeElement) {
        timeElement.textContent = formatTime(timer.remaining, timer.type);
    }

    const tagElement = card.querySelector('.card-tag[data-sound-id]');
    if (tagElement) {
        tagElement.textContent = getSoundNameById(timer.sound);
        tagElement.dataset.soundId = timer.sound;
    }

    let rangAgoTag = card.querySelector('.rang-ago-tag');

    if (shouldShowRangAtTag(timer)) {
        if (!rangAgoTag) {
            rangAgoTag = document.createElement('span');
            rangAgoTag.className = 'card-tag rang-ago-tag';
            card.querySelector('.card-tags').appendChild(rangAgoTag);
        }
        const timeAgo = formatTimeSince(timer.rangAt);
        rangAgoTag.textContent = getTranslation('rang_ago', 'timer').replace('{time}', timeAgo);
    } else if (rangAgoTag) {
        rangAgoTag.remove();
    }

    const isFinished = !timer.isRunning && timer.remaining <= 0 && !timer.rangAt;
    card.classList.toggle('timer-finished', isFinished);
}
function updateTimerSection(sectionId, newName) {
    if (isAnyTimerRinging()) return;
    const section = timerSections.find(s => s.id === sectionId);
    if (section) {
        section.name = newName;
        saveTimerSectionsToStorage();
        renderAllTimerCards();
        updateTimerCounts();
        showDynamicIslandNotification('success', 'section_updated_success', 'notifications', { name: newName });
    }
}
function updateTimerCardControls(timer) {
    if (!timer) return;
    const cardElements = document.querySelectorAll(`#${timer.id}, #search-timer-${timer.id}`);
    const isGloballyRinging = isAnyTimerRinging();
    const ringingTimer = isGloballyRinging ? [...userTimers, ...defaultTimersState].find(t => t.isRinging) : null;

    cardElements.forEach(card => {
        const controls = card.querySelectorAll('[data-action]');
        controls.forEach(control => {
            const action = control.dataset.action;
            let shouldBeDisabled = false;

            if (isGloballyRinging) {
                if (ringingTimer && timer.id === ringingTimer.id) {
                    shouldBeDisabled = (action !== 'dismiss-timer');
                } else {
                    shouldBeDisabled = true;
                }
            } else {
                const individualState = getTimerControlsState(timer);
                switch (action) {
                    case 'start-card-timer': shouldBeDisabled = individualState.startDisabled; break;
                    case 'pause-card-timer': shouldBeDisabled = individualState.pauseDisabled; break;
                    case 'reset-card-timer': shouldBeDisabled = individualState.resetDisabled; break;
                    case 'edit-timer': shouldBeDisabled = individualState.editDisabled; break;
                    case 'delete-timer': shouldBeDisabled = individualState.deleteDisabled; break;
                    case 'pin-timer': shouldBeDisabled = false; break;
                }
            }
            control.classList.toggle('disabled-interactive', shouldBeDisabled);
        });

        const controlsState = getTimerControlsState(timer);
        const playPauseLink = card.querySelector('[data-action="start-card-timer"], [data-action="pause-card-timer"]');
        if (playPauseLink && controlsState.showPlayPause) {
            const icon = playPauseLink.querySelector('.material-symbols-rounded');
            const text = playPauseLink.querySelector('.menu-link-text span');
            playPauseLink.dataset.action = controlsState.playPauseAction;
            if (icon) icon.textContent = controlsState.playPauseIcon;
            if (text) {
                text.dataset.translate = controlsState.playPauseTextKey;
                text.textContent = getTranslation(controlsState.playPauseTextKey, 'tooltips');
            }
        }
    });
}

function updateAllTimerControls() {
    const section = document.querySelector('.section-timer');
    if (!section) return;

    const startBtn = section.querySelector('[data-action="start-pinned-timer"]');
    const pauseBtn = section.querySelector('[data-action="pause-pinned-timer"]');
    const resetBtn = section.querySelector('[data-action="reset-pinned-timer"]');
    const addTimerBtn = section.querySelector('[data-module="toggleMenuTimer"]');

    if (!startBtn || !pauseBtn || !resetBtn || !addTimerBtn) return;

    const isRinging = isAnyTimerRinging();
    addTimerBtn.classList.toggle('disabled-interactive', isRinging);

    if (isRinging) {
        startBtn.classList.add('disabled-interactive');
        pauseBtn.classList.add('disabled-interactive');
        resetBtn.classList.add('disabled-interactive');
    } else {
        const pinnedTimer = findTimerById(pinnedTimerId);
        if (pinnedTimer && pinnedTimer.type === 'countdown') {
            const controlsState = getTimerControlsState(pinnedTimer);
            startBtn.classList.toggle('disabled-interactive', controlsState.startDisabled);
            pauseBtn.classList.toggle('disabled-interactive', controlsState.pauseDisabled);
            resetBtn.classList.toggle('disabled-interactive', controlsState.resetDisabled);
        } else {
            startBtn.classList.add('disabled-interactive');
            pauseBtn.classList.add('disabled-interactive');
            resetBtn.classList.add('disabled-interactive');
        }
    }

    // Actualizar todas las tarjetas
    [...userTimers, ...defaultTimersState].forEach(timer => {
        updateTimerCardControls(timer);
    });
}

function createTimerCardFromData(timer) {
    const controlsState = getTimerControlsState(timer);
    const isDefault = timer.id.startsWith('default-timer-');
    const titleText = isDefault ? getTranslation(timer.title, 'timer') : timer.title;
    const soundName = getSoundNameById(timer.sound);

    let tags = [{ text: soundName, soundId: timer.sound }];
    if (shouldShowRangAtTag(timer)) {
        const timeAgo = formatTimeSince(timer.rangAt);
        const rangAgoText = getTranslation('rang_ago', 'timer').replace('{time}', timeAgo);
        tags.push({ text: rangAgoText, className: 'rang-ago-tag' });
    }

    const menuItems = [];
    if (controlsState.showPlayPause) {
        const startPauseDisabled = controlsState.isRunning ? controlsState.pauseDisabled : controlsState.startDisabled;
        menuItems.push({ action: controlsState.playPauseAction, icon: controlsState.playPauseIcon, textKey: controlsState.playPauseTextKey, textCategory: 'tooltips', disabled: startPauseDisabled });
    }
    if (controlsState.showReset) {
        menuItems.push({ action: 'reset-card-timer', icon: 'refresh', textKey: 'reset', textCategory: 'tooltips', disabled: controlsState.resetDisabled });
    }
    menuItems.push({ action: 'edit-timer', icon: 'edit', textKey: 'edit_timer', textCategory: 'timer', disabled: controlsState.editDisabled });
    if (!isDefault) {
        menuItems.push({ action: 'delete-timer', icon: 'delete', textKey: 'delete_timer', textCategory: 'timer', disabled: controlsState.deleteDisabled });
    }

    const actionButtons = [
        { action: 'pin-timer', icon: 'push_pin', tooltipKey: 'pin_timer', active: timer.isPinned }
    ];

    return createToolCard({
        id: timer.id,
        cardClass: 'timer-card',
        cardType: 'timer',
        title: titleText,
        value: formatTime(timer.remaining, timer.type),
        tags: tags,
        menuItems: menuItems,
        actionButtons: actionButtons,
        dismissAction: 'dismiss-timer',
        isFinished: !timer.isRunning && timer.remaining <= 0 && !timer.rangAt,
        type: 'timer'
    });
}

function renderTimerSearchResults(searchTerm) {
    const menuElement = document.querySelector('.menu-component[data-menu="timer"]');
    if (!menuElement) return;

    const resultsWrapper = menuElement.querySelector('.search-results-wrapper');
    const creationWrapper = menuElement.querySelector('.creation-wrapper');
    const typeSelector = menuElement.querySelector('.menu-section-selector');
    const menuBottom = menuElement.querySelector('.menu-section-bottom');

    if (!resultsWrapper || !creationWrapper || !typeSelector || !menuBottom) return;

    if (!searchTerm) {
        resultsWrapper.classList.add('disabled');
        creationWrapper.classList.remove('disabled');
        typeSelector.classList.remove('disabled');
        menuBottom.classList.remove('disabled');
        resultsWrapper.innerHTML = '';
        return;
    }

    const allTimers = [...userTimers, ...defaultTimersState];
    const filteredTimers = allTimers.filter(timer => {
        const translatedTitle = timer.id.startsWith('default-timer-') ? getTranslation(timer.title, 'timer') : timer.title;
        return translatedTitle.toLowerCase().includes(searchTerm.toLowerCase());
    });

    creationWrapper.classList.add('disabled');
    typeSelector.classList.add('disabled');
    resultsWrapper.classList.remove('disabled');
    menuBottom.classList.add('disabled');
    resultsWrapper.innerHTML = '';

    if (filteredTimers.length > 0) {
        const list = document.createElement('div');
        list.className = 'menu-list';
        filteredTimers.forEach(timer => {
            const item = createTimerSearchResultItem(timer);
            list.appendChild(item);
            addSearchItemEventListeners(item);
        });
        resultsWrapper.appendChild(list);
    } else {
        resultsWrapper.innerHTML = `<p class="no-results-message">${getTranslation('no_results', 'search')} "${searchTerm}"</p>`;
    }
}

function createTimerSearchResultItem(timer) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.id = `search-timer-${timer.id}`;
    item.dataset.id = timer.id;
    item.dataset.type = 'timer';
    item.classList.toggle('timer-finished', !timer.isRunning && timer.remaining <= 0 && !timer.rangAt);
    const translatedTitle = timer.id.startsWith('default-timer-') ? getTranslation(timer.title, 'timer') : timer.title;
    const time = formatTime(timer.remaining, timer.type);
    const controlsState = getTimerControlsState(timer);
    const isRinging = isAnyTimerRinging();
    let dynamicActionsHTML = '';
    if (controlsState.showPlayPause || controlsState.showReset) {
        const startPauseDisabled = (controlsState.isRunning ? controlsState.pauseDisabled : controlsState.startDisabled) || isRinging;
        const playPauseAction = controlsState.showPlayPause ? `
            <div class="menu-link ${startPauseDisabled ? 'disabled-interactive' : ''}" data-action="${controlsState.playPauseAction}">
                <div class="menu-link-icon"><span class="material-symbols-rounded">${controlsState.playPauseIcon}</span></div>
                <div class="menu-link-text"><span>${getTranslation(controlsState.playPauseTextKey, 'tooltips')}</span></div>
            </div>` : '';
        const resetAction = controlsState.showReset ? `
            <div class="menu-link ${(controlsState.resetDisabled || isRinging) ? 'disabled-interactive' : ''}" data-action="reset-card-timer">
                <div class="menu-link-icon"><span class="material-symbols-rounded">refresh</span></div>
                <div class="menu-link-text"><span>${getTranslation('reset', 'tooltips')}</span></div>
            </div>` : '';
        dynamicActionsHTML = playPauseAction + resetAction;
    }
    const deleteLinkHtml = timer.id.startsWith('default-timer-') ? '' : `
        <div class="menu-link ${(controlsState.deleteDisabled || isRinging) ? 'disabled-interactive' : ''}" data-action="delete-timer">
            <div class="menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
            <div class="menu-link-text"><span>${getTranslation('delete_timer', 'timer')}</span></div>
        </div>
    `;
    item.innerHTML = `
        <div class="result-info">
            <span class="result-title">${translatedTitle}</span>
            <span class="result-time">${time}</span>
        </div>
        <div class="card-menu-container disabled"> 
             <button class="card-action-btn ${timer.isPinned ? 'active' : ''} ${isRinging ? 'disabled-interactive' : ''}" data-action="pin-timer" data-translate="pin_timer" data-translate-category="tooltips" data-translate-target="tooltip">
                 <span class="material-symbols-rounded">push_pin</span>
             </button>
             <button class="card-action-btn ${isRinging ? 'disabled-interactive' : ''}" data-action="toggle-item-menu"
                     data-translate="timer_options"
                     data-translate-category="timer"
                     data-translate-target="tooltip">
                 <span class="material-symbols-rounded">more_horiz</span>
             </button>
             <div class="card-dropdown-menu body-title disabled">
                 ${dynamicActionsHTML}
                 <div class="menu-link ${(controlsState.editDisabled || isRinging) ? 'disabled-interactive' : ''}" data-action="edit-timer">
                     <div class="menu-link-icon"><span class="material-symbols-rounded">edit</span></div>
                     <div class="menu-link-text"><span>${getTranslation('edit_timer', 'timer')}</span></div>
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

        if (actionTarget.classList.contains('disabled-interactive')) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();

        const action = actionTarget.dataset.action;
        const timerId = item.dataset.id;

        if (action === 'toggle-item-menu') {
            const dropdown = item.querySelector('.card-dropdown-menu');
            const isOpening = dropdown.classList.contains('disabled');

            document.querySelectorAll('.timer-search-results-wrapper .card-dropdown-menu').forEach(d => {
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
            handleTimerCardAction(action, timerId, actionTarget);
        }
    });
}

function refreshSearchResults() {
    const searchInput = document.getElementById('timer-search-input');
    if (searchInput && searchInput.value) {
        renderTimerSearchResults(searchInput.value.toLowerCase());
    }
}

function handleTimerEnd(timerId) {
    const timer = findTimerById(timerId);
    if (!timer) return;

    timer.isRunning = false;
    if (activeTimers.has(timerId)) {
        cancelAnimationFrame(activeTimers.get(timerId));
        activeTimers.delete(timerId);
    }
    timer.remaining = 0;
    timer.lastTriggered = Date.now();
    delete timer.rangAt;
    timer.isRinging = true;

    updateTimerCardVisuals(timer);
    updateAllTimerControls();
    refreshSearchResults();

    const isUserTimer = userTimers.some(t => t.id === timerId);
    if (isUserTimer) saveTimersToStorage(); else saveDefaultTimersOrder();

    let soundToPlay = timer.sound;
    const availableSounds = getAvailableSounds();
    if (!availableSounds.some(s => s.id === soundToPlay)) {
        soundToPlay = 'classic_beep';
        timer.sound = soundToPlay;
        updateTimer(timer.id, { sound: soundToPlay });
    }

    if (timer.sound) {
        playSound(soundToPlay, timer.id);
    }
    const translatedTitle = timer.id.startsWith('default-timer-') ? getTranslation(timer.title, 'timer') : timer.title;

    const card = document.getElementById(timerId);
    card?.querySelector('.card-options-container')?.classList.add('active');

    showRingingScreen('timer', {
        title: translatedTitle,
        sound: timer.sound,
        toolId: timer.id
    }, (dismissedId) => {
        if (dismissedId === timer.id) {
            dismissTimer(timer.id);
        }
    }, null, (restartedId) => {
        if (restartedId === timer.id) {
            dismissTimer(restartedId);
            resetTimer(restartedId);
            startTimer(restartedId);
        }
    });
}

function dismissTimer(timerId) {
    stopSound(timerId);
    hideRingingScreen(timerId); 

    const card = document.getElementById(timerId);
    if (card) {
        const optionsContainer = card.querySelector('.card-options-container');
        if (optionsContainer) {
            optionsContainer.classList.remove('active');
        }
    }

    const timer = findTimerById(timerId);
    if (timer) {
        timer.isRinging = false;
        delete timer.rangAt;

        if (timer.type === 'countdown') {
            timer.remaining = timer.initialDuration;
            timer.isRunning = false;
            delete timer.targetTime;
        }

        updateCardDisplay(timerId);
        if (timer.id === pinnedTimerId) updateMainDisplay();
        updateAllTimerControls();
        refreshSearchResults();
        updateEverythingWidgets();
        saveAllTimersState();
    }
}
function getTimersCount() {
    return userTimers.length;
}

function getTimerLimit() {
    return 100;
}

function getRunningTimersCount() {
    const allTimers = [...userTimers, ...defaultTimersState];
    return allTimers.filter(timer => timer.isRunning).length;
}

function getActiveTimerDetails() {
    const runningTimer = [...userTimers, ...defaultTimersState].find(t => t.isRunning);
    if (!runningTimer) {
        return null;
    }

    const title = runningTimer.id.startsWith('default-timer-') ? getTranslation(runningTimer.title, 'timer') : runningTimer.title;
    const remainingTime = formatTime(runningTimer.remaining, runningTimer.type);

    return `${title} (${remainingTime} ${getTranslation('remaining', 'everything') || 'restantes'})`;
}

function findTimerById(timerId) {
    return userTimers.find(t => t.id === timerId) || defaultTimersState.find(t => t.id === timerId);
}

function saveAllTimersState() {
    saveTimersToStorage();
    saveDefaultTimersOrder();
}

function saveTimersToStorage() {
    localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(userTimers));
}

function saveDefaultTimersOrder() {
    localStorage.setItem(DEFAULT_TIMERS_STORAGE_KEY, JSON.stringify(defaultTimersState));
}

function startCountdownTimer(timer) {
    const timerLoop = () => {
        if (!timer.isRunning) {
            if (activeTimers.has(timer.id)) {
                cancelAnimationFrame(activeTimers.get(timer.id));
                activeTimers.delete(timer.id);
            }
            return;
        }

        const rawRemaining = timer.targetTime - Date.now();
        timer.remaining = Math.max(0, rawRemaining);

        updateCardDisplay(timer.id);
        if (timer.id === pinnedTimerId) {
            updateMainDisplay();
        }

        if (rawRemaining <= 0) {
            handleTimerEnd(timer.id);
        } else {
            const frameId = requestAnimationFrame(timerLoop);
            activeTimers.set(timer.id, frameId);
        }
    };
    timerLoop();
}

function startCountToDateTimer(timer) {
    const timerLoop = () => {
        if (!timer.isRunning) {
             if (activeTimers.has(timer.id)) {
                cancelAnimationFrame(activeTimers.get(timer.id));
                activeTimers.delete(timer.id);
            }
            return;
        }

        const rawRemaining = new Date(timer.targetDate).getTime() - Date.now();
        timer.remaining = Math.max(0, rawRemaining);

        updateCardDisplay(timer.id);
        if (timer.id === pinnedTimerId) {
            updateMainDisplay();
        }

        if (rawRemaining <= 0) {
            handleTimerEnd(timer.id);
        } else {
            const frameId = requestAnimationFrame(timerLoop);
            activeTimers.set(timer.id, frameId);
        }
    };
    timerLoop();
}


function formatTime(ms, type = 'countdown') {
    if (ms <= 0) {
        return type === 'count_to_date' ? getTranslation('event_finished', 'timer') || "¡Evento finalizado!" : "00:00:00";
    }

    const totalSeconds = Math.max(0, Math.floor(Math.max(0, ms) / 1000));

    if (type === 'count_to_date') {
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
        return `${hours}:${minutes}:${seconds}`;
    } else {
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
}

function addTimerAndRender(timerData, sectionId = 'user') {
    if (isAnyTimerRinging()) {
        showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
        return;
    }
    const newTimer = {
        id: `timer-${Date.now()}`,
        title: timerData.title,
        type: timerData.type,
        sound: timerData.sound,
        isRunning: false,
        isPinned: false,
        sectionId: sectionId
    };

    const timerLimit = getTimerLimit();
    if (userTimers.length >= timerLimit) {
        showDynamicIslandNotification(
            'error',
            'limit_reached_message_premium',
            'notifications',
            { type: getTranslation('timer', 'tooltips') }
        );
        return;
    }

    if (timerData.type === 'count_to_date') {
        newTimer.targetDate = timerData.targetDate;
        newTimer.remaining = new Date(timerData.targetDate).getTime() - Date.now();
    } else {
        newTimer.initialDuration = timerData.duration;
        newTimer.remaining = timerData.duration;
    }

    userTimers.push(newTimer);
    trackEvent('interaction', 'create_timer');

    if ((userTimers.length + defaultTimersState.length) === 1 || ![...userTimers, ...defaultTimersState].some(t => t.isPinned)) {
        newTimer.isPinned = true;
        pinnedTimerId = newTimer.id;
    }

    saveTimersToStorage();
    renderAllTimerCards();
    updateMainDisplay();
    updateAllTimerControls();
    updateTimerCounts();

    if (newTimer.type === 'count_to_date') {
        startTimer(newTimer.id);
    }

    showDynamicIslandNotification('success', 'timer_created', 'notifications', { title: newTimer.title });
    updateEverythingWidgets();
}

function renderAllTimerCards() {
    renderTimerSections();
    document.querySelectorAll('.tool-grid[data-timer-grid]').forEach(grid => grid.innerHTML = '');

    userTimers.forEach(timer => {
        const grid = document.querySelector(`.tool-grid[data-timer-grid="${timer.sectionId || 'user'}"]`);
        if (grid) {
            const card = createTimerCardFromData(timer);
            grid.appendChild(card);
        }
    });

    defaultTimersState.forEach(timer => {
        const grid = document.querySelector(`.tool-grid[data-timer-grid="default"]`);
        if (grid) {
            const card = createTimerCardFromData(timer);
            grid.appendChild(card);
        }
    });
    
    applyTimerCollapsedSectionsState();
    applySavedTimerSectionOrder();
    updatePinnedStatesInUI();
    initializeTimerSortable();
}

function applyTimerCollapsedSectionsState() {
    document.querySelectorAll('.timers-container').forEach(container => {
        const type = container.dataset.container;
        const grid = container.querySelector(`.tool-grid[data-timer-grid="${type}"]`);
        const btn = container.querySelector('.expandable-card-toggle-btn');

        if (grid && btn) {
            if (expandedTimerSections.has(type)) {
                grid.classList.add('active');
                btn.classList.add('expanded');
            } else {
                grid.classList.remove('active');
                btn.classList.remove('expanded');
            }
        }
    });
}

function updateMainDisplay() {
    const mainDisplay = document.querySelector('.tool-timer span');
    if (!mainDisplay) return;

    const pinnedTimer = findTimerById(pinnedTimerId);
    if (pinnedTimer) {
        mainDisplay.textContent = formatTime(pinnedTimer.remaining, pinnedTimer.type);
        if (window.centralizedFontManager) {
            window.centralizedFontManager.adjustAndApplyFontSizeToSection('timer');
        }
    } else {
        mainDisplay.textContent = formatTime(0, 'countdown');
    }
    updatePinnedTimerNameDisplay();
}

function updateCardDisplay(timerId) {
    const timer = findTimerById(timerId);
    if (!timer) return;

    const mainCard = document.getElementById(timerId);
    const searchItem = document.getElementById(`search-timer-${timerId}`);
    const isFinished = !timer.isRunning && timer.remaining <= 0 && !timer.rangAt;

    if (mainCard) {
        const timeElement = mainCard.querySelector('.card-value');
        if (timeElement) {
            timeElement.textContent = formatTime(timer.remaining, timer.type);
        }
        mainCard.classList.toggle('timer-finished', isFinished);
    }

    if (searchItem) {
        const timeElement = searchItem.querySelector('.result-time');
        if (timeElement) {
            timeElement.textContent = formatTime(timer.remaining, timer.type);
        }
        searchItem.classList.toggle('timer-finished', isFinished);
    }

    if (timer.id === pinnedTimerId && window.centralizedFontManager) {
        window.centralizedFontManager.ensureTextFits('timer');
    }
}

function updatePinnedStatesInUI() {
    const allTimers = [...userTimers, ...defaultTimersState];
    if (!pinnedTimerId && allTimers.length > 0) {
        const firstTimer = allTimers[0];
        pinnedTimerId = firstTimer.id;
        firstTimer.isPinned = true;
        const isUser = userTimers.some(t => t.id === firstTimer.id);
        if (isUser) saveTimersToStorage(); else saveDefaultTimersOrder();
    }

    document.querySelectorAll('.tool-card.timer-card').forEach(card => {
        const pinBtn = card.querySelector('[data-action="pin-timer"]');
        if (pinBtn) {
            pinBtn.classList.toggle('active', card.id === pinnedTimerId);
        }
    });

    document.querySelectorAll('.search-result-item[data-type="timer"]').forEach(searchItem => {
        const pinBtn = searchItem.querySelector('[data-action="pin-timer"]');
        if (pinBtn) {
            pinBtn.classList.toggle('active', searchItem.dataset.id === pinnedTimerId);
        }
    });
}

function updatePinnedTimerNameDisplay() {
    const nameDisplayTool = document.querySelector('.info-tool[data-timer-name-display]');
    if (!nameDisplayTool) return;

    let span = nameDisplayTool.querySelector('span');
    if (!span) {
        span = document.createElement('span');
        nameDisplayTool.innerHTML = '';
        nameDisplayTool.appendChild(span);
    }

    const pinnedTimer = findTimerById(pinnedTimerId);
    if (pinnedTimer) {
        const title = pinnedTimer.id.startsWith('default-timer-')
            ? getTranslation(pinnedTimer.title, 'timer')
            : pinnedTimer.title;
        span.textContent = title;
        nameDisplayTool.setAttribute('data-translate', 'pinned_timer_tooltip');
        nameDisplayTool.setAttribute('data-translate-category', 'timer');
        nameDisplayTool.setAttribute('data-translate-target', 'tooltip');
    } else {
        span.textContent = '-';
        nameDisplayTool.removeAttribute('data-tooltip');
        nameDisplayTool.removeAttribute('data-translate');
        nameDisplayTool.removeAttribute('data-translate-category');
        nameDisplayTool.removeAttribute('data-translate-target');
    }
    if (window.tooltipManager && typeof window.tooltipManager.attachTooltipsToNewElements === 'function') {
        window.tooltipManager.attachTooltipsToNewElements(nameDisplayTool.parentElement);
    }
}

function updateTimerCounts() {
    const myTimers = userTimers.filter(timer => !timer.sectionId || timer.sectionId === 'user');
    const myTimersCount = myTimers.length;
    const myTimersContainer = document.querySelector('.timers-container[data-container="user"]');
    if (myTimersContainer) {
        const myTimersBadge = myTimersContainer.querySelector('.timer-count-badge');
        if (myTimersBadge) myTimersBadge.textContent = myTimersCount;
        myTimersContainer.classList.toggle('disabled', myTimersCount === 0);
        myTimersContainer.classList.toggle('active', myTimersCount > 0);
    }

    timerSections.forEach(section => {
        const sectionTimers = userTimers.filter(timer => timer.sectionId === section.id);
        const sectionCount = sectionTimers.length;
        const sectionContainer = document.querySelector(`.timers-container[data-container="${section.id}"]`);
        if (sectionContainer) {
            const sectionBadge = sectionContainer.querySelector('.timer-count-badge');
            if (sectionBadge) sectionBadge.textContent = sectionCount;
        }
    });

    const defaultTimersCount = defaultTimersState.length;
    const defaultContainer = document.querySelector('.timers-container[data-container="default"]');
    if (defaultContainer) {
        const defaultBadge = defaultContainer.querySelector('.timer-count-badge');
        if (defaultBadge) defaultBadge.textContent = defaultTimersCount;
        defaultContainer.classList.toggle('disabled', defaultTimersCount === 0);
        defaultContainer.classList.toggle('active', defaultTimersCount > 0);
    }
}


function handlePinTimer(timerId) {
    if (isAnyTimerRinging()) return;
    if (pinnedTimerId === timerId) return;

    trackEvent('interaction', 'pin_timer');

    const allTimers = [...userTimers, ...defaultTimersState];
    allTimers.forEach(t => t.isPinned = (t.id === timerId));
    pinnedTimerId = timerId;

    updatePinnedStatesInUI();
    updateMainDisplay();
    updateAllTimerControls();
    saveTimersToStorage();
    saveDefaultTimersOrder();
}

function handleEditTimer(timerId) {
    if (isAnyTimerRinging()) return;
    const timerData = findTimerById(timerId);
    if (timerData) {
        if (timerData.type === 'count_to_date') {
            prepareCountToDateForEdit(timerData);
        } else {
            prepareTimerForEdit(timerData);
        }
        if (getCurrentActiveOverlay() !== 'menuTimer') {
            activateModule('toggleMenuTimer');
        }

        const searchInput = document.getElementById('timer-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        renderTimerSearchResults('');
    }
}

function handleDeleteTimer(timerId) {
    if (isAnyTimerRinging()) return;
    if (timerId.startsWith('default-timer-')) {
        return;
    }

    const timerToDelete = findTimerById(timerId);
    if (!timerToDelete) return;

    const timerName = timerToDelete.id.startsWith('default-timer-') ? getTranslation(timerToDelete.title, 'timer') : timerToDelete.title;

    setTimeout(() => {
        showModal('confirmation', { type: 'timer', name: timerName }, () => {
            trackEvent('interaction', 'delete_timer');
            if (activeTimers.has(timerId)) {
                cancelAnimationFrame(activeTimers.get(timerId));
                activeTimers.delete(timerId);
            }
            const originalTitle = timerToDelete.id.startsWith('default-timer-') ? getTranslation(timerToDelete.title, 'timer') : timerToDelete.title;

            const userIndex = userTimers.findIndex(t => t.id === timerId);
            if (userIndex !== -1) {
                userTimers.splice(userIndex, 1);
                saveTimersToStorage();
            }

            if (pinnedTimerId === timerId) {
                const allTimers = [...userTimers, ...defaultTimersState];
                pinnedTimerId = allTimers.length > 0 ? allTimers[0].id : null;
                if (pinnedTimerId) {
                    const newPinnedTimer = findTimerById(pinnedTimerId);
                    if (newPinnedTimer) {
                        newPinnedTimer.isPinned = true;
                        const isUser = userTimers.some(t => t.id === newPinnedTimer.id);
                        if (isUser) saveTimersToStorage(); else saveDefaultTimersOrder();
                    }
                }
            }

            renderAllTimerCards();
            updateMainDisplay();
            updateAllTimerControls();
            updateTimerCounts();
            refreshSearchResults();
            if (window.hideDynamicIsland) {
                window.hideDynamicIsland();
            }

            showDynamicIslandNotification('success', 'timer_deleted', 'notifications', {
                title: originalTitle
            });
            updateEverythingWidgets();
        });
    }, 50);
}

function applySavedTimerSectionOrder() {
    const wrapper = document.querySelector('.timers-list-wrapper');
    const savedOrder = JSON.parse(localStorage.getItem('timer-sections-order'));

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

function initializeTimerSortable() {
    const wrapper = document.querySelector('.timers-list-wrapper');
    if (wrapper) {
        new Sortable(wrapper, {
            group: 'timer-sections',
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
                const wrapper = document.querySelector('.timers-list-wrapper');
                const newOrderIds = Array.from(wrapper.querySelectorAll('.timers-container'))
                    .map(el => el.dataset.container);

                localStorage.setItem('timer-sections-order', JSON.stringify(newOrderIds));

                const userSectionIds = newOrderIds.filter(id => id && id.startsWith('timer-section-'));
                timerSections.sort((a, b) => userSectionIds.indexOf(a.id) - userSectionIds.indexOf(b.id));
                saveTimerSectionsToStorage();
            }
        });
    }

    const grids = document.querySelectorAll('.tool-grid[data-timer-grid]');
    grids.forEach(grid => {
        new Sortable(grid, {
            group: `timers-cards-${grid.dataset.timerGrid}`,
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

                if (grid.dataset.timerGrid === 'default') {
                    defaultTimersState.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                    saveDefaultTimersOrder();
                } else {
                    const allUserGrids = document.querySelectorAll('.tool-grid[data-timer-grid="user"], .tool-grid[data-timer-grid^="timer-section-"]');
                    const newUserTimers = [];
                    allUserGrids.forEach(g => {
                        Array.from(g.children).forEach(card => {
                            const timer = userTimers.find(t => t.id === card.id);
                            if (timer) {
                                newUserTimers.push(timer);
                            }
                        });
                    });
                    userTimers = newUserTimers;
                    saveTimersToStorage();
                }
            }
        });
    });
}
function deleteTimerSection(sectionId) {
    if (isAnyTimerRinging()) return;
    const section = timerSections.find(s => s.id === sectionId);
    if (!section) return;

    userTimers = userTimers.filter(timer => timer.sectionId !== sectionId);
    timerSections = timerSections.filter(s => s.id !== sectionId);

    saveTimersToStorage();
    saveTimerSectionsToStorage();
    renderAllTimerCards();
    updateTimerCounts();
    showDynamicIslandNotification('success', 'section_deleted', 'notifications', { name: section.name });
}
function initializeTimerController() {
    const wrapper = document.querySelector('.timers-list-wrapper');
    if (wrapper) {
        const userContainer = createExpandableToolContainer({
            type: 'user',
            titleKey: 'my_timers',
            translationCategory: 'timer',
            icon: 'timer',
            containerClass: 'timers-container',
            badgeClass: 'timer-count-badge',
            gridAttribute: 'data-timer-grid',
            toggleFunction: toggleTimersSection
        });
        userContainer.dataset.containerType = 'user';

        const defaultContainer = createExpandableToolContainer({
            type: 'default',
            titleKey: 'default_timers',
            translationCategory: 'timer',
            icon: 'timelapse',
            containerClass: 'timers-container',
            badgeClass: 'timer-count-badge',
            gridAttribute: 'data-timer-grid',
            toggleFunction: toggleTimersSection
        });
        wrapper.appendChild(userContainer);
        wrapper.appendChild(defaultContainer);
    }

    const section = document.querySelector('.section-timer');
    if (!section) return;

    const addTimerBtn = section.querySelector('[data-module="toggleMenuTimer"]');
    if (addTimerBtn) {
        addTimerBtn.addEventListener('click', (e) => {
            if (isAnyTimerRinging()) {
                e.preventDefault();
                e.stopPropagation();
                showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            }
        }, true);
    }
    
    const menuElement = document.querySelector('.menu-component[data-menu="timer"]');
    if (menuElement) {
        const createButton = menuElement.querySelector('[data-action="createTimer"]');
        if (createButton) {
            createButton.addEventListener('click', (e) => {
                if (isAnyTimerRinging()) {
                    e.preventDefault();
                    e.stopPropagation();
                    showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                }
            });
        }
    }

    const startBtn = section.querySelector('[data-action="start-pinned-timer"]');
    const pauseBtn = section.querySelector('[data-action="pause-pinned-timer"]');
    const resetBtn = section.querySelector('[data-action="reset-pinned-timer"]');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (isAnyTimerRinging()) {
                showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                return;
            }
            if (pinnedTimerId) {
                startTimer(pinnedTimerId);
            }
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
             if (isAnyTimerRinging()) {
                showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                return;
            }
            if (pinnedTimerId) {
                pauseTimer(pinnedTimerId);
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
             if (isAnyTimerRinging()) {
                showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
                return;
            }
            if (pinnedTimerId) {
                resetTimer(pinnedTimerId);
            }
        });
    }
    loadTimerSectionsFromStorage();
    loadAndRestoreTimers();
    renderAllTimerCards();
    updateMainDisplay();
    updateAllTimerControls();
    updateTimerCounts();
    applySavedTimerSectionOrder();
    initializeTimerSortable();

    const searchInput = document.getElementById('timer-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => renderTimerSearchResults(e.target.value.toLowerCase()));
    }
    function updateTimerSection(sectionId, newName) {
        if (isAnyTimerRinging()) return;
        const section = timerSections.find(s => s.id === sectionId);
        if (section) {
            section.name = newName;
            saveTimerSectionsToStorage();
            renderAllTimerCards();
            updateTimerCounts();
            showDynamicIslandNotification('success', 'section_updated', 'notifications', { name: newName });
        }
    }
    window.addEventListener('beforeunload', () => {
        localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
    });

    window.timerManager = {
        startTimer,
        pauseTimer,
        resetTimer,
        handleEditTimer,
        getUpcomingTimers: () => [...userTimers, ...defaultTimersState].filter(t => t.isRunning),
        handleDeleteTimer,
        dismissTimer,
        handlePinTimer,
        toggleTimersSection,
        findTimerById,
        getTimersCount,
        updateTimerSection,
        getTimerLimit,
        getRunningTimersCount,
        getActiveTimerDetails,
        createTimerSection,
        deleteTimerSection,
        getAllTimers: () => ({ userTimers, defaultTimers: defaultTimersState }),
        getAllSections: () => timerSections,
        saveAllTimers: () => {
            saveTimersToStorage();
            saveDefaultTimersOrder();
        },
        renderAllTimerCards,
        getPinnedTimer: () => findTimerById(pinnedTimerId),
        formatTime: formatTime,
        isAnyTimerRinging
    };

    updateEverythingWidgets();

    document.addEventListener('moduleDeactivated', (e) => {
        if (e.detail && e.detail.module === 'toggleMenuTimer') {
            const menuElement = document.querySelector('.menu-component[data-menu="timer"]');
            if (!menuElement) return;

            const searchInput = menuElement.querySelector('#timer-search-input');
            if (searchInput) {
                searchInput.value = '';
                renderTimerSearchResults('');
            }
        }
    });
    
    document.addEventListener('sectionChanged', (e) => {
        if (rememberExpandedSectionsOnNav === false) {
            if (e.detail.previousSection === 'timer' && e.detail.activeSection !== 'timer') {
                expandedTimerSections.clear();
            }
            if (e.detail.activeSection === 'timer') {
                applyTimerCollapsedSectionsState();
            }
        }
    });
}

document.addEventListener('translationsApplied', () => {
    const allTimers = [...userTimers, ...defaultTimersState];
    allTimers.forEach(timer => {
        updateTimerCardVisuals(timer);
    });
    updateMainDisplay();
});

export { updateTimer, getTimersCount, getTimerLimit, addTimerAndRender, initializeTimerController };