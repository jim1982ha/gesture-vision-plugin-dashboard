/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/pointer-gesture-selector.js */
export class PointerGestureSelector {
    #dashboardManager;
    #context;
    #container;
    #triggerButton;
    #gestureNameSpan;
    #dropdownPanel;
    #isOpen = false;
    #unsubscribePubsub = [];

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
            <button class="btn btn-secondary px-2 desktop:px-4" aria-haspopup="true" aria-expanded="false">
                <span class="material-icons"></span>
                <span class="gesture-name truncate hidden desktop:inline"></span>
                <span class="material-icons dropdown-arrow"></span>
            </button>
            <div class="header-dropdown-panel" role="menu"></div>
        `;
        const { setIcon } = this.#context.uiComponents;
        setIcon(this.#container.querySelector('.material-icons:not(.dropdown-arrow)'), 'ads_click');
        setIcon(this.#container.querySelector('.dropdown-arrow'), 'UI_ARROW_DROP_DOWN');

        this.#triggerButton = this.#container.querySelector('button');
        this.#gestureNameSpan = this.#container.querySelector('.gesture-name');
        this.#dropdownPanel = this.#container.querySelector('.header-dropdown-panel');
    }

    #attachEventListeners() {
        const { pubsub } = this.#context.services;
        const { GESTURE_EVENTS } = this.#context.shared.constants;

        const sub = pubsub.subscribe(GESTURE_EVENTS.MODEL_LOADED, this.update.bind(this));
        this.#unsubscribePubsub.push(sub);
        
        this.#triggerButton.addEventListener('click', this.#toggleDropdown.bind(this));
        document.addEventListener('click', this.#handleClickOutside.bind(this));
    }
    
    applyTranslations() {
        this.update();
    }

    update() {
        const { coreStateManager, services: { translationService } } = this.#context;
        const { BUILT_IN_HAND_GESTURES } = this.#context.shared.constants;
        const { formatGestureNameForDisplay } = this.#context.shared.services.actionDisplayUtils;
        
        const state = coreStateManager.getState();
        const availableGestures = [];
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
        const translatedLabel = translationService.translate(activeGestureFormatted, { defaultValue: activeGestureFormatted });
        this.#gestureNameSpan.textContent = translatedLabel;
        this.#triggerButton.title = translatedLabel; // Add tooltip for mobile

        this.#dropdownPanel.innerHTML = '';
        const uniqueGestures = [...new Set(availableGestures)];

        uniqueGestures.forEach(name => {
            if (name !== activeGesture) {
                const item = document.createElement('button');
                item.className = 'btn btn-secondary w-full justify-start';
                const formattedName = formatGestureNameForDisplay(name);
                item.textContent = translationService.translate(formattedName, { defaultValue: formattedName });
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