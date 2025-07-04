import { translateElementTree } from './translations-controller.js';
import { PREMIUM_FEATURES } from '../general/main.js'; // <-- IMPORTANTE: Añadir esta línea

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

export function initDynamicIsland() {
    if (dynamicIslandElement) return;

    dynamicIslandElement = document.createElement('div');
    dynamicIslandElement.id = 'dynamic-island';
    dynamicIslandElement.classList.remove('expanded', 'active-tool-ringing');

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

    console.log('✨ Dynamic Island initialized and added to DOM.');
}

export function showDynamicIslandNotification(toolType, actionType, messageKey, category, data = {}, onDismiss = null) {
    if (!dynamicIslandElement) initDynamicIsland();
    if (!dynamicIslandElement) return;

    if (notificationTimeout) clearTimeout(notificationTimeout);
    dynamicIslandElement.classList.remove('active-tool-ringing');

    const iconSymbol = dynamicIslandElement.querySelector('.notification-icon-symbol');
    const titleP = dynamicIslandElement.querySelector('.notification-title');
    const messageP = dynamicIslandElement.querySelector('.notification-message');
    const dismissButton = dynamicIslandElement.querySelector('.island-dismiss-button');

    if (!iconSymbol || !titleP || !messageP) return;

    let iconKey = toolType;
    if (toolType === 'system') {
        if (actionType.includes('error')) iconKey = 'system_error';
        else if (actionType.includes('premium') || actionType.includes('limit')) iconKey = 'system_premium';
        else if (actionType.includes('success') || actionType.includes('deleted')) iconKey = 'system_success';
        else iconKey = 'system_info';
    }
    iconSymbol.textContent = ICONS[iconKey] || ICONS.default;

    // --- INICIO DE LA LÓGICA CORREGIDA ---
    let titleKey;
    let finalMessageKey = messageKey; // Usamos la clave del mensaje que llega por defecto

    if (actionType === 'limit_reached') {
        titleKey = 'limit_reached_title'; // CORREGIDO: Usar la clave correcta para el título.
        // Elegimos la descripción correcta basándonos en si el usuario es premium
        finalMessageKey = PREMIUM_FEATURES ? 'limit_reached_message_premium' : 'premium_limit_reached_message';
    } else if (toolType === 'system') {
        // Mantenemos la lógica para otras notificaciones del sistema
        if (actionType === 'premium_required') {
             titleKey = 'premium_required_title';
        } else {
             titleKey = `${actionType}_title`;
        }
    } else {
        // Lógica para notificaciones que no son de límite (creado, borrado, sonando, etc.)
        titleKey = `${toolType}_${actionType}_title`;
    }
    // --- FIN DE LA LÓGICA CORREGIDA ---

    titleP.setAttribute('data-translate', titleKey);
    titleP.setAttribute('data-translate-category', 'notifications');

    messageP.setAttribute('data-translate', finalMessageKey); // Usamos la clave de mensaje final
    if (data && Object.keys(data).length > 0) {
        messageP.setAttribute('data-placeholders', JSON.stringify(data));
    } else {
        messageP.removeAttribute('data-placeholders');
    }

    if (typeof translateElementTree === 'function') {
        translateElementTree(dynamicIslandElement);
    } else {
        console.error("translateElementTree function is not available.");
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

    dynamicIslandElement.classList.add('expanded');
    console.log(`Dynamic Island Display: ${toolType} ${actionType} - TitleKey: ${titleKey}, MsgKey: ${finalMessageKey}`);
}

export function hideDynamicIsland() {
    if (!dynamicIslandElement) return;
    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = null;

    dynamicIslandElement.classList.remove('expanded', 'active-tool-ringing');
    dismissCallback = null;
    currentRingingToolId = null;
}

window.hideDynamicIsland = hideDynamicIsland;