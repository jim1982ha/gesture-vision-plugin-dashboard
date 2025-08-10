/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-camera-selector.js */

export class DashboardCameraSelector {
    #dashboardManager;
    #context;
    #container;
    #triggerButton;
    #cameraNameSpan;
    #dropdownPanel;
    #isOpen = false;

    constructor(container, dashboardManager) {
        this.#container = container;
        this.#dashboardManager = dashboardManager;
        this.#context = this.#dashboardManager.getContext();
        
        this.#createUI();
        this.#attachEventListeners();
        this.#update(); // Initial render
    }

    #createUI() {
        this.#container.innerHTML = `
            <button class="btn btn-secondary dashboard-camera-trigger" aria-haspopup="true" aria-expanded="false">
                <span class="material-icons">videocam</span>
                <span class="camera-name"></span>
                <span class="material-icons dropdown-arrow">arrow_drop_down</span>
            </button>
            <div class="dashboard-camera-panel hidden" role="menu"></div>
        `;
        this.#triggerButton = this.#container.querySelector('.dashboard-camera-trigger');
        this.#cameraNameSpan = this.#container.querySelector('.camera-name');
        this.#dropdownPanel = this.#container.querySelector('.dashboard-camera-panel');
    }

    #attachEventListeners() {
        const { pubsub } = this.#context.services;
        const { WEBCAM_EVENTS, CAMERA_SOURCE_EVENTS } = this.#context.shared.constants;
        
        pubsub.subscribe(WEBCAM_EVENTS.STREAM_START, this.#update.bind(this));
        pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, this.#update.bind(this));

        this.#triggerButton.addEventListener('click', this.#toggleDropdown.bind(this));
        document.addEventListener('click', this.#handleClickOutside.bind(this));
    }

    #update() {
        const { cameraService, uiController } = this.#context;
        if (!cameraService || !uiController) return;

        const allSources = uiController._cameraSourceManager.getCombinedDeviceMap();
        const activeSourceId = cameraService.isStreamActive() ? cameraService.getWebcamManager()._currentDeviceId : null;
        
        const activeLabel = activeSourceId ? allSources.get(activeSourceId) || 'Unknown Source' : 'No Stream Active';
        this.#cameraNameSpan.textContent = activeLabel;

        this.#dropdownPanel.innerHTML = '';
        allSources.forEach((label, id) => {
            if (id !== activeSourceId) {
                const item = document.createElement('button');
                item.className = 'btn btn-secondary';
                item.textContent = label;
                item.dataset.deviceId = id;
                item.addEventListener('click', () => this.#handleSourceSelect(id));
                this.#dropdownPanel.appendChild(item);
            }
        });
    }

    #handleSourceSelect(deviceId) {
        this.#context.cameraService.startStream({ cameraId: deviceId, gestureType: 'hand' })
            .catch(e => console.error(`[Dashboard] Error switching camera:`, e));
        this.#closeDropdown();
    }

    #toggleDropdown() {
        this.#isOpen = !this.#isOpen;
        this.#triggerButton.setAttribute('aria-expanded', this.#isOpen);
        this.#dropdownPanel.classList.toggle('hidden', !this.#isOpen);
        this.#dropdownPanel.classList.toggle('visible', this.#isOpen);
    }
    
    #closeDropdown() {
        if (!this.#isOpen) return;
        this.#isOpen = false;
        this.#triggerButton.setAttribute('aria-expanded', 'false');
        this.#dropdownPanel.classList.add('hidden');
        this.#dropdownPanel.classList.remove('visible');
    }

    #handleClickOutside(event) {
        if (this.#isOpen && !this.#container.contains(event.target)) {
            this.#closeDropdown();
        }
    }

    destroy() {
        // Unsubscribe logic could be added here if pubsub returns unsubscribe functions
        document.removeEventListener('click', this.#handleClickOutside.bind(this));
    }
}