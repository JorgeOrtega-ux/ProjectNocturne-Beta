<div class="menu-component disabled body-title" data-menu="createSection">
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
                        <span class="material-symbols-rounded">add</span>
                    </div>
                    <div class="search-content-text">
                        <span data-translate="create_new_section" data-translate-category="general">Create New Section</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="menu-content-scrolleable">
            <div class="creation-wrapper active">
                <div class="menu-section-center overflow-y">
                    <div class="menu-content">
                        <div class="menu-content-header">
                            <div class="menu-content-header-primary">
                                <span class="material-symbols-rounded">title</span>
                                <span data-translate="section_name" data-translate-category="general">Section Name</span>
                            </div>
                        </div>
                        <div class="menu-content-general">
                            <div class="enter-text-tool">
                                <input type="text" id="section-name-input" data-translate="section_name_placeholder" data-translate-category="general" data-translate-target="placeholder">
                            </div>
                        </div>
                    </div>
                    <div class="menu-content" data-menu-part="available-sections">
                        <div class="menu-content-header">
                            <div class="menu-content-header-primary">
                                <span class="material-symbols-rounded">folder_open</span>
                                <span data-translate="sections_available" data-translate-category="general"></span>
                            </div>
                        </div>
                        <div class="menu-content-general">
                            <div class="sections-list-container menu-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="menu-section-bottom">
            <button class="menu-button menu-button--primary" data-action="create-section">
                <span data-translate="create_section_button" data-translate-category="general">Create Section</span>
            </button>
        </div>
    </div>
</div>