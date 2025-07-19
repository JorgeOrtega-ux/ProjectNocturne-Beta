import { getTranslation, translateElementTree } from '../core/translations-controller.js';
import { use24HourFormat, toggleModule, toggleTimeFormat } from '../app/main.js';

const WIDGET_DEFINITIONS = {
    'clock-widget': {
        className: 'widget-clock',
        generateContent: () => `
            <div class="clock-content">
                <div class="clock-time" id="main-clock-time-long">--:--:--</div>
                <div class="clock-date" id="main-clock-date"></div>
            </div>
            <div class="add-button-container">
                <button class="header-button" data-action="toggle-time-format" data-translate="change_format" data-translate-category="tooltips" data-translate-target="tooltip">
                    <span class="material-symbols-rounded">schedule</span>
                </button>
                <button class="header-button add-btn" data-action="toggle-add-menu" data-translate="add_element" data-translate-category="tooltips" data-translate-target="tooltip">
                    <span class="material-symbols-rounded">add</span>
                </button>
                <div class="dropdown-menu-container add-menu-custom disabled">
                    <div class="menu-list">
                        <div class="menu-link" data-module="toggleMenuAlarm">
                            <div class="menu-link-icon"><span class="material-symbols-rounded">add_alarm</span></div>
                            <div class="menu-link-text"><span data-translate="new_alarm" data-translate-category="everything">Nueva alarma</span></div>
                        </div>
                        <div class="menu-link" data-module="toggleMenuTimer">
                            <div class="menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                            <div class="menu-link-text"><span data-translate="new_timer" data-translate-category="everything">Nuevo temporizador</span></div>
                        </div>
                        <div class="menu-link" data-module="toggleMenuWorldClock">
                            <div class="menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                            <div class="menu-link-text"><span data-translate="add_clock" data-translate-category="everything">Añadir reloj</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
};

let smartUpdateInterval = null;
let updateTimeout = null;

function createWidgetElement(id) {
    const definition = WIDGET_DEFINITIONS[id];
    if (!definition) return null;
    const widget = document.createElement('div');
    widget.id = id;
    widget.className = `widget ${definition.className}`;
    widget.innerHTML = definition.generateContent();
    return widget;
}

function rebindEventListeners() {
    const actionItems = document.querySelectorAll('.add-menu-custom .menu-link[data-module]');
    actionItems.forEach(item => {
        const moduleName = item.dataset.module;
        if (moduleName) {
            item.addEventListener('click', () => {
                if (!item.classList.contains('disabled-interactions')) {
                    toggleModule(moduleName);
                    const menu = item.closest('.add-menu-custom');
                    if (menu) {
                        menu.classList.add('disabled');
                    }
                }
            });
        }
    });

    const addMenuButton = document.querySelector('[data-action="toggle-add-menu"]');
    if (addMenuButton) {
        addMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.querySelector('.add-menu-custom');
            if (menu) {
                menu.classList.toggle('disabled');
            }
        });
    }

    const timeFormatButton = document.querySelector('[data-action="toggle-time-format"]');
    if (timeFormatButton) {
        timeFormatButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTimeFormat();
        });
    }

    document.addEventListener('click', (e) => {
        const menu = document.querySelector('.add-menu-custom');
        const addButton = document.querySelector('[data-action="toggle-add-menu"]');
        if (menu && !menu.classList.contains('disabled') && !menu.contains(e.target) && !addButton.contains(e.target)) {
            menu.classList.add('disabled');
        }
    });
}

function renderAllWidgets() {
    const mainContainer = document.querySelector('.everything-grid-container');
    if (!mainContainer) return;

    mainContainer.innerHTML = '';

    const clockWidget = createWidgetElement('clock-widget');
    if (clockWidget) mainContainer.appendChild(clockWidget);

    if (typeof translateElementTree === 'function') {
        translateElementTree(mainContainer);
    }
    rebindEventListeners();
    updateActionCounts();
}

function updateActionCounts() {
    const alarmMenuItem = document.querySelector('.add-menu-custom .menu-link[data-module="toggleMenuAlarm"]');
    const timerMenuItem = document.querySelector('.add-menu-custom .menu-link[data-module="toggleMenuTimer"]');
    const clockMenuItem = document.querySelector('.add-menu-custom .menu-link[data-module="toggleMenuWorldClock"]');

    let isAnyAlarmRinging = false;
    if (window.alarmManager && typeof window.alarmManager.getAllAlarms === 'function') {
        const { userAlarms, defaultAlarms } = window.alarmManager.getAllAlarms();
        isAnyAlarmRinging = [...userAlarms, ...defaultAlarms].some(a => a.isRinging);
    }

    if (alarmMenuItem && window.alarmManager) {
        const count = window.alarmManager.getAlarmCount();
        const limit = window.alarmManager.getAlarmLimit();
        const isAlarmDisabled = count >= limit || isAnyAlarmRinging;
        alarmMenuItem.classList.toggle('disabled-interactions', isAlarmDisabled);
    }

    if (timerMenuItem && window.timerManager) {
        const count = window.timerManager.getTimersCount();
        const limit = window.timerManager.getTimerLimit();
        const isTimerDisabled = count >= limit;
        timerMenuItem.classList.toggle('disabled-interactions', isTimerDisabled);
    }

    if (clockMenuItem && window.worldClockManager) {
        const count = window.worldClockManager.getClockCount();
        const limit = window.worldClockManager.getClockLimit();
        const isClockDisabled = count >= limit;
        clockMenuItem.classList.toggle('disabled-interactions', isClockDisabled);
    }
}

function initializeEverything() {
    if (smartUpdateInterval) clearInterval(smartUpdateInterval);
    renderAllWidgets();
    updateCurrentDate();
    smartUpdateInterval = setInterval(updateCurrentDate, 1000);
    document.addEventListener('translationsApplied', updateEverythingWidgets);
    document.addEventListener('timeFormatChanged', updateCurrentDate);
}

function updateCurrentDate() {
    const now = new Date();
    const clockTime = document.getElementById('main-clock-time-long');
    const clockDate = document.getElementById('main-clock-date');

    if (clockTime) {
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !use24HourFormat };
        clockTime.textContent = now.toLocaleTimeString(navigator.language, timeOptions);
    }

    if (clockDate) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const dayOfWeek = getTranslation(dayNames[now.getDay()], 'weekdays');
        const month = getTranslation(monthNames[now.getMonth()], 'months');
        clockDate.textContent = `${dayOfWeek}, ${now.getDate()} de ${month} de ${now.getFullYear()}`;
    }
}

function updateEverythingWidgets() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        if (typeof translateElementTree === 'function') {
            const mainContainer = document.querySelector('.everything-grid-container');
            if (mainContainer) {
                translateElementTree(mainContainer);
            }
        }
        updateCurrentDate();
        updateActionCounts();
        updateTimeout = null;
    }, 50);
}

export { initializeEverything, updateEverythingWidgets };