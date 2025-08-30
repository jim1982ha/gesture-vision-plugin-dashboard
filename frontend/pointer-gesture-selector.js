/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/pointer-gesture-selector.js */
export class PointerGestureSelector {
    #dashboardManager;
    #context;
    #container;
    #triggerButton;
    #gestureNameSpan;
    #dropdownPanel;
    #isOpen = false;

    constructor(container, dashboardManager) {
        this.#container = container;
        this.#dashboardManager = dashboardManager;
        this.#context = this.#dashboardManager.getContext();
        
        this.#createUI();
        this.#attachEventListeners();
        this.update(); // Initial render
    }

    #createUI() {
        this.#container.innerHTML = `
            <button class="btn btn-secondary dashboard-pointer-gesture-trigger" aria-haspopup="true" aria-expanded="false">
                <span class="material-icons">ads_click</span>
                <span class="gesture-name"></span>
                <span class="material-icons dropdown-arrow">arrow_drop_down</span>
            </button>
            <div class="dashboard-pointer-gesture-panel hidden" role="menu"></div>
        `;
        this.#triggerButton = this.#container.querySelector('.dashboard-pointer-gesture-trigger');
        this.#gestureNameSpan = this.#container.querySelector('.gesture-name');
        this.#dropdownPanel = this.#container.querySelector('.dashboard-pointer-gesture-panel');
    }

    #attachEventListeners() {
        const { pubsub } = this.#context.services;
        const { GESTURE_EVENTS } = this.#context.shared.constants;

        pubsub.subscribe(GESTURE_EVENTS.MODEL_LOADED, this.update.bind(this));
        
        this.#triggerButton.addEventListener('click', this.#toggleDropdown.bind(this));
        document.addEventListener('click', this.#handleClickOutside.bind(this));
    }
    
    // Public method to be called by DashboardManager when language changes
    applyTranslations() {
        this.update();
    }

    update() {
        const { coreStateManager, services } = this.#context;
        const { BUILT_IN_HAND_GESTURES } = this.#context.shared.constants;
        const { formatGestureNameForDisplay } = this.#context.shared.services.actionDisplayUtils;
        
        const state = coreStateManager.getState();
        const availableGestures = [];
        // FIX: When dashboard is active, it overrides global settings. The dropdown
        // should reflect this by showing all hand gestures regardless of the global state.
        const isDashboardActive = this.#dashboardManager.isActive();

        if (isDashboardActive || state.enableBuiltInHandGestures) {
            availableGestures.push(...BUILT_IN_HAND_GESTURES.filter(g => g !== 'NONE'));
        }
        if (isDashboardActive || state.enableCustomHandGestures) {
            const customHandGestures = state.customGestureMetadataList
                .filter(g => g.type === 'hand')
                .map(g => g.name);
            availableGestures.push(...customHandGestures);
        }

        const activeGesture = this.#dashboardManager.getPointerGestureName();
        const activeGestureFormatted = formatGestureNameForDisplay(activeGesture);
        this.#gestureNameSpan.textContent = services.translate(activeGestureFormatted, { defaultValue: activeGestureFormatted });

        this.#dropdownPanel.innerHTML = '';
        // Create a unique set of gestures to avoid duplicates if both global and override are enabled.
        const uniqueGestures = [...new Set(availableGestures)];

        uniqueGestures.forEach(name => {
            if (name !== activeGesture) {
                const item = document.createElement('button');
                item.className = 'btn btn-secondary';
                const formattedName = formatGestureNameForDisplay(name);
                item.textContent = services.translate(formattedName, { defaultValue: formattedName });
                item.dataset.gestureName = name;
                item.addEventListener('click', () => this.#handleGestureSelect(name));
                this.#dropdownPanel.appendChild(item);
            }
        });
    }

    #handleGestureSelect(gestureName) {
        this.#dashboardManager.setPointerGestureName(gestureName);
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
        document.removeEventListener('click', this.#handleClickOutside.bind(this));
    }
}