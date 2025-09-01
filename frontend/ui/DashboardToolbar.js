/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/DashboardToolbar.js */
export class DashboardToolbar {
    #toolbarElement;
    #dashboardManager;
    #context;
    #isSizeDropdownOpen = false;

    constructor(toolbarElement, dashboardManager) {
        this.#toolbarElement = toolbarElement;
        this.#dashboardManager = dashboardManager;
        this.#context = dashboardManager.getContext();
    }

    initialize() {
        this.#createButtons();
        this.applyTranslations();
        document.addEventListener('click', this.#handleClickOutsideSizeDropdown.bind(this));
    }

    #createButtons() {
        const { uiComponents } = this.#context;
        const buttonContainer = this.#toolbarElement.querySelector('#dashboard-toolbar-buttons');
        if (!buttonContainer) return;
        
        buttonContainer.innerHTML = `
            <div class="hidden desktop:flex items-center gap-2">
                <div class="button-toggle-group" id="dashboard-card-size-toggle">
                    <button class="btn btn-secondary" data-value="small"></button>
                    <button class="btn btn-secondary" data-value="medium"></button>
                    <button class="btn btn-secondary" data-value="large"></button>
                </div>
                <button id="dashboard-mirror-cursor-btn" class="btn btn-secondary">
                    <span class="material-icons"></span>
                    <span class="mirror-cursor-text"></span>
                </button>
            </div>
            <div class="flex items-center gap-2 desktop:hidden">
                <div class="relative">
                    <button id="dashboard-size-trigger-mobile" class="btn btn-secondary btn-icon"><span class="material-icons"></span></button>
                    <div id="dashboard-size-panel-mobile" class="header-dropdown-panel">
                        <button class="btn btn-secondary w-full justify-start" data-value="small"></button>
                        <button class="btn btn-secondary w-full justify-start" data-value="medium"></button>
                        <button class="btn btn-secondary w-full justify-start" data-value="large"></button>
                    </div>
                </div>
                <button id="dashboard-mirror-cursor-btn-mobile" class="btn btn-secondary btn-icon"><span class="material-icons"></span></button>
            </div>
        `;

        buttonContainer.querySelectorAll('#dashboard-card-size-toggle button, #dashboard-size-panel-mobile button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = e.currentTarget.dataset.value;
                if (size) this.#dashboardManager.setCardSize(size);
                if (e.currentTarget.closest('#dashboard-size-panel-mobile')) this.#toggleSizeDropdown(false);
            });
        });
        
        uiComponents.setIcon(buttonContainer.querySelector('#dashboard-mirror-cursor-btn .material-icons'), 'UI_VIDEO_MIRROR');
        uiComponents.setIcon(buttonContainer.querySelector('#dashboard-size-trigger-mobile .material-icons'), 'UI_TUNE');
        uiComponents.setIcon(buttonContainer.querySelector('#dashboard-mirror-cursor-btn-mobile'), 'UI_VIDEO_MIRROR');
        
        buttonContainer.querySelector('#dashboard-size-trigger-mobile')?.addEventListener('click', (e) => { e.stopPropagation(); this.#toggleSizeDropdown(); });
        buttonContainer.querySelector('#dashboard-mirror-cursor-btn')?.addEventListener('click', () => this.#dashboardManager.interactionManager.toggleMirroring());
        buttonContainer.querySelector('#dashboard-mirror-cursor-btn-mobile')?.addEventListener('click', () => this.#dashboardManager.interactionManager.toggleMirroring());
    }
    
    applyTranslations() {
        const { services, manifest } = this.#context;
        const titleEl = this.#toolbarElement.querySelector('.dashboard-title');
        if (titleEl) titleEl.textContent = services.translate(manifest.nameKey, { defaultValue: 'Dashboard' });

        const closeBtn = this.#toolbarElement.querySelector('#dashboard-close-btn');
        if (closeBtn) closeBtn.setAttribute('aria-label', services.translate('close'));
    
        const applySizeTranslations = (container) => {
            if (!container) return;
            ['small', 'medium', 'large'].forEach(size => {
                const btn = container.querySelector(`button[data-value="${size}"]`);
                if (!btn) return;
                const sizeKey = `widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}`;
                const tooltipKey = `${sizeKey}Tooltip`;
                
                btn.textContent = services.translate(sizeKey);
                btn.title = services.translate(tooltipKey, { defaultValue: size });
            });
        };
    
        applySizeTranslations(document.getElementById('dashboard-card-size-toggle'));
        applySizeTranslations(document.getElementById('dashboard-size-panel-mobile'));
    
        const mirrorBtn = document.getElementById('dashboard-mirror-cursor-btn');
        if (mirrorBtn) {
            const textSpan = mirrorBtn.querySelector('.mirror-cursor-text');
            if (textSpan) textSpan.textContent = services.translate('mirrorCursor');
            mirrorBtn.title = services.translate('mirrorCursor');
        }
    
        const mobileSizeTrigger = document.getElementById('dashboard-size-trigger-mobile');
        if (mobileSizeTrigger) mobileSizeTrigger.title = services.translate('widgetSizeLabel');
    
        const mobileMirrorBtn = document.getElementById('dashboard-mirror-cursor-btn-mobile');
        if (mobileMirrorBtn) mobileMirrorBtn.title = services.translate('mirrorCursor');
    }

    #toggleSizeDropdown(forceState) {
        this.#isSizeDropdownOpen = forceState !== undefined ? forceState : !this.#isSizeDropdownOpen;
        const panel = this.#toolbarElement.querySelector('#dashboard-size-panel-mobile');
        panel?.classList.toggle('visible', this.#isSizeDropdownOpen);
    }

    #handleClickOutsideSizeDropdown = (event) => {
        if (this.#isSizeDropdownOpen) {
            const container = this.#toolbarElement.querySelector('.relative');
            if (container && !container.contains(event.target)) {
                this.#toggleSizeDropdown(false);
            }
        }
    };
    
    destroy() {
        document.removeEventListener('click', this.#handleClickOutsideSizeDropdown);
    }
}