import { getTranslation } from '../core/translations-controller.js';

let notificationElement = null;
let notificationTimeout = null;

const NOTIFICATION_DISPLAY_DURATION = 4000; // 4 segundos

/**
 * Crea la estructura DOM para la notificación si no existe.
 */
function createNotificationDOM() {
    if (document.querySelector('.simple-notification')) {
        notificationElement = document.querySelector('.simple-notification');
        return;
    };
    notificationElement = document.createElement('div');
    notificationElement.className = 'simple-notification';
    // Añade la estructura interna para el ícono y el texto
    notificationElement.innerHTML = `
        <div class="simple-notification-icon">
            <span class="material-symbols-rounded"></span>
        </div>
        <div class="simple-notification-text"></div>
    `;
    document.body.appendChild(notificationElement);
}

/**
 * Muestra una notificación simple con el ícono correcto.
 * @param {string} type - 'success' (azul) o 'error' (rojo).
 * @param {string} messageKey - La clave de traducción para el mensaje.
 * @param {string} category - La categoría de traducción.
 * @param {object} data - Datos para reemplazar en el placeholder del mensaje.
 */
function showSimpleNotification(type, messageKey, category, data = {}) {
    if (!notificationElement) {
        createNotificationDOM();
    }
    if (!notificationElement) return;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    // Obtener los elementos internos de la notificación
    const iconSpan = notificationElement.querySelector('.simple-notification-icon .material-symbols-rounded');
    const textElement = notificationElement.querySelector('.simple-notification-text');

    if (!iconSpan || !textElement) return;

    // --- LÓGICA DE ICONO AÑADIDA ---
    // Si el tipo es 'error', usa el ícono de error. Para cualquier otro caso ('success', 'info', etc.), usa el ícono de información.
    iconSpan.textContent = type === 'error' ? 'error' : 'info';
    // --- FIN DE LA LÓGICA AÑADIDA ---

    // Traducir el mensaje
    let message = getTranslation(messageKey, category) || messageKey;
    if (message === messageKey) { // Fallback por si la clave no existe
        message = message.replace(/_/g, ' ');
    }

    // Reemplazar placeholders
    if (data && Object.keys(data).length > 0) {
        for (const placeholder in data) {
            if (Object.prototype.hasOwnProperty.call(data, placeholder)) {
                message = message.replace(`{${placeholder}}`, data[placeholder]);
            }
        }
    }
    
    // Asignar el texto y la clase
    textElement.textContent = message;
    notificationElement.className = `simple-notification simple-notification-${type}`;

    // Mostrar la notificación
    requestAnimationFrame(() => {
        notificationElement.classList.add('active');
    });

    // Ocultar después de un tiempo
    notificationTimeout = setTimeout(() => {
        hideSimpleNotification();
    }, NOTIFICATION_DISPLAY_DURATION);
}

/**
 * Oculta la notificación simple.
 */
function hideSimpleNotification() {
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    if (notificationElement) {
        notificationElement.classList.remove('active');
        // Agregamos un event listener para remover el elemento una vez que la transición de opacidad termina.
        notificationElement.addEventListener('transitionend', () => {
            if (notificationElement) {
                notificationElement.remove();
                notificationElement = null;
            }
        }, { once: true });
    }
}

// Renombramos la exportación para mantener la consistencia en los archivos que la llaman
export { showSimpleNotification, hideSimpleNotification };