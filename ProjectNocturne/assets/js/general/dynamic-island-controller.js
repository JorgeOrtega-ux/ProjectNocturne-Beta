import { translateElementTree } from './translations-controller.js';
import { PREMIUM_FEATURES } from '../general/main.js';

let dynamicIslandElement = null;
let notificationTimeout = null;
let dismissCallback = null;
let currentRingingToolId = null;

const NOTIFICATION_DISPLAY_DURATION = 5000;

const ICONS = {
    'alarm': 'alarm',
    'timer': 'timer',
    'worldClock': 'schedule',
    'system_info': 'info',
    'system_error': 'error',
    'system_premium': 'workspace_premium',
    'system_success': 'check_circle',
    'default': 'info'
};

function createDynamicIslandDOM() {
    if (document.querySelector('.dynamic-island')) return;

    dynamicIslandElement = document.createElement('div');
    dynamicIslandElement.className = 'dynamic-island';

    dynamicIslandElement.innerHTML = `
        <div class="island-notification-content">
            <div class="island-left-group">
                <div class="island-circle">
                    <span class="material-symbols-rounded notification-icon-symbol"></span>
                </div>
                <div class="notification-text-info">
                    <p class="notification-title" data-translate="" data-translate-category="notifications"></p>
                    <p class="notification-message" data-translate="" data-translate-category="notifications"></p>
                </div>
            </div>
            <button class="island-dismiss-button" data-action="dismiss-active-tool" data-translate="dismiss" data-translate-category="notifications">
            </button>
        </div>
    `;

    document.body.appendChild(dynamicIslandElement);

    const dismissButton = dynamicIslandElement.querySelector('.island-dismiss-button');
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            if (dismissCallback && typeof dismissCallback === 'function') {
                dismissCallback(currentRingingToolId);
            }
            hideDynamicIsland();
        });
    }
    console.log('✨ Dynamic Island created and added to DOM.');
}

function destroyDynamicIslandDOM() {
    if (dynamicIslandElement) {
        dynamicIslandElement.remove();
        dynamicIslandElement = null;
        console.log('🏝️ Dynamic Island removed from DOM.');
    }
}

export function showDynamicIslandNotification(toolType, actionType, messageKey, category, data = {}, onDismiss = null) {
    if (!dynamicIslandElement) {
        createDynamicIslandDOM();
    }
    if (!dynamicIslandElement) return;

    if (notificationTimeout) clearTimeout(notificationTimeout);
    dynamicIslandElement.classList.remove('active-tool-ringing');

    const iconSymbol = dynamicIslandElement.querySelector('.notification-icon-symbol');
    const titleP = dynamicIslandElement.querySelector('.notification-title');
    const messageP = dynamicIslandElement.querySelector('.notification-message');

    if (!iconSymbol || !titleP || !messageP) return;

    let iconKey = toolType;
    if (toolType === 'system') {
        if (actionType.includes('error')) iconKey = 'system_error';
        else if (actionType.includes('premium') || actionType.includes('limit')) iconKey = 'system_premium';
        else if (actionType.includes('success') || actionType.includes('deleted')) iconKey = 'system_success';
        else iconKey = 'system_info';
    }
    iconSymbol.textContent = ICONS[iconKey] || ICONS.default;

    let titleKey;
    let finalMessageKey = messageKey;

    if (actionType === 'limit_reached') {
        titleKey = 'limit_reached_title';
        finalMessageKey = PREMIUM_FEATURES ? 'limit_reached_message_premium' : 'premium_limit_reached_message';
    } else if (toolType === 'system') {
        if (actionType === 'premium_required') {
             titleKey = 'premium_required_title';
        } else {
             titleKey = `${actionType}_title`;
        }
    } else {
        titleKey = `${toolType}_${actionType}_title`;
    }

    titleP.setAttribute('data-translate', titleKey);
    titleP.setAttribute('data-translate-category', 'notifications');

    messageP.setAttribute('data-translate', finalMessageKey);
    if (data && Object.keys(data).length > 0) {
        messageP.setAttribute('data-placeholders', JSON.stringify(data));
    } else {
        messageP.removeAttribute('data-placeholders');
    }

    if (typeof translateElementTree === 'function') {
        translateElementTree(dynamicIslandElement);
    }

    if (actionType === 'ringing') {
        dynamicIslandElement.classList.add('active-tool-ringing');
        dismissCallback = onDismiss;
        currentRingingToolId = data.toolId;
    } else {
        dismissCallback = null;
        currentRingingToolId = null;
        notificationTimeout = setTimeout(hideDynamicIsland, NOTIFICATION_DISPLAY_DURATION);
    }

    requestAnimationFrame(() => {
        // Usamos .active en lugar de .expanded
        dynamicIslandElement.classList.add('active');
    });

    console.log(`Dynamic Island Display: ${toolType} ${actionType} - TitleKey: ${titleKey}, MsgKey: ${finalMessageKey}`);
}

export function hideDynamicIsland() {
    if (!dynamicIslandElement) return;
    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = null;

    // Usamos .active en lugar de .expanded
    dynamicIslandElement.classList.remove('active', 'active-tool-ringing');
    dismissCallback = null;
    currentRingingToolId = null;

    setTimeout(destroyDynamicIslandDOM, 500);
}

export function initDynamicIsland() {
    // La inicialización ahora es bajo demanda.
}