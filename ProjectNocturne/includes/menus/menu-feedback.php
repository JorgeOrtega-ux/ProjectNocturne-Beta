<div class="menu-component disabled body-title" data-menu="feedback">
    <div class="pill-container">
        <div class="drag-handle"></div>
    </div>
    <div class="menu-section">
        <div class="menu-section-top">
            <div class="menu-content-header">
                <div class="menu-content-header-primary">
                    <span class="material-symbols-rounded">feedback</span>
                    <span data-translate="feedback_title" data-translate-category="menu"></span>
                </div>
            </div>
        </div>
        <div class="menu-content-scrolleable">
            <form id="feedback-form" class="creation-wrapper">
                <div class="menu-section-center overflow-y">
                    <div class="menu-content-wrapper active">
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">email</span>
                                    <span data-translate="email" data-translate-category="menu"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <div class="enter-text-tool">
                                    <input type="email" id="feedback-email" name="email" placeholder="" required data-translate="email_placeholder" data-translate-category="menu" data-translate-target="placeholder">
                                </div>
                            </div>
                        </div>
                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">rule</span>
                                    <span data-translate="feedback_type" data-translate-category="menu"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <input type="hidden" name="feedback_type" id="feedback-type-value" value="contact_support">
                                <div class="custom-select-content" data-action="open-feedback-types-menu" role="button" tabindex="0">
                                    <div class="custom-select-content-left">
                                        <span id="feedback-type-display" data-translate="feedback_type_contact_support" data-translate-category="menu"></span>
                                    </div>
                                    <div class="custom-select-content-right">
                                        <span class="material-symbols-rounded">arrow_right</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="menu-content">
                            <div class="menu-content-header">
                                <div class="menu-content-header-primary">
                                    <span class="material-symbols-rounded">inbox</span>
                                    <span data-translate="write_feedback_message" data-translate-category="menu"></span>
                                </div>
                            </div>
                            <div class="menu-content-general">
                                <div class="custom-text-content">
                                    <textarea class="feedback-text overflow-y" id="feedback-text" name="feedback_text" rows="5" required placeholder="" data-translate="feedback_message_placeholder" data-translate-category="menu" data-translate-target="placeholder"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="menu-section-bottom">
                    <div class="menu-button-group">
                        <button type="button" class="menu-button" data-action="cancel-feedback" data-translate="cancel" data-translate-category="confirmation"></button>
                        <button type="button" class="menu-button menu-button--primary" data-action="submit-feedback-form">
                            <span data-translate="send_feedback" data-translate-category="menu"></span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>