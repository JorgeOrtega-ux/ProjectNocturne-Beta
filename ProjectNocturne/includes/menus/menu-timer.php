<div class="menu-timer disabled body-title" data-menu="Timer">
    <div class="pill-container">
        <div class="drag-handle"></div>
    </div>
    <div class="menu-section">
        <div class="menu-section-top">
            <div class="search-content">
                <div class="search-content-icon">
                    <span class="material-symbols-rounded">search</span>
                </div>
                <div class="search-content-text">
                    <input type="text" id="timer-search-input" class="body-title" autocomplete="off" data-translate="search_timers_placeholder" data-translate-category="search" data-translate-target="placeholder">
                </div>
            </div>
        </div>
        
        <div class="menu-content-scrolleable overflow-y">
            <div class="timer-search-results-wrapper disabled"></div>
            <div class="timer-creation-wrapper active">
                
                <!-- Selector de tipo de temporizador movido aquí -->
                <div class="menu-section-selector">
                    <div class="custom-select-wrapper">
                        <div class="custom-select-content" data-action="toggleTimerTypeDropdown">
                            <div class="custom-select-content-left">
                                <div class="custom-select-content-left-inner">
                                    <span class="material-symbols-rounded" id="timer-type-icon">timer</span>
                                    <span id="timer-type-display" data-translate="countdown" data-translate-category="timer"></span>
                                </div>
                            </div>
                            <div class="custom-select-content-right">
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                        </div>
                        <div class="dropdown-menu-container menu-timer-type disabled body-title" data-menu="timerTypeMenu">
                            <div class="menu-list">
                                <div class="menu-link active" data-tab="countdown">
                                    <div class="menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                    <div class="menu-link-text"><span data-translate="countdown" data-translate-category="timer"></span></div>
                                </div>
                                <div class="menu-link" data-tab="count_to_date">
                                     <div class="menu-link-icon"><span class="material-symbols-rounded">event</span></div>
                                    <div class="menu-link-text"><span data-translate="count_to_date" data-translate-category="timer"></span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="menu-section-center overflow-y">
                    <div class="menu-content-wrapper active" data-tab-content="countdown">
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">label</span><span data-translate="timer_title" data-translate-category="timer"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="enter-text-tool"><input type="text" id="timer-title" data-translate="my_new_timer_placeholder" data-translate-category="timer" data-translate-target="placeholder"></div>
                            </div>
                        </div>
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">timelapse</span><span data-translate="set_duration" data-translate-category="timer"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="enter-date-content">
                                    <div class="enter-date-tool">
                                        <div class="enter-date-tool-left" data-action="decreaseTimerHour"><span class="material-symbols-rounded">arrow_left</span></div>
                                        <div class="enter-date-tool-center" id="timer-hour-display">0 h</div>
                                        <div class="enter-date-tool-right" data-action="increaseTimerHour"><span class="material-symbols-rounded">arrow_right</span></div>
                                    </div>
                                    <div class="enter-date-tool">
                                        <div class="enter-date-tool-left" data-action="decreaseTimerMinute"><span class="material-symbols-rounded">arrow_left</span></div>
                                        <div class="enter-date-tool-center" id="timer-minute-display">5 min</div>
                                        <div class="enter-date-tool-right" data-action="increaseTimerMinute"><span class="material-symbols-rounded">arrow_right</span></div>
                                    </div>
                                    <div class="enter-date-tool">
                                        <div class="enter-date-tool-left" data-action="decreaseTimerSecond"><span class="material-symbols-rounded">arrow_left</span></div>
                                        <div class="enter-date-tool-center" id="timer-second-display">0 s</div>
                                        <div class="enter-date-tool-right" data-action="increaseTimerSecond"><span class="material-symbols-rounded">arrow_right</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">music_note</span><span data-translate="alarm_sound" data-translate-category="alarms"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="custom-select-wrapper">
                                    <div class="custom-select-content" data-action="toggleCountdownSoundDropdown">
                                        <div class="custom-select-content-left"><span id="countdown-selected-sound" data-translate="classic_beep" data-translate-category="sounds"></span></div>
                                        <div class="custom-select-content-right"><span class="material-symbols-rounded">expand_more</span></div>
                                    </div>
                                    <div class="dropdown-menu-container dropdown-menu--structured menu-countdown-sound disabled body-title" data-menu="countdownSoundMenu">
                                        <div class="dropdown-menu-top"></div>
                                        <div class="dropdown-menu-bottom overflow-y">
                                            <div class="menu-list"></div>
                                        </div>
                                    </div>
                                    <div class="menu-action-button" data-action="previewCountdownSound"><span class="material-symbols-rounded">play_arrow</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <div class="menu-content-wrapper disabled" data-tab-content="count_to_date">
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">label</span><span data-translate="timer_title" data-translate-category="timer"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="enter-text-tool"><input type="text" id="countto-title" data-translate="my_event_placeholder" data-translate-category="timer" data-translate-target="placeholder"></div>
                            </div>
                        </div>
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">calendar_month</span><span data-translate="select_date_time" data-translate-category="timer"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="date-time-content">
                                    <div class="date-time-selector">
                                        <div class="custom-select-content" data-action="toggleCalendarDropdown">
                                            <div class="custom-select-content-left"><span id="selected-date-display">-- / -- / ----</span></div>
                                            <div class="custom-select-content-right"><span class="material-symbols-rounded">calendar_today</span></div>
                                        </div>
                                        <div class="dropdown-menu-container calendar-container overflow-y disabled body-title" data-menu="calendar">
                                            <div class="calendar-header">
                                                <button class="calendar-nav" data-action="prev-month">
                                                    <span class="material-symbols-rounded">arrow_left</span>
                                                </button>
                                                <span id="calendar-month-year"></span>
                                                <button class="calendar-nav" data-action="next-month">
                                                    <span class="material-symbols-rounded">arrow_right</span>
                                                </button>
                                            </div>
                                            <div class="calendar-weekdays">
                                                <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
                                            </div>
                                            <div class="calendar-days"></div>
                                        </div>
                                    </div>
    
                                    <div class="date-time-selector">
                                        <div class="custom-select-content" data-action="toggleTimerHourDropdown">
                                            <div class="custom-select-content-left"><span id="selected-hour-display">--</span> : <span id="selected-minute-display">--</span></div>
                                            <div class="custom-select-content-right"><span class="material-symbols-rounded">schedule</span></div>
                                        </div>
    
                                        <div class="dropdown-menu-container menu-timer-hour-selection overflow-y disabled body-title" data-menu="timerHourMenu">
                                            <div class="menu-list menu-list-grid" data-list-type="hours"></div>
                                        </div>
    
                                        <div class="dropdown-menu-container menu-timer-minute-selection overflow-y disabled body-title" data-menu="timerMinuteMenu">
                                            <div class="menu-list menu-list-grid" data-list-type="minutes"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary"><span class="material-symbols-rounded">music_note</span><span data-translate="alarm_sound" data-translate-category="alarms"></span></div>
                            </div>
                            <div class="menu-content-general">
                                <div class="custom-select-wrapper">
                                    <div class="custom-select-content" data-action="toggleCountToDateSoundDropdown">
                                        <div class="custom-select-content-left"><span id="count-to-date-selected-sound" data-translate="classic_beep" data-translate-category="sounds"></span></div>
                                        <div class="custom-select-content-right"><span class="material-symbols-rounded">expand_more</span></div>
                                    </div>
                                    <div class="dropdown-menu-container dropdown-menu--structured menu-count-to-date-sound disabled body-title" data-menu="countToDateSoundMenu">
                                        <div class="dropdown-menu-top"></div>
                                        <div class="dropdown-menu-bottom overflow-y">
                                            <div class="menu-list"></div>
                                        </div>
                                    </div>
                                    <div class="menu-action-button" data-action="previewCountToDateSound"><span class="material-symbols-rounded">play_arrow</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                <div class="menu-section-bottom">
                    <div class="create-tool" data-action="createTimer">
                        <span data-translate="create_timer" data-translate-category="timer"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
