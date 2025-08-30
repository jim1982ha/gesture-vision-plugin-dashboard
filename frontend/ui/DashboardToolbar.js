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
        buttonContainer.innerHTML = '';

        const desktopControls = document.createElement('div');
        desktopControls.className = 'dashboard-desktop-controls';
        
        const cardSizeGroup = document.createElement('div');
        cardSizeGroup.className = 'button-toggle-group';
        cardSizeGroup.id = 'dashboard-card-size-toggle';
        ['small', 'medium', 'large'].forEach(size => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.dataset.value = size;
            button.addEventListener('click', () => this.#dashboardManager.setCardSize(size));
            cardSizeGroup.appendChild(button);
        });
        
        const mirrorCursorButton = document.createElement('button');
        mirrorCursorButton.className = 'btn btn-secondary';
        mirrorCursorButton.id = 'dashboard-mirror-cursor-btn';
        const mirrorIconSpan = document.createElement('span');
        uiComponents.setIcon(mirrorIconSpan, 'UI_VIDEO_MIRROR');
        const mirrorTextSpan = document.createElement('span');
        mirrorTextSpan.className = 'mirror-cursor-text';
        mirrorCursorButton.append(mirrorIconSpan, mirrorTextSpan);
        mirrorCursorButton.addEventListener('click', () => this.#dashboardManager.interactionManager.toggleMirroring());
        desktopControls.append(cardSizeGroup, mirrorCursorButton);

        const mobileControls = document.createElement('div');
        mobileControls.className = 'dashboard-mobile-controls';

        const mobileSizeDropdownContainer = document.createElement('div');
        mobileSizeDropdownContainer.className = 'dashboard-size-dropdown-container';
        
        const mobileSizeTrigger = document.createElement('button');
        mobileSizeTrigger.className = 'btn btn-secondary btn-icon';
        mobileSizeTrigger.id = 'dashboard-size-trigger-mobile';
        uiComponents.setIcon(mobileSizeTrigger, 'UI_TUNE');
        mobileSizeTrigger.addEventListener('click', (e) => { e.stopPropagation(); this.#toggleSizeDropdown(); });

        const mobileSizePanel = document.createElement('div');
        mobileSizePanel.id = 'dashboard-size-panel-mobile';
        mobileSizePanel.className = 'dashboard-size-dropdown hidden';
        ['small', 'medium', 'large'].forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.addEventListener('click', () => { this.#dashboardManager.setCardSize(size); this.#toggleSizeDropdown(false); });
            mobileSizePanel.appendChild(btn);
        });

        mobileSizeDropdownContainer.append(mobileSizeTrigger, mobileSizePanel);

        const mobileMirrorButton = document.createElement('button');
        mobileMirrorButton.id = 'dashboard-mirror-cursor-btn-mobile';
        mobileMirrorButton.className = 'btn btn-secondary btn-icon';
        uiComponents.setIcon(mobileMirrorButton, 'UI_VIDEO_MIRROR');
        mobileMirrorButton.addEventListener('click', () => this.#dashboardManager.interactionManager.toggleMirroring());
        
        mobileControls.append(mobileSizeDropdownContainer, mobileMirrorButton);
        buttonContainer.append(desktopControls, mobileControls);
    }
    
    applyTranslations() {
        const { services, manifest } = this.#context;
        const titleEl = this.#toolbarElement.querySelector('.dashboard-title');
        if (titleEl) titleEl.textContent = services.translate(manifest.nameKey, { defaultValue: 'Dashboard' });

        const closeBtn = this.#toolbarElement.querySelector('#dashboard-close-btn');
        if (closeBtn) closeBtn.setAttribute('aria-label', services.translate('close'));

        // Desktop controls
        const sizeToggle = document.getElementById('dashboard-card-size-toggle');
        if (sizeToggle) {
            ['small', 'medium', 'large'].forEach(size => {
                const btn = sizeToggle.querySelector(`button[data-value="${size}"]`);
                if (btn) btn.textContent = services.translate(`widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}`);
            });
        }
        const mirrorBtn = document.getElementById('dashboard-mirror-cursor-btn');
        if (mirrorBtn) {
            const textSpan = mirrorBtn.querySelector('.mirror-cursor-text');
            if (textSpan) textSpan.textContent = services.translate('mirrorCursor');
        }

        // Mobile controls
        const mobileSizeTrigger = document.getElementById('dashboard-size-trigger-mobile');
        if (mobileSizeTrigger) mobileSizeTrigger.title = services.translate('widgetSizeLabel');
        const mobileSizePanel = document.getElementById('dashboard-size-panel-mobile');
        if (mobileSizePanel) {
            ['small', 'medium', 'large'].forEach(size => {
                const btn = mobileSizePanel.querySelector(`button:nth-child(${['small', 'medium', 'large'].indexOf(size) + 1})`);
                if (btn) btn.textContent = services.translate(`widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}`);
            });
        }
        const mobileMirrorBtn = document.getElementById('dashboard-mirror-cursor-btn-mobile');
        if (mobileMirrorBtn) mobileMirrorBtn.title = services.translate('mirrorCursor');
    }

    #toggleSizeDropdown(forceState) {
        this.#isSizeDropdownOpen = forceState !== undefined ? forceState : !this.#isSizeDropdownOpen;
        const panel = this.#toolbarElement.querySelector('#dashboard-size-panel-mobile');
        panel?.classList.toggle('hidden', !this.#isSizeDropdownOpen);
        panel?.classList.toggle('visible', this.#isSizeDropdownOpen);
    }

    #handleClickOutsideSizeDropdown = (event) => {
        if (this.#isSizeDropdownOpen) {
            const container = this.#toolbarElement.querySelector('.dashboard-size-dropdown-container');
            if (container && !container.contains(event.target)) {
                this.#toggleSizeDropdown(false);
            }
        }
    };
    
    destroy() {
        document.removeEventListener('click', this.#handleClickOutsideSizeDropdown);
    }
}