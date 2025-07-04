<div class="menu-worldClock disabled body-title" data-menu="WorldClock">
    <div class="loading-overlay disabled">
        <div class="spinner"></div>
    </div>
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
                    <input type="text" id="worldclock-search-input" class="body-title" autocomplete="off" 
                           data-translate="search_clocks_placeholder" 
                           data-translate-category="search" 
                           data-translate-target="placeholder">
                </div>
            </div>
        </div>
        <div class="menu-content-scrolleable overflow-y">
            <div class="worldclock-search-results-wrapper disabled"></div>
            <div class="worldclock-creation-wrapper active">
                <div class="menu-section-center overflow-y">
                    <div class="menu-content-wrapper active">
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">label</span>
                                    <span data-translate="clock_title" data-translate-category="world_clock"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <div class="enter-text-tool">
                                    <input type="text" id="worldclock-title" data-translate="my_new_clock_placeholder" data-translate-category="world_clock" data-translate-target="placeholder">
                                </div>
                            </div>
                        </div>
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">public</span>
                                    <span data-translate="select_country" data-translate-category="world_clock"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <div class="custom-select-wrapper">
                                    <div class="custom-select-content" data-action="toggleCountryDropdown">
                                        <div class="custom-select-content-left">
                                            <span id="worldclock-selected-country" data-translate="select_a_country" data-translate-category="world_clock"></span>
                                        </div>
                                        <div class="custom-select-content-right">
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                    </div>
                                    <div class="dropdown-menu-container dropdown-menu--structured menu-worldclock-country disabled body-title" data-menu="worldClockCountryMenu">
                                        <div class="dropdown-menu-top">
                                            <div class="search-content">
                                                <div class="search-content-icon">
                                                    <span class="material-symbols-rounded">search</span>
                                                </div>
                                                <div class="search-content-text">
                                                    <input type="text" id="country-search-input" class="body-title" autocomplete="off" 
                                                           data-translate="search_cities_placeholder" 
                                                           data-translate-category="search" 
                                                           data-translate-target="placeholder">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="dropdown-menu-bottom overflow-y">
                                            <div class="menu-list"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span data-translate="select_timezone" data-translate-category="world_clock"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <div class="custom-select-wrapper">
                                    <div class="custom-select-content" data-action="toggleTimezoneDropdown">
                                        <div class="custom-select-content-left">
                                            <span id="worldclock-selected-timezone" data-translate="select_a_timezone" data-translate-category="world_clock"></span>
                                        </div>
                                        <div class="custom-select-content-right">
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                    </div>
                                    <div class="dropdown-menu-container menu-worldclock-timezone disabled body-title" data-menu="worldClockTimezoneMenu">
                                        <div class="menu-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="menu-section-bottom">
                    <div class="create-tool" data-action="addWorldClock">
                        <span data-translate="add_clock" data-translate-category="tooltips"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>