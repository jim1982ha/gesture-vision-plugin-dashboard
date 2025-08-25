/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/interaction-manager.js */
const CURSOR_SENSITIVITY = 1.2;
const CURSOR_STORAGE_KEY = 'gesture-vision-dashboard-cursor-mirror';

export class InteractionManager {
    #dashboardManager;
    #cursorElement = null;
    #isEnabled = false;
    #unsubscribePubsub;
    #isMirrored;

    #hoveredCardName = null;
    #dwellTimeout = null;
    #dwellInterval = null;
    #isCooldownActive = false; // Add internal state for cooldown

    constructor(dashboardManager) {
        this.#dashboardManager = dashboardManager;
    }

    initialize() {
        this.#isMirrored = localStorage.getItem(CURSOR_STORAGE_KEY) === 'true';

        const { GESTURE_EVENTS } = this.#context.shared.constants;
        const { pubsub } = this.#context.services;
        
        // Unsubscribe from previous subscriptions if re-initialized
        if (this.#unsubscribePubsub) this.#unsubscribePubsub();

        const subscriptions = [
            pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, this.#handleLandmarks.bind(this)),
            // Subscribe to progress updates to monitor global cooldown
            pubsub.subscribe(GESTURE_EVENTS.UPDATE_PROGRESS, (data) => {
                this.#isCooldownActive = (data?.cooldownPercent ?? 0) > 0;
            })
        ];
        
        this.#unsubscribePubsub = () => subscriptions.forEach(unsub => unsub());
    }
    
    get #context() {
      return this.#dashboardManager.getContext();
    }

    #createCursor() {
        if (this.#cursorElement) return;
        this.#cursorElement = document.createElement('div');
        this.#cursorElement.id = 'dashboard-cursor';
        document.body.appendChild(this.#cursorElement);
    }
    
    #removeCursor() {
        if (this.#cursorElement) {
            this.#cursorElement.remove();
            this.#cursorElement = null;
        }
    }

    setEnabled(enabled) {
        this.#isEnabled = enabled;
        if (enabled) {
            this.#createCursor();
        } else {
            this.#removeCursor();
        }
        
        this.#cursorElement?.classList.toggle('visible', enabled);
        if (!enabled) {
            this.#clearDwellTimer();
            this.#unhoverCard();
        }
    }

    #handleLandmarks(renderData) {
        // CRITICAL FIX: If cooldown is active, do not process any interactions.
        if (this.#isCooldownActive) {
            this.#unhoverCard(); // Ensure any existing dwell is cancelled
            return;
        }

        if (!this.#isEnabled || !this.#cursorElement || !renderData?.handLandmarks?.[0]) {
            this.#cursorElement?.classList.remove('visible');
            this.#unhoverCard();
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

            this.#checkCardCollision(cursorX, cursorY, DWELL_TIME_MS);
        } else {
            this.#cursorElement.classList.remove('visible');
            this.#unhoverCard();
        }
    }

    #checkCardCollision(cursorX, cursorY, DWELL_TIME_MS) {
        const selector = '.card-item:not(.config-item-disabled):not(.config-item-unavailable):not(.plugin-missing)';
        const cards = this.#dashboardManager.getRootElement().querySelectorAll(selector);
        let currentlyHoveredName = null;

        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            if (cursorX > rect.left && cursorX < rect.right && cursorY > rect.top && cursorY < rect.bottom) {
                currentlyHoveredName = (/** @type {HTMLElement} */ (card)).dataset.gestureName ?? null;
                break;
            }
        }

        if (currentlyHoveredName !== this.#hoveredCardName) {
            this.#unhoverCard();
            if (currentlyHoveredName) {
                this.#hoverCard(currentlyHoveredName, DWELL_TIME_MS);
            }
        }
    }

    #hoverCard(gestureName, DWELL_TIME_MS) {
        this.#hoveredCardName = gestureName;
        const cardElement = this.#dashboardManager.getRootElement().querySelector(`.card-item[data-gesture-name="${CSS.escape(gestureName)}"]`);
        if (cardElement) {
            cardElement.classList.add('hover');
            if (cardElement.classList.contains('active-state')) {
                this.#cursorElement?.classList.add('high-contrast');
            }
        }
        this.#startDwellTimer(DWELL_TIME_MS);
    }

    #unhoverCard() {
        if (this.#hoveredCardName) {
            const cardElement = this.#dashboardManager.getRootElement().querySelector(`.card-item[data-gesture-name="${CSS.escape(this.#hoveredCardName)}"]`);
            cardElement?.classList.remove('hover');
        }
        this.#cursorElement?.classList.remove('high-contrast');
        this.#hoveredCardName = null;
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
            this.#triggerAction();
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

    #triggerAction() {
        if (!this.#hoveredCardName) return;

        const { webSocketService, services, coreStateManager } = this.#context;
        const gestureConfig = coreStateManager.getState().gestureConfigs.find(c => (c.gesture || c.pose) === this.#hoveredCardName);
        
        if (gestureConfig && gestureConfig.actionConfig) {
            const cardElement = this.#dashboardManager.getRootElement().querySelector(`.card-item[data-gesture-name="${CSS.escape(this.#hoveredCardName)}"]`);
            cardElement?.classList.add('widget-triggered');
            setTimeout(() => cardElement?.classList.remove('widget-triggered'), 400);

            const { GESTURE_EVENTS } = this.#context.shared.constants;
            
            services.pubsub.publish(GESTURE_EVENTS.DETECTED_ALERT, {
                gesture: this.#hoveredCardName,
                actionType: gestureConfig.actionConfig.pluginId
            });
            
            services.pubsub.publish(GESTURE_EVENTS.ACTION_TRIGGERED_BY_PLUGIN, { gestureName: this.#hoveredCardName });

            const { getGestureDisplayInfo } = this.#context.shared.services.actionDisplayUtils;
            const { category } = getGestureDisplayInfo(this.#hoveredCardName, coreStateManager.getState().customGestureMetadataList);

            const historyEntryPayload = {
                gesture: this.#hoveredCardName,
                actionType: gestureConfig.actionConfig.pluginId,
                gestureCategory: category,
                details: gestureConfig.actionConfig,
            };
            coreStateManager.getState().actions.addHistoryEntry(historyEntryPayload);

            const actionDetails = {
                gestureName: this.#hoveredCardName,
                confidence: 1.0,
                timestamp: Date.now()
            };
            
            if (webSocketService) {
                webSocketService.sendDispatchAction(gestureConfig, actionDetails);
            } else {
                 console.error("[Dashboard] WebSocketService is not available.");
            }
        }
        
        this.#unhoverCard();
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
        this.#removeCursor();
    }
}