/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/interaction-manager.js */
const CURSOR_SENSITIVITY = 1.2; // 1.0 = exact mapping, > 1.0 allows reaching edges
const CURSOR_STORAGE_KEY = 'gesture-vision-dashboard-cursor-mirror';

export class InteractionManager {
    #dashboardManager;
    #widgetGrid;
    #cursorElement;
    #isEnabled = false;
    #unsubscribePubsub;
    #canvasElement; 
    #isMirrored;

    #hoveredWidgetId = null;
    #dwellTimeout = null;
    #dwellInterval = null;

    constructor(dashboardManager) {
        this.#dashboardManager = dashboardManager;
    }

    initialize() {
        this.#widgetGrid = this.#dashboardManager.getWidgetGrid();
        this.#canvasElement = document.getElementById('output_canvas');
        this.#isMirrored = localStorage.getItem(CURSOR_STORAGE_KEY) === 'true';
        this.#createCursor();

        const { GESTURE_EVENTS } = this.#context.shared.constants;
        this.#unsubscribePubsub = this.#context.services.pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, this.#handleLandmarks.bind(this));
    }
    
    get #context() {
      return this.#dashboardManager.getContext();
    }

    #createCursor() {
        this.#cursorElement = document.createElement('div');
        this.#cursorElement.id = 'dashboard-cursor';
        this.#dashboardManager.getRootElement()?.appendChild(this.#cursorElement);
    }

    setEnabled(enabled) {
        this.#isEnabled = enabled;
        this.#cursorElement?.classList.toggle('visible', enabled);
        if (!enabled) {
            this.#clearDwellTimer();
            this.#unhoverWidget();
        }
    }

    #handleLandmarks(renderData) {
        if (!this.#isEnabled || !this.#canvasElement || !this.#cursorElement || !renderData?.handLandmarks?.[0]) {
            this.#cursorElement?.classList.remove('visible');
            this.#unhoverWidget();
            return;
        }

        const landmarks = renderData.handLandmarks[0];
        const indexFingertip = landmarks[8];
        const DWELL_TIME_MS = 1000;

        if (indexFingertip) {
            this.#cursorElement.classList.add('visible');
            
            const dashboardRect = this.#dashboardManager.getRootElement().getBoundingClientRect();
            
            const centeredX = indexFingertip.x - 0.5;
            const centeredY = indexFingertip.y - 0.5;
            let finalX = 0.5 + centeredX * CURSOR_SENSITIVITY;
            let finalY = 0.5 + centeredY * CURSOR_SENSITIVITY;

            if (this.#isMirrored) {
                finalX = 1 - finalX;
            }

            finalX = Math.max(0, Math.min(1, finalX));
            finalY = Math.max(0, Math.min(1, finalY));

            const cursorX = dashboardRect.left + finalX * dashboardRect.width;
            const cursorY = dashboardRect.top + finalY * dashboardRect.height;
            
            this.#cursorElement.style.left = `${cursorX}px`;
            this.#cursorElement.style.top = `${cursorY}px`;

            this.#checkWidgetCollision(cursorX, cursorY, DWELL_TIME_MS);
        } else {
            this.#cursorElement.classList.remove('visible');
            this.#unhoverWidget();
        }
    }

    #checkWidgetCollision(cursorX, cursorY, DWELL_TIME_MS) {
        const widgets = this.#widgetGrid.getWidgetElements();
        let currentlyHoveredId = null;

        for (const widget of widgets) {
            const rect = widget.getBoundingClientRect();
            if (cursorX > rect.left && cursorX < rect.right && cursorY > rect.top && cursorY < rect.bottom) {
                currentlyHoveredId = widget.dataset.widgetId;
                break;
            }
        }

        if (currentlyHoveredId !== this.#hoveredWidgetId) {
            this.#unhoverWidget();
            if (currentlyHoveredId) {
                this.#hoverWidget(currentlyHoveredId, DWELL_TIME_MS);
            }
        }
    }

    #hoverWidget(widgetId, DWELL_TIME_MS) {
        this.#hoveredWidgetId = widgetId;
        const widget = this.#widgetGrid.getWidgetById(widgetId);
        const widgetElement = widget?.getElement();
        if (widgetElement) {
            widgetElement.classList.add('hover');
            if (widgetElement.classList.contains('active-state')) {
                this.#cursorElement?.classList.add('high-contrast');
            }
        }
        this.#startDwellTimer(DWELL_TIME_MS);
    }

    #unhoverWidget() {
        if (this.#hoveredWidgetId) {
            const widget = this.#widgetGrid.getWidgetById(this.#hoveredWidgetId);
            widget?.getElement()?.classList.remove('hover');
        }
        this.#cursorElement?.classList.remove('high-contrast');
        this.#hoveredWidgetId = null;
        this.#clearDwellTimer();
    }

    #startDwellTimer(DWELL_TIME_MS) {
        this.#clearDwellTimer();
        const startTime = performance.now();
        this.#cursorElement.classList.add('dwelling');

        this.#dwellInterval = setInterval(() => {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / DWELL_TIME_MS, 1);
            this.#cursorElement.style.setProperty('--progress', progress);
        }, 16);

        this.#dwellTimeout = setTimeout(() => {
            this.#handleClick();
        }, DWELL_TIME_MS);
    }

    #clearDwellTimer() {
        if (this.#dwellTimeout) clearTimeout(this.#dwellTimeout);
        if (this.#dwellInterval) clearInterval(this.#dwellInterval);
        this.#dwellTimeout = null;
        this.#dwellInterval = null;
        this.#cursorElement?.classList.remove('dwelling');
        this.#cursorElement?.style.setProperty('--progress', 0);
    }

    #handleClick() {
        if (!this.#hoveredWidgetId) return;

        const widget = this.#widgetGrid.getWidgetById(this.#hoveredWidgetId);
        
        if (widget) {
            widget.dispatchAction();
        }
        
        this.#unhoverWidget();
    }

    toggleMirroring() {
        this.#isMirrored = !this.#isMirrored;
        localStorage.setItem(CURSOR_STORAGE_KEY, this.#isMirrored);
        this.updateMirrorButtonState();
    }
    
    updateMirrorButtonState() {
        const button = document.getElementById('dashboard-mirror-cursor-btn');
        if (button) {
            button.classList.toggle('active', this.#isMirrored);
        }
    }

    destroy() {
        if (typeof this.#unsubscribePubsub === 'function') {
            this.#unsubscribePubsub();
        }
        this.#cursorElement?.remove();
    }
}