import { getTranslation } from '../core/translations-controller.js';
import { showSimpleNotification } from '../ui/notification-controller.js';
import { updateEverythingWidgets } from '../features/everything-controller.js';
import { trackEvent } from '../services/event-tracker.js';

const stopwatchState = {
    isRunning: false,
    startTime: 0,
    elapsedTime: 0,
    lapNumber: 0,
    laps: [],
    animationFrameId: null, // Reemplaza a timerInterval
    format: 'ms',
};

let displayElement, startBtn, stopBtn, lapBtn, resetBtn, lapsTableBody, sectionBottom, changeFormatBtn, exportLapsBtn;

function getLapLimit() {
    return 1000;
}

function dispatchStopwatchStateChange() {
    document.dispatchEvent(new CustomEvent('stopwatchStateChanged'));
}

function saveState() {
    const stateToSave = {
        isRunning: stopwatchState.isRunning,
        startTime: stopwatchState.startTime,
        elapsedTime: stopwatchState.elapsedTime,
        laps: stopwatchState.laps,
        lapNumber: stopwatchState.lapNumber,
        format: stopwatchState.format,
    };
    localStorage.setItem('stopwatchState', JSON.stringify(stateToSave));
}

function loadState() {
   const savedState = localStorage.getItem('stopwatchState');
    if (!savedState) {
        updateButtonStates();
        return;
    }

    const parsedState = JSON.parse(savedState);
    stopwatchState.laps = parsedState.laps || [];
    stopwatchState.lapNumber = parsedState.lapNumber || 0;
    stopwatchState.startTime = parsedState.startTime || 0;
    stopwatchState.elapsedTime = parsedState.elapsedTime || 0;
    stopwatchState.isRunning = parsedState.isRunning || false;
    stopwatchState.format = parsedState.format || 'ms';

    if (stopwatchState.isRunning) {
        stopwatchState.elapsedTime = Date.now() - stopwatchState.startTime;
        startStopwatch(true);
    } else {
        // Asegura que el display inicial esté correcto incluso si no está corriendo
        const currentTime = stopwatchState.elapsedTime;
        if (displayElement) {
            displayElement.innerHTML = formatTime(currentTime);
        }
    }

    if (stopwatchState.laps.length > 0) {
        lapsTableBody.innerHTML = '';
        stopwatchState.laps.forEach(renderLap);
        sectionBottom.classList.remove('disabled');
    }

    updateButtonStates();
}

function formatTime(milliseconds, forTitle = false) {
    const totalMs = Math.floor(milliseconds);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    let timeString = '';
    let fractionalString = '';

    if (hours > 0) {
        timeString += `${hours.toString().padStart(2, '0')}:`;
    }
    
    timeString += `${minutes.toString().padStart(2, '0')}:`;
    timeString += `${seconds.toString().padStart(2, '0')}`;

    switch (stopwatchState.format) {
        case 's': break;
        case 'ds': fractionalString = `.${Math.floor(ms / 100).toString()}`; break;
        case 'ms': fractionalString = `.${Math.floor(ms / 10).toString().padStart(2, '0')}`; break;
        case 'sss': fractionalString = `.${ms.toString().padStart(3, '0')}`; break;
        default: fractionalString = `.${Math.floor(ms / 10).toString().padStart(2, '0')}`; break;
    }

    if (forTitle) return timeString;
    return fractionalString ? `${timeString}<span class="fractional-seconds">${fractionalString}</span>` : timeString;
}

function updateDisplay() {
    const currentTime = stopwatchState.isRunning ? (Date.now() - stopwatchState.startTime) : stopwatchState.elapsedTime;
    
    if (displayElement) {
        displayElement.innerHTML = formatTime(currentTime);
    }

    if (stopwatchState.isRunning) {
        stopwatchState.animationFrameId = requestAnimationFrame(updateDisplay);
    }
}

function startStopwatch(isReload = false) {
    if (stopwatchState.isRunning && !isReload) return;
    if (!isReload) trackEvent('interaction', 'start_stopwatch');

    stopwatchState.isRunning = true;
    if (!isReload) {
        stopwatchState.startTime = Date.now() - stopwatchState.elapsedTime;
    }
    
    if (stopwatchState.animationFrameId) cancelAnimationFrame(stopwatchState.animationFrameId);
    stopwatchState.animationFrameId = requestAnimationFrame(updateDisplay);

    updateButtonStates();
    saveState();
    if (!isReload) updateEverythingWidgets();
    dispatchStopwatchStateChange();
}

function stopStopwatch() {
    if (!stopwatchState.isRunning) return;
    trackEvent('interaction', 'stop_stopwatch');

    stopwatchState.isRunning = false;
    if (stopwatchState.animationFrameId) {
        cancelAnimationFrame(stopwatchState.animationFrameId);
        stopwatchState.animationFrameId = null;
    }
    
    stopwatchState.elapsedTime = Date.now() - stopwatchState.startTime;
    updateDisplay(); // Actualiza una última vez para mostrar el tiempo detenido
    updateButtonStates();
    saveState();
    updateEverythingWidgets();
    dispatchStopwatchStateChange();
}

function resetStopwatch() {
    trackEvent('interaction', 'reset_stopwatch');
    
    stopwatchState.isRunning = false;
    if (stopwatchState.animationFrameId) {
        cancelAnimationFrame(stopwatchState.animationFrameId);
        stopwatchState.animationFrameId = null;
    }

    stopwatchState.elapsedTime = 0;
    stopwatchState.startTime = 0;
    stopwatchState.lapNumber = 0;
    stopwatchState.laps = [];

    updateDisplay(); // Llama a updateDisplay para resetear la vista y el título
    lapsTableBody.innerHTML = '';
    sectionBottom.classList.add('disabled');
    updateButtonStates();
    saveState();
    updateEverythingWidgets();
    dispatchStopwatchStateChange();
}

function recordLap() {
    if (!stopwatchState.isRunning) return;
    trackEvent('interaction', 'record_lap');
    const lapLimit = getLapLimit();
    if (stopwatchState.lapNumber >= lapLimit) {
        showSimpleNotification(
            'error',
            'limit_reached_message_premium',
            'notifications',
            { type: getTranslation('stopwatch', 'tooltips') }
        );
        return;
    }
    const lapTime = Date.now() - stopwatchState.startTime;
    const previousLapTime = stopwatchState.laps.length > 0 ? stopwatchState.laps[stopwatchState.laps.length - 1].totalTime : 0;
    const lapDuration = lapTime - previousLapTime;
    stopwatchState.lapNumber++;
    const lapData = {
        lap: stopwatchState.lapNumber,
        time: lapDuration,
        totalTime: lapTime
    };
    stopwatchState.laps.push(lapData);
    renderLap(lapData);
    sectionBottom.classList.remove('disabled');
    saveState();
    updateButtonStates();
}

function renderLap(lapData) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${lapData.lap}</td>
        <td>${formatTime(lapData.time)}</td>
        <td>${formatTime(lapData.totalTime)}</td>
    `;
    lapsTableBody.prepend(row);
}

function updateButtonStates() {
    const hasTime = stopwatchState.elapsedTime > 0;
    const isLapDisabled = !stopwatchState.isRunning;

    startBtn.classList.toggle('disabled-interactive', stopwatchState.isRunning);
    stopBtn.classList.toggle('disabled-interactive', !stopwatchState.isRunning);
    lapBtn.classList.toggle('disabled-interactive', isLapDisabled);
    resetBtn.classList.toggle('disabled-interactive', stopwatchState.isRunning || !hasTime);
    exportLapsBtn.classList.toggle('disabled-interactive', stopwatchState.laps.length === 0);
}

function getStopwatchDetails() {
    const state = stopwatchState;
    const time = formatTime(state.isRunning ? (Date.now() - state.startTime) : state.elapsedTime);
    const statusKey = state.isRunning ? 'running' : 'paused';
    const statusText = getTranslation(statusKey, 'stopwatch');
    if (state.elapsedTime === 0 && !state.isRunning) {
        return getTranslation('paused', 'stopwatch') + ' en 00.00';
    }
    return `${statusText} en ${time}`;
}

function isStopwatchRunning() {
    return stopwatchState.isRunning;
}

function changeFormat() {
    const formats = ['ds', 'ms', 'sss', 's'];
    const currentIndex = formats.indexOf(stopwatchState.format);
    stopwatchState.format = formats[(currentIndex + 1) % formats.length];
    
    updateDisplay();
    saveState();

    if (window.centralizedFontManager) {
        window.centralizedFontManager.adjustAndApplyFontSizeToSection('stopwatch');
    }
}

function exportLaps() {
    trackEvent('interaction', 'export_laps');
    const iconContainer = exportLapsBtn.querySelector('.material-symbols-rounded');
    const originalIconHTML = iconContainer.innerHTML;

    iconContainer.innerHTML = '<span class="material-symbols-rounded spinning">progress_activity</span>';
    exportLapsBtn.classList.add('disabled-interactive');

    const executeExport = () => {
        try {
            const wb = XLSX.utils.book_new();
            
            // --- LÍNEAS MODIFICADAS ---
            const sheetName = getTranslation("lap_header", "stopwatch"); // Usa la traducción de "Vuelta" o "Lap"
            const fileName = `${getTranslation("stopwatch", "tooltips")}_${getTranslation("lap_header", "stopwatch").toLowerCase()}.xlsx`; // Crea un nombre de archivo dinámico, ej: "Cronometro_vueltas.xlsx"
            // --- FIN DE LÍNEAS MODIFICADAS ---

            const ws_data = [
                [getTranslation("lap_header", "stopwatch"), getTranslation("time_header", "stopwatch"), getTranslation("total_time_header", "stopwatch")],
                ...stopwatchState.laps.map(lap => [lap.lap, formatTime(lap.time, true), formatTime(lap.totalTime, true)])
            ];
            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            // --- LÍNEAS MODIFICADAS ---
            XLSX.utils.book_append_sheet(wb, ws, sheetName); // Usa el nombre de hoja traducido
            XLSX.writeFile(wb, fileName); // Usa el nombre de archivo traducido
            // --- FIN DE LÍNEAS MODIFICADAS ---

        } catch (error) {
            // --- LÍNEA MODIFICADA (BONUS) ---
            // También he corregido un mensaje de error que no estaba traducido
            showSimpleNotification('error', getTranslation('export_error', 'notifications'));
            // --- FIN DE LÍNEA MODIFICADA ---
        } finally {
            setTimeout(() => {
                iconContainer.innerHTML = originalIconHTML;
                exportLapsBtn.classList.remove('disabled-interactive');
                updateButtonStates();
            }, 1000);
        }
    };

    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            setTimeout(executeExport, 500);
        };
        script.onerror = () => {
            // --- LÍNEA MODIFICADA (BONUS) ---
            showSimpleNotification('error', getTranslation('export_library_error', 'notifications'));
            // --- FIN DE LÍNEA MODIFICADA ---
            iconContainer.innerHTML = originalIconHTML;
            exportLapsBtn.classList.remove('disabled-interactive');
            updateButtonStates();
        };
        document.head.appendChild(script);
    } else {
        setTimeout(executeExport, 500);
    }
}

function initializeStopwatch() {
    const stopwatchSection = document.querySelector('.section-stopwatch');
    if (!stopwatchSection) return;

    displayElement = stopwatchSection.querySelector('.tool-stopwatch span');
    startBtn = stopwatchSection.querySelector('[data-action="start"]');
    stopBtn = stopwatchSection.querySelector('[data-action="stop"]');
    lapBtn = stopwatchSection.querySelector('[data-action="lap"]');
    resetBtn = stopwatchSection.querySelector('[data-action="reset"]');
    lapsTableBody = stopwatchSection.querySelector('.laps-table tbody');
    sectionBottom = stopwatchSection.querySelector('.section-bottom');
    changeFormatBtn = stopwatchSection.querySelector('[data-action="change-format"]');
    exportLapsBtn = stopwatchSection.querySelector('[data-action="export-laps"]');

    startBtn.addEventListener('click', () => startStopwatch(false));
    stopBtn.addEventListener('click', stopStopwatch);
    lapBtn.addEventListener('click', recordLap);
    resetBtn.addEventListener('click', resetStopwatch);
    changeFormatBtn.addEventListener('click', changeFormat);
    exportLapsBtn.addEventListener('click', exportLaps);

    loadState();
}

window.stopwatchController = {
    getStopwatchDetails,
    isStopwatchRunning,
    getStopwatchState: () => stopwatchState,
    formatTime: formatTime
};

export { getLapLimit, initializeStopwatch };