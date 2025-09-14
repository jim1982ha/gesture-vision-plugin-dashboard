/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-camera-selector.js */

export class DashboardCameraSelector {
    #dashboardManager;
    #context;
    #container;
    #triggerButton;
    #cameraNameSpan;
    #dropdownPanel;
    #isOpen = false;
    #unsubscribePubsub = [];

    constructor(container, dashboardManager) {
        this.#container = container;
        this.#dashboardManager = dashboardManager;
        this.#context = this.#dashboardManager.getContext();
        
        this.#createUI();
        this.#attachEventListeners();
        this.update();
    }

    #createUI() {
        this.#container.innerHTML = `
            <button class="btn btn-secondary px-2 desktop:px-4" aria-haspopup="true" aria-expanded="false">
                <span class="material-icons"></span>
                <span class="camera-name truncate hidden desktop:inline"></span>
                <span class="material-icons dropdown-arrow"></span>
            </button>
            <div class="header-dropdown-panel" role="menu"></div>
        `;
        const { setIcon } = this.#context.uiComponents;
        setIcon(this.#container.querySelector('.material-icons:not(.dropdown-arrow)'), 'UI_VIDEOCAM');
        setIcon(this.#container.querySelector('.dropdown-arrow'), 'UI_ARROW_DROP_DOWN');

        this.#triggerButton = this.#container.querySelector('button');
        this.#cameraNameSpan = this.#container.querySelector('.camera-name');
        this.#dropdownPanel = this.#container.querySelector('.header-dropdown-panel');
    }

    #attachEventListeners() {
        const { pubsub } = this.#context.services;
        const { WEBCAM_EVENTS } = this.#context.shared.constants;

        const subscriptions = [
            pubsub.subscribe('DASHBOARD_MODE_CHANGED', this.update.bind(this)),
            pubsub.subscribe(WEBCAM_EVENTS.STREAM_START, this.update.bind(this)),
            pubsub.subscribe(WEBCAM_EVENTS.STREAM_STOP, this.update.bind(this))
        ];
        this.#unsubscribePubsub.push(...subscriptions);

        this.#triggerButton.addEventListener('click', this.#toggleDropdown.bind(this));
        document.addEventListener('click', this.#handleClickOutside.bind(this));
    }

    update() {
        const { cameraService, uiController } = this.#context;
        const { translate } = this.#context.services.translationService;
        if (!cameraService || !uiController) return;

        const cameraManager = cameraService.getCameraManager();
        const allSources = cameraManager.getCameraSourceManager().getCombinedDeviceMap();
        const activeSourceId = cameraService.isStreamActive() ? cameraManager.getCurrentDeviceId() : null;
        
        const activeLabel = activeSourceId ? allSources.get(activeSourceId) || 'Unknown Source' : translate('noStreamActive');
        this.#cameraNameSpan.textContent = activeLabel;
        this.#triggerButton.title = activeLabel;

        this.#dropdownPanel.innerHTML = '';
        allSources.forEach((label, id) => {
            if (id !== activeSourceId) {
                const item = document.createElement('button');
                item.className = 'btn btn-secondary w-full justify-start';
                item.textContent = label;
                item.dataset.deviceId = id;
                item.addEventListener('click', () => this.#handleSourceSelect(id));
                this.#dropdownPanel.appendChild(item);
            }
        });
    }

    #handleSourceSelect(deviceId) {
        this.#context.cameraService.startStream({ cameraId: deviceId })
            .catch(e => console.error(`[Dashboard] Error switching camera:`, e));
        this.#closeDropdown();
    }

    #toggleDropdown() {
        this.#isOpen = !this.#isOpen;
        this.#triggerButton.setAttribute('aria-expanded', this.#isOpen);
        this.#dropdownPanel.classList.toggle('visible', this.#isOpen);
    }
    
    #closeDropdown() {
        if (!this.#isOpen) return;
        this.#isOpen = false;
        this.#triggerButton.setAttribute('aria-expanded', 'false');
        this.#dropdownPanel.classList.remove('visible');
    }

    #handleClickOutside(event) {
        if (this.#isOpen && !this.#container.contains(event.target)) {
            this.#closeDropdown();
        }
    }

    destroy() {
        document.removeEventListener('click', this.#handleClickOutside.bind(this));
        this.#unsubscribePubsub.forEach(unsub => unsub());
        this.#unsubscribePubsub = [];
    }
}