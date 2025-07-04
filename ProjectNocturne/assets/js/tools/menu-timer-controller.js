document.addEventListener('DOMContentLoaded', () => {
    const timerMenu = document.querySelector('.menu-timer[data-menu="Timer"]');
    if (!timerMenu) return;

    const state = {
        currentTab: 'countdown',
        duration: {
            hours: 0,
            minutes: 5,
            seconds: 0
        },
        countTo: {
            date: new Date(),
            selectedDate: null,
            selectedHour: null,
            selectedMinute: null,
        }
    };

    const elements = {
        tabs: timerMenu.querySelectorAll('.menu-tab[data-tab]'),
        tabContents: timerMenu.querySelectorAll('.menu-content-wrapper[data-tab-content]'),
        hourDisplay: timerMenu.querySelector('#timer-hour-display'),
        minuteDisplay: timerMenu.querySelector('#timer-minute-display'),
        secondDisplay: timerMenu.querySelector('#timer-second-display'),
        endActionDisplay: timerMenu.querySelector('#timer-selected-end-action'),
        endActionMenu: timerMenu.querySelector('.menu-timer-end-action'),
        soundDisplay: timerMenu.querySelector('#timer-selected-sound'),
        soundMenu: timerMenu.querySelector('.menu-timer-sound'),
        calendarContainer: timerMenu.querySelector('.calendar-container'),
        monthYearDisplay: timerMenu.querySelector('#calendar-month-year'),
        daysContainer: timerMenu.querySelector('.calendar-days'),
        selectedDateDisplay: timerMenu.querySelector('#selected-date-display'),
        selectedHourDisplay: timerMenu.querySelector('#selected-hour-display'),
        selectedMinuteDisplay: timerMenu.querySelector('#selected-minute-display'),
        hourMenu: timerMenu.querySelector('.menu-timer-hour'),
    };

    // ===============================================
    // LÓGICA DE PESTAÑAS (CORREGIDA)
    // ===============================================
    function updateTabView() {
        elements.tabs.forEach(t => t.classList.remove('active'));
        elements.tabContents.forEach(c => {
            c.classList.remove('active');
            c.classList.add('disabled');
        });

        const activeTab = timerMenu.querySelector(`.menu-tab[data-tab="${state.currentTab}"]`);
        const activeContent = timerMenu.querySelector(`.menu-content-wrapper[data-tab-content="${state.currentTab}"]`);

        if (activeTab) {
            activeTab.classList.add('active');
        }
        if (activeContent) {
            activeContent.classList.remove('disabled');
            activeContent.classList.add('active');
        }
    }

    // ===============================================
    // LÓGICA DE SELECTORES DE DURACIÓN
    // ===============================================
    function updateDurationDisplay() {
        if (elements.hourDisplay) elements.hourDisplay.textContent = `${state.duration.hours} h`;
        if (elements.minuteDisplay) elements.minuteDisplay.textContent = `${state.duration.minutes} min`;
        if (elements.secondDisplay) elements.secondDisplay.textContent = `${state.duration.seconds} s`;
    }

    // ===============================================
    // LÓGICA DEL CALENDARIO
    // ===============================================
    function renderCalendar() {
        if (!elements.monthYearDisplay || !elements.daysContainer) return;

        const date = state.countTo.date;
        elements.monthYearDisplay.textContent = date.toLocaleDateString(navigator.language, { month: 'long', year: 'numeric' });
        
        elements.daysContainer.innerHTML = '';
        const firstDayIndex = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            elements.daysContainer.innerHTML += `<div class="day other-month"></div>`;
        }

        for (let i = 1; i <= lastDate; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            dayEl.textContent = i;
            
            const today = new Date();
            if (i === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                dayEl.classList.add('today');
            }
            if (state.countTo.selectedDate && i === state.countTo.selectedDate.getDate() && date.getMonth() === state.countTo.selectedDate.getMonth()) {
                dayEl.classList.add('selected');
            }
            
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                selectDate(i);
            });

            elements.daysContainer.appendChild(dayEl);
        }
    }
    
    function selectDate(day) {
        state.countTo.selectedDate = new Date(state.countTo.date.getFullYear(), state.countTo.date.getMonth(), day);
        elements.selectedDateDisplay.textContent = state.countTo.selectedDate.toLocaleDateString();
        elements.calendarContainer.classList.add('disabled');
        renderCalendar();
    }

    // ===============================================
    // LÓGICA DEL SELECTOR DE HORA (NUEVO DISEÑO DE DROPDOWN)
    // ===============================================
    function populateHourMenu() {
        if (!elements.hourMenu) return;
        const menuList = elements.hourMenu.querySelector('.menu-list');
        if(!menuList) return;

        menuList.innerHTML = '';
        for (let i = 0; i < 24; i++) {
            const hour = String(i).padStart(2, '0');
            for (let j = 0; j < 60; j += 15) {
                const minute = String(j).padStart(2, '0');
                const timeString = `${hour}:${minute}`;
                const link = document.createElement('div');
                link.className = 'menu-link';
                link.setAttribute('data-action', 'selectTimerTime');
                link.setAttribute('data-hour', i);
                link.setAttribute('data-minute', j);
                link.innerHTML = `<div class="menu-link-text"><span>${timeString}</span></div>`;
                menuList.appendChild(link);
            }
        }
    }

    // ===============================================
    // LISTENER PRINCIPAL DE EVENTOS
    // ===============================================
    timerMenu.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');
        const tabTarget = e.target.closest('.menu-tab[data-tab]');

        if (tabTarget) {
            state.currentTab = tabTarget.dataset.tab;
            updateTabView();
            return;
        }

        if (!actionTarget) return;
        const action = actionTarget.dataset.action;

        switch (action) {
            case 'increaseTimerHour':   state.duration.hours = (state.duration.hours + 1) % 100; break;
            case 'decreaseTimerHour':   state.duration.hours = (state.duration.hours - 1 + 100) % 100; break;
            case 'increaseTimerMinute': state.duration.minutes = (state.duration.minutes + 1) % 60; break;
            case 'decreaseTimerMinute': state.duration.minutes = (state.duration.minutes - 1 + 60) % 60; break;
            case 'increaseTimerSecond': state.duration.seconds = (state.duration.seconds + 1) % 60; break;
            case 'decreaseTimerSecond': state.duration.seconds = (state.duration.seconds - 1 + 60) % 60; break;
            
            case 'toggleTimerEndActionMenu': elements.endActionMenu.classList.toggle('disabled'); break;
            case 'toggleTimerSoundMenu': elements.soundMenu.classList.toggle('disabled'); break;
            case 'toggleCalendar': elements.calendarContainer.classList.toggle('disabled'); break;
            case 'toggleTimerHourMenu': elements.hourMenu.classList.toggle('disabled'); break;
            
            case 'prev-month': state.countTo.date.setMonth(state.countTo.date.getMonth() - 1); renderCalendar(); break;
            case 'next-month': state.countTo.date.setMonth(state.countTo.date.getMonth() + 1); renderCalendar(); break;
            
            case 'selectTimerEndAction':
                elements.endActionDisplay.textContent = actionTarget.querySelector('.menu-link-text span').textContent;
                elements.endActionMenu.classList.add('disabled');
                break;
            case 'selectTimerSound':
                elements.soundDisplay.textContent = actionTarget.querySelector('.menu-link-text span').textContent;
                elements.soundMenu.classList.add('disabled');
                break;
            case 'selectTimerTime':
                state.countTo.selectedHour = actionTarget.dataset.hour;
                state.countTo.selectedMinute = actionTarget.dataset.minute;
                elements.selectedHourDisplay.textContent = String(state.countTo.selectedHour).padStart(2, '0');
                elements.selectedMinuteDisplay.textContent = String(state.countTo.selectedMinute).padStart(2, '0');
                elements.hourMenu.classList.add('disabled');
                break;
        }
        
        if (action.startsWith('increaseTimer') || action.startsWith('decreaseTimer')) {
            updateDurationDisplay();
        }
    });

    // ===============================================
    // INICIALIZACIÓN Y OBSERVER
    // ===============================================
    let isInitialized = false;
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.attributeName === 'class') {
                const isNowVisible = !timerMenu.classList.contains('disabled');
                
                if (isNowVisible && !isInitialized) {
                    updateDurationDisplay();
                    renderCalendar();
                    populateHourMenu();
                    isInitialized = true;
                } else if (!isNowVisible) {
                    isInitialized = false;
                }
            }
        }
    });
    observer.observe(timerMenu, { attributes: true });
});