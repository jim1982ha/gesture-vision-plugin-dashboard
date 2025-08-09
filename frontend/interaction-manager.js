/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/interaction-manager.js */
export class InteractionManager {
    #dashboardManager;
    #widgetGrid;
    #cursorElement;
    #isEnabled = false;
    #unsubscribePubsub;
    #canvasElement; // Cache the canvas element

    #hoveredWidgetId = null;
    #dwellTimeout = null;
    #dwellInterval = null;

    constructor(dashboardManager) {
        this.#dashboardManager = dashboardManager;
        this.#widgetGrid = this.#dashboardManager.getWidgetGrid();
        this.#createCursor();

        this.#canvasElement = document.getElementById('output_canvas');

        const { GESTURE_EVENTS } = this.#context.shared.constants;
        this.#unsubscribePubsub = this.#context.services.pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, this.#handleLandmarks.bind(this));
    }
    
    get #context() {
      return this.#dashboardManager.getContext();
    }

    #createCursor() {
        this.#cursorElement = document.createElement('div');
        this.#cursorElement.id = 'dashboard-cursor';
        this.#dashboardManager.getRootElement().appendChild(this.#cursorElement);
    }

    setEnabled(enabled) {
        this.#isEnabled = enabled;
        this.#cursorElement.classList.toggle('visible', enabled);
        if (!enabled) {
            this.#clearDwellTimer();
            this.#unhoverWidget();
        }
    }

    #handleLandmarks(renderData) {
        if (!this.#isEnabled || !this.#canvasElement || !renderData?.handLandmarks?.[0]) {
            this.#cursorElement.classList.remove('visible');
            return;
        }

        const landmarks = renderData.handLandmarks[0];
        const indexFingertip = landmarks[8];
        const DWELL_TIME_MS = 1000;

        if (indexFingertip) {
            this.#cursorElement.classList.add('visible');
            const rect = this.#canvasElement.getBoundingClientRect();
            
            const cursorX = rect.left + indexFingertip.x * rect.width;
            const cursorY = rect.top + indexFingertip.y * rect.height;
            
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
        widget?.getElement()?.classList.add('hover');
        this.#startDwellTimer(DWELL_TIME_MS);
    }

    #unhoverWidget() {
        if (this.#hoveredWidgetId) {
            const widget = this.#widgetGrid.getWidgetById(this.#hoveredWidgetId);
            widget?.getElement()?.classList.remove('hover');
        }
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
        this.#cursorElement.classList.remove('dwelling');
        this.#cursorElement.style.setProperty('--progress', 0);
    }

    #handleClick() {
        if (!this.#hoveredWidgetId) return;

        const widget = this.#widgetGrid.getWidgetById(this.#hoveredWidgetId);
        if (!widget) return;
        
        const actionConfig = widget.getActionConfig();
        if (!actionConfig || !actionConfig.pluginId || actionConfig.pluginId === 'none') {
            console.warn(`[Dashboard] Widget ${widget.id} clicked, but has no action.`);
            return;
        }

        const dummyGestureConfig = {
            gesture: `DashboardClick_${widget.id}`,
            confidence: 100,
            duration: 0,
            actionConfig: actionConfig
        };

        const actionDetails = {
            gestureName: dummyGestureConfig.gesture,
            confidence: 1.0,
            timestamp: Date.now()
        };

        console.log(`[Dashboard] Dispatching action for widget: ${widget.id}`, actionConfig);
        this.#context.services.webSocketService.sendDispatchAction(dummyGestureConfig, actionDetails);
        
        this.#unhoverWidget();
    }

    destroy() {
        if (typeof this.#unsubscribePubsub === 'function') {
            this.#unsubscribePubsub();
        }
        this.#cursorElement.remove();
    }
}