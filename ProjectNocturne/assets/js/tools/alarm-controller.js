(function() {
    "use strict";

    let clockInterval = null;

    function updateLocalTime() {
        const alarmClockElement = document.querySelector('.tool-alarm span');

        if (alarmClockElement) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            alarmClockElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }

    function startClock() {
        if (clockInterval) {
            return;
        }
        updateLocalTime();
        clockInterval = setInterval(updateLocalTime, 1000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startClock);
    } else {
        startClock();
    }

})();