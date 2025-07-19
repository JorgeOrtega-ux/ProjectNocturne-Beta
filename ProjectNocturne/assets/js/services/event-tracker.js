const USER_UUID_KEY_TRACKER = 'user-unique-id';

// 1. Cola para almacenar eventos de analítica
let eventsQueue = [];

// Función para obtener el UUID del usuario
function getUUID() {
    return localStorage.getItem(USER_UUID_KEY_TRACKER);
}

// 2. Modificación de la función trackEvent para encolar eventos
function trackEvent(eventType, eventDetails = '') {
    const uuid = getUUID();
    if (!uuid) {
        return;
    }
    // Añade el evento a la cola con una marca de tiempo
    eventsQueue.push({
        uuid,
        eventType,
        eventDetails,
        timestamp: new Date().toISOString()
    });
}

// 3. Implementación de una función para enviar los datos en lote
function sendBatchedEvents() {
    if (eventsQueue.length === 0) {
        return;
    }

    const eventsToSend = [...eventsQueue];
    eventsQueue = []; // Limpia la cola inmediatamente

    const payload = JSON.stringify(eventsToSend);

    // Usa sendBeacon para una transmisión de datos fiable al salir de la página
    if (navigator.sendBeacon) {
        navigator.sendBeacon('api/batch-track-event.php', payload);
    } else {
        // Fallback para navegadores antiguos
        fetch('api/batch-track-event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: payload,
            keepalive: true // Importante para que fetch funcione durante la descarga de la página
        }).catch(error => {
            // Si el envío falla, vuelve a encolar los eventos.
            // Este es un mecanismo de reintento simple.
            eventsQueue.unshift(...eventsToSend);
        });
    }
}

// 4. Añadir escuchas de eventos para pagehide y visibilitychange
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        sendBatchedEvents();
    }
});

// Usa 'pagehide' como un evento más robusto para móviles y escritorio
window.addEventListener('pagehide', sendBatchedEvents, false);

// 5. Opcionalmente, añadir un mecanismo de envío periódico como fallback
const BATCH_INTERVAL = 30000; // Enviar eventos cada 30 segundos
setInterval(sendBatchedEvents, BATCH_INTERVAL);

export {
    trackEvent
};