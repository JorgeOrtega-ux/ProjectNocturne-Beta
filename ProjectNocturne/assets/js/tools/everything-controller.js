import { getTranslation, translateElementTree } from '../general/translations-controller.js';
import { use24HourFormat, toggleModule } from '../general/main.js';

const WIDGET_DEFINITIONS = {
    'clock-widget': {
        className: 'widget-clock',
        generateContent: () => `
            <div class="clock-content">
                <div class="clock-time" id="main-clock-time-long">--:--:--</div>
                <div class="clock-date" id="main-clock-date"></div>
            </div>`
    },
    'actions-widget': {
        className: 'widget-actions',
        generateContent: () => `
            <div class="expandable-card-header" data-action="toggle-actions-widget">
                <div class="expandable-card-header-left">
                    <div class="expandable-card-header-icon">
                        <span class="material-symbols-rounded">bolt</span>
                    </div>
                    <h3 data-translate="quick_actions" data-translate-category="everything"></h3>
                </div>
                <div class="expandable-card-header-right">
                    <button class="expandable-card-toggle-btn expanded">
                        <span class="material-symbols-rounded expand-icon">expand_more</span>
                    </button>
                </div>
            </div>
            <div class="tool-grid active">
                <div class="action-item" data-module="toggleMenuAlarm">
                    <div class="action-item-content">
                        <div class="action-item-main-content">
                            <div class="action-item-icon-wrapper-square">
                                <span class="material-symbols-rounded action-item-icon">add_alarm</span>
                            </div>
                            <div class="action-item-text-wrapper">
                                <span class="action-item-title" data-translate="new_alarm" data-translate-category="everything"></span>
                                <span class="action-item-description" data-translate="new_alarm_desc" data-translate-category="everything"></span>
                            </div>
                        </div>
                        <span class="action-item-count" id="alarms-count-details"></span>
                    </div>
                </div>
                <div class="action-item" data-module="toggleMenuTimer">
                    <div class="action-item-content">
                        <div class="action-item-main-content">
                            <div class="action-item-icon-wrapper-square">
                                <span class="material-symbols-rounded action-item-icon">add_circle</span>
                            </div>
                            <div class="action-item-text-wrapper">
                                <span class="action-item-title" data-translate="new_timer" data-translate-category="everything"></span>
                                <span class="action-item-description" data-translate="new_timer_desc" data-translate-category="everything"></span>
                            </div>
                        </div>
                        <span class="action-item-count" id="timers-count-details"></span>
                    </div>
                </div>
                <div class="action-item" data-module="toggleMenuWorldClock">
                    <div class="action-item-content">
                        <div class="action-item-main-content">
                            <div class="action-item-icon-wrapper-square">
                                <span class="material-symbols-rounded action-item-icon">public</span>
                            </div>
                            <div class="action-item-text-wrapper">
                                <span class="action-item-title" data-translate="add_clock" data-translate-category="everything"></span>
                                <span class="action-item-description" data-translate="add_clock_desc" data-translate-category="everything"></span>
                            </div>
                        </div>
                        <span class="action-item-count" id="clocks-count-details"></span>
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
    const actionItems = document.querySelectorAll('.action-item[data-module]');
    actionItems.forEach(item => {
        const moduleName = item.dataset.module;
        if (moduleName) {
            item.addEventListener('click', () => toggleModule(moduleName));
        }
    });

    const actionsHeader = document.querySelector('[data-action="toggle-actions-widget"]');
    if (actionsHeader) {
        actionsHeader.addEventListener('click', () => {
            const widget = actionsHeader.closest('.widget');
            if (!widget) return;
            const grid = widget.querySelector('.tool-grid');
            const btn = widget.querySelector('.expandable-card-toggle-btn');
            if (grid && btn) {
                const isActive = grid.classList.toggle('active');
                btn.classList.toggle('expanded', isActive);
            }
        });
    }
}

function renderAllWidgets() {
    const mainContainer = document.querySelector('.everything-grid-container');
    if (!mainContainer) return;
    mainContainer.innerHTML = '';
    const clockWidget = createWidgetElement('clock-widget');
    if (clockWidget) mainContainer.appendChild(clockWidget);
    const actionsRow = document.createElement('div');
    actionsRow.className = 'widgets-row';
    const actionsWidget = createWidgetElement('actions-widget');
    if (actionsWidget) actionsRow.appendChild(actionsWidget);
    mainContainer.appendChild(actionsRow);
    if (typeof translateElementTree === 'function') {
        translateElementTree(mainContainer);
    }
    rebindEventListeners();
}

function updateActionCounts() {
    const alarmsCountEl = document.getElementById('alarms-count-details');
    if (alarmsCountEl && window.alarmManager) {
        const count = window.alarmManager.getAlarmCount();
        const limit = window.alarmManager.getAlarmLimit();
        if (count >= limit) {
            alarmsCountEl.textContent = getTranslation('limit_reached', 'everything');
        } else {
            const translation = getTranslation('limit_available', 'everything');
            alarmsCountEl.textContent = translation
                .replace('{available}', limit - count)
                .replace('{limit}', limit);
        }
    }

    const timersCountEl = document.getElementById('timers-count-details');
    if (timersCountEl && window.timerManager) {
        const count = window.timerManager.getTimersCount();
        const limit = window.timerManager.getTimerLimit();
        if (count >= limit) {
            timersCountEl.textContent = getTranslation('limit_reached', 'everything');
        } else {
            const translation = getTranslation('limit_available', 'everything');
            timersCountEl.textContent = translation
                .replace('{available}', limit - count)
                .replace('{limit}', limit);
        }
    }

    const clocksCountEl = document.getElementById('clocks-count-details');
    if (clocksCountEl && window.worldClockManager) {
        const count = window.worldClockManager.getClockCount();
        const limit = window.worldClockManager.getClockLimit();
        if (count >= limit) {
            clocksCountEl.textContent = getTranslation('limit_reached', 'everything');
        } else {
            const translation = getTranslation('limit_available', 'everything');
            clocksCountEl.textContent = translation
                .replace('{available}', limit - count)
                .replace('{limit}', limit);
        }
    }
}

export function initializeEverything() {
    if (smartUpdateInterval) clearInterval(smartUpdateInterval);
    renderAllWidgets();
    updateCurrentDate();
    updateActionCounts();
    smartUpdateInterval = setInterval(updateCurrentDate, 1000);
    console.log('✅ Controlador "Everything" con nuevo diseño de acciones inicializado.');
    // CORRECCIÓN: Llamar a updateEverythingWidgets para una actualización completa
    document.addEventListener('translationsApplied', updateEverythingWidgets);
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

export function updateEverythingWidgets() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        console.log('🔄 Actualizando widgets de "Everything" (On-Demand)...');
        // Se añade la función para volver a traducir los elementos estáticos
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