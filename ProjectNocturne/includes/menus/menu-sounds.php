<div class="menu-component disabled body-title" data-menu="sounds">
    <div class="pill-container">
        <div class="drag-handle"></div>
    </div>
    <div class="menu-section">
        <div class="menu-section-top">
            <div class="menu-header-fixed">
                <button class="menu-back-btn" data-action="back-to-previous-menu">
                    <span class="material-symbols-rounded">arrow_left</span>
                </button>
                <div class="search-content">
                    <div class="search-content-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="search-content-text">
                        <input type="text" id="sound-search-input" class="body-title" autocomplete="off" data-translate="search_sounds_placeholder" data-translate-category="search" data-translate-target="placeholder">
                    </div>
                </div>
            </div>
        </div>
        <div class="menu-content-scrolleable">
            <div class="search-results-wrapper disabled"></div>
            <div class="creation-wrapper active">
                <div class="menu-section-center overflow-y">

                    <div id="sound-list-wrapper"></div>
                </div>
            </div>
        </div>
        <div class="menu-section-bottom">
            <div class="menu-button-group" style="flex-direction: row; gap: 8px; align-items: center;">
                <button class="menu-button menu-button--primary" style="flex-grow: 1;" data-action="select-audio">
                    <span data-translate="select_audio" data-translate-category="sounds">Seleccionar audio</span>
                </button>
                <button class="menu-action-button" data-action="upload-audio" data-translate="upload_audio" data-translate-category="sounds" data-translate-target="tooltip">
                    <span class="material-symbols-rounded">upload</span>
                </button>
            </div>
        </div>
    </div>
</div>