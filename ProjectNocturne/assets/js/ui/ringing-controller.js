// jorgeortega-ux/projectnocturne-alpha/ProjectNocturne-Alpha-26af6d6a92240876cabfeecbd77228e34952e560/ProjectNocturne/assets/js/ui/ringing-controller.js
import { getTranslation } from '../core/translations-controller.js';
import { playSound, stopSound, isSoundPlaying } from '../features/general-tools.js';
import { activateModule, deactivateModule, isModuleActive, showSpecificOverlay, toggleModule } from '../app/main.js';

let timeAgoIntervals = {};
let blinkingTitleInterval = null;

// Limpia todos los intervalos de tiempo transcurrido.
function clearAllRingingIntervals() {
    Object.values(timeAgoIntervals).forEach(clearInterval);
    timeAgoIntervals = {};
}

function formatDetailedTimeSince(timestamp) {
    const totalSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (totalSeconds < 0) return `0 ${getTranslation('seconds', 'timer')}`;

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${getTranslation('days', 'timer')}`);
    if (hours > 0) parts.push(`${hours} ${getTranslation('hours', 'timer')}`);
    if (minutes > 0) parts.push(`${minutes} ${getTranslation('minutes', 'timer')}`);
    if (seconds > 0) parts.push(`${seconds} ${getTranslation('seconds', 'timer')}`);

    if (parts.length > 2) {
        return parts.slice(0, 2).join(' ');
    } else if (parts.length > 0) {
        return parts.join(' ');
    } else {
        return `0 ${getTranslation('seconds', 'timer')}`;
    }
}


function initializeRingingController() {
    window.ringingState = window.ringingState || { tools: {} };

    document.addEventListener('moduleDeactivated', (e) => {
        if (e.detail.module === 'toggleNotificationsOverlay' || e.detail.module === 'overlayContainer') {
            updateRestoreButton();
            clearAllRingingIntervals();

            const latestTool = getLatestRingingTool();
            if (latestTool) {
                const ringingTools = Object.values(window.ringingState.tools || {});
                ringingTools.forEach(tool => {
                    if (tool.toolId !== latestTool.toolId) {
                        stopSound(tool.toolId);
                    }
                });

                if (!isSoundPlaying(latestTool.toolId)) {
                    playSound(latestTool.sound, latestTool.toolId);
                }
            } else {
                const ringingTools = Object.values(window.ringingState.tools || {});
                ringingTools.forEach(tool => stopSound(tool.toolId));
            }
        }
    });

    document.addEventListener('moduleActivated', (e) => {
        if (e.detail.module === 'toggleNotificationsOverlay') {
            const latestTool = getLatestRingingTool();
            if (latestTool) {
                showDetailView(latestTool.toolId);
            }
            updateRestoreButton();
        }
    });

    const headerContainer = document.querySelector('#notification-header-content');
    if (headerContainer) {
        headerContainer.addEventListener('click', (e) => {
            const listButton = e.target.closest('#show-ringing-list-btn');
            const backButton = e.target.closest('.menu-back-btn');

            if (listButton) {
                e.stopPropagation();
                showListView();
            } else if (backButton) {
                e.stopPropagation();
                const latestTool = getLatestRingingTool();
                if (latestTool) {
                    showDetailView(latestTool.toolId);
                }
            }
        });
    }
    const ringingRestoreBtn = document.getElementById('ringing-restore-btn-id');
    if (ringingRestoreBtn) {
        ringingRestoreBtn.addEventListener('click', () => {
            toggleModule('toggleNotificationsOverlay');
        });
    }
}

function updateRestoreButton() {
    const ringingToolsCount = Object.keys(window.ringingState.tools).length;
    const buttonElement = document.getElementById('ringing-restore-btn-id');

    if (buttonElement) {
        if (ringingToolsCount > 0) {
            buttonElement.classList.remove('disabled');
            buttonElement.classList.add('is-ringing'); // Añade la clase para la animación
        } else {
            buttonElement.classList.add('disabled');
            buttonElement.classList.remove('is-ringing'); // Remueve la clase para detener la animación
        }
    }
}


function getLatestRingingTool() {
    const ringingTools = Object.values(window.ringingState.tools || {});
    if (ringingTools.length === 0) return null;
    return ringingTools.sort((a, b) => b.rangAt - a.rangAt)[0];
}

function showRingingScreen(toolType, data, onDismiss, onSnooze, onRestart) {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    const toolId = data.toolId;
    clearAllRingingIntervals();

    Object.keys(window.ringingState.tools).forEach(id => {
        if (id !== toolId) stopSound(id);
    });

    if (!window.ringingState.tools[toolId]) {
        window.ringingState.tools[toolId] = { ...data, toolType, onDismiss, onSnooze, onRestart, rangAt: Date.now() };
    }

    activateModule('toggleNotificationsOverlay');
    
    const latestTool = getLatestRingingTool();
    if (latestTool) {
        showDetailView(latestTool.toolId);
    }
    playSound(data.sound, toolId);
    updateRestoreButton();
}

function showDetailView(toolId) {
    const menu = document.querySelector('.menu-component[data-menu="notifications"]');
    if (!menu) return;

    Object.keys(window.ringingState.tools).forEach(id => {
        if (id !== toolId) {
            stopSound(id);
        }
    });

    const toolData = window.ringingState.tools[toolId];
    if (toolData && toolData.sound && !isSoundPlaying(toolId)) {
        playSound(toolData.sound, toolId);
    }
    
    const listView = menu.querySelector('#ringing-list-view');
    const detailView = menu.querySelector('#ringing-detail-view');
    
    if (listView) {
        listView.classList.remove('active');
        listView.classList.add('disabled');
    }
    if (detailView) {
        detailView.classList.add('active');
        detailView.classList.remove('disabled');
    }

    menu.querySelector('.menu-section-bottom')?.classList.remove('disabled');
    menu.querySelector('#notification-actions-container')?.classList.remove('disabled');

    updateDetailHeader(toolId);
    updateRingingUIDetail(toolId);
}

function showListView() {
    const menu = document.querySelector('.menu-component[data-menu="notifications"]');
    if (!menu) return;

    const listView = menu.querySelector('#ringing-list-view');
    const detailView = menu.querySelector('#ringing-detail-view');

    if (detailView) {
        detailView.classList.remove('active');
        detailView.classList.add('disabled');
    }
    if (listView) {
        listView.classList.add('active');
        listView.classList.remove('disabled');
    }

    menu.querySelector('.menu-section-bottom')?.classList.add('disabled');
    menu.querySelector('#notification-actions-container')?.classList.add('disabled');

    updateRingingListHeader();
    updateRingingList();
}


function updateDetailHeader(toolId) {
    const toolData = window.ringingState.tools[toolId];
    if (!toolData) return;
    const headerContainer = document.querySelector('#notification-header-content');
    if (!headerContainer) return;

    const activeToolsCount = Object.keys(window.ringingState.tools).length;
    const listToggleHTML = activeToolsCount > 1 ? `
        <button id="show-ringing-list-btn" class="menu-button">
            ${getTranslation('ringing_notifications', 'general')} (${activeToolsCount})
        </button>` : '';

    headerContainer.innerHTML = `
        <div class="menu-header-fixed">
            ${listToggleHTML}
            <div class="search-content">
                <div class="search-content-icon"><span class="material-symbols-rounded" id="ringing-tool-icon">${toolData.toolType === 'alarm' ? 'alarm' : 'timer'}</span></div>
                <div class="search-content-text"><span id="ringing-tool-header">${getTranslation(toolData.toolType === 'alarm' ? 'alarm_ringing_title' : 'timer_ringing_title', 'notifications')}</span></div>
            </div>
        </div>`;
}

function updateRingingListHeader() {
    const headerContainer = document.querySelector('#notification-header-content');
    if (!headerContainer) return;

    headerContainer.innerHTML = `
        <div class="menu-header-fixed">
            <button class="menu-back-btn">
                <span class="material-symbols-rounded">arrow_left</span>
            </button>
            <div class="search-content">
                <div class="search-content-icon"><span class="material-symbols-rounded">list</span></div>
                <div class="search-content-text"><span>${getTranslation('ringing_notifications', 'general')}</span></div>
            </div>
        </div>`;
}

function updateRingingUIDetail(toolId) {
    const toolData = window.ringingState.tools[toolId];
    if (!toolData) return;
    const detailView = document.querySelector('#ringing-detail-view');
    if (!detailView) return;

    const titleLabel = detailView.querySelector('#ringing-tool-title-label');
    const titleInput = detailView.querySelector('#ringing-tool-title');
    const timeAgoInput = detailView.querySelector('#ringing-tool-time-ago');
    const actionsContainer = document.querySelector('#ringing-tool-actions');

    if (titleLabel) {
        const titleKey = toolData.toolType === 'alarm' ? 'alarm_title' : 'timer_title';
        const category = toolData.toolType === 'alarm' ? 'alarms' : 'timer';
        titleLabel.textContent = getTranslation(titleKey, category);
    }

    titleInput.value = toolData.title;

    clearAllRingingIntervals();

    const updateTime = () => {
        if (timeAgoInput) {
            timeAgoInput.value = formatDetailedTimeSince(toolData.rangAt);
        }
    };
    updateTime();
    timeAgoIntervals[toolId] = setInterval(updateTime, 1000);

    actionsContainer.innerHTML = '';
    const dismissBtn = createButton('dismiss', 'dismiss', 'general', toolId);
    const secondaryBtn = toolData.toolType === 'alarm'
        ? createButton('snooze', 'snooze', 'general', toolId)
        : createButton('restart', 'restart_timer', 'timer', toolId);

    actionsContainer.appendChild(secondaryBtn);
    actionsContainer.appendChild(dismissBtn);
}

function updateRingingList() {
    const listContainer = document.getElementById('ringing-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    const ringingTools = Object.values(window.ringingState.tools);

    if (ringingTools.length === 0) {
        deactivateModule('toggleNotificationsOverlay');
        return;
    }

    const alarms = ringingTools.filter(tool => tool.toolType === 'alarm').sort((a, b) => b.rangAt - a.rangAt);
    const timers = ringingTools.filter(tool => tool.toolType === 'timer').sort((a, b) => b.rangAt - a.rangAt);

    const createSection = (titleKey, category, tools) => {
        const menuContent = document.createElement('div');
        menuContent.className = 'menu-content';

        const menuHeader = document.createElement('div');
        menuHeader.className = 'menu-content-header';
        menuHeader.innerHTML = `<div class="menu-content-header-primary"><span>${getTranslation(titleKey, category)}</span></div>`;
        menuContent.appendChild(menuHeader);

        const menuGeneral = document.createElement('div');
        menuGeneral.className = 'menu-content-general';
        const menuList = document.createElement('div');
        menuList.className = 'menu-list';

        tools.forEach(tool => {
            const item = document.createElement('div');
            item.className = 'menu-link';
            item.dataset.toolId = tool.toolId;
            item.innerHTML = `
                <div class="menu-link-icon"><span class="material-symbols-rounded">${tool.toolType === 'alarm' ? 'alarm' : 'timer'}</span></div>
                <div class="menu-link-text"><span>${tool.title}</span></div>`;
            item.addEventListener('click', () => showDetailView(tool.toolId));
            menuList.appendChild(item);
        });

        menuGeneral.appendChild(menuList);
        menuContent.appendChild(menuGeneral);
        listContainer.appendChild(menuContent);
    };

    if (alarms.length > 0) {
        createSection('active_alarms', 'general', alarms);
    }

    if (timers.length > 0) {
        createSection('active_timers', 'general', timers);
    }
}

function createButton(action, translationKey, translationCategory, toolId) {
    const button = document.createElement('button');
    button.className = `menu-button ${action === 'dismiss' ? 'menu-button--primary' : ''}`;
    button.dataset.action = action;
    button.innerHTML = `<span>${getTranslation(translationKey, translationCategory)}</span>`;
    button.addEventListener('click', () => handleRingingAction(action, toolId));
    return button;
}

function handleRingingAction(action, toolId) {
    const toolData = window.ringingState.tools[toolId];
    if (!toolData) return;

    if (action === 'dismiss' && toolData.onDismiss) toolData.onDismiss(toolId);
    if (action === 'snooze' && toolData.onSnooze) toolData.onSnooze(toolId);
    if (action === 'restart' && toolData.onRestart) toolData.onRestart(toolId);

    hideRingingScreen(toolId);
}

function hideRingingScreen(toolId) {
    stopSound(toolId);
    if (timeAgoIntervals[toolId]) {
        clearInterval(timeAgoIntervals[toolId]);
        delete timeAgoIntervals[toolId];
    }
    if (window.ringingState.tools[toolId]) {
        delete window.ringingState.tools[toolId];
    }

    const remainingTools = Object.values(window.ringingState.tools);
    if (remainingTools.length > 0) {
        const latestTool = getLatestRingingTool();
        showDetailView(latestTool.toolId);
    } else {
        deactivateModule('overlayContainer');
    }

    updateRestoreButton();
}

window.isAnyToolRinging = () => Object.keys(window.ringingState.tools).length > 0;

export { showRingingScreen, hideRingingScreen, initializeRingingController };