/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-manager.js */
import { InteractionManager } from './interaction-manager.js';
import { DashboardCameraSelector } from './dashboard-camera-selector.js';
import { PointerGestureSelector } from './pointer-gesture-selector.js';
import { CardRenderer } from './ui/CardRenderer.js';
import { DashboardToolbar } from './ui/DashboardToolbar.js';

const CARD_SIZE_STORAGE_KEY = 'gv-dashboard-card-size';
const POINTER_GESTURE_STORAGE_KEY = 'gv-dashboard-pointer-gesture';

export class DashboardManager {
    #context;
    #rootElement;
    #contentWrapperElement;
    #cardContainer;
    #toolbarElement;
    
    interactionManager;
    #cameraSelector;
    #pointerGestureSelector;
    #cardRenderer;
    #toolbar;
    
    #isActive = false;
    #currentCardSize = 'medium';
    #unsubscribeStore;
    #streamWasActiveBeforeDashboard = false;
    #pointerGestureName = 'POINTING_UP';

    constructor(context) {
        this.#context = context;
        this.#createUI();
    }
    
    initialize() {
        this.interactionManager = new InteractionManager(this);
        this.#cardRenderer = new CardRenderer(this.#cardContainer, this);
        this.#toolbar = new DashboardToolbar(this.#toolbarElement, this);

        const cameraSelectorContainer = this.#toolbarElement.querySelector('#dashboard-camera-selector-container');
        this.#cameraSelector = new DashboardCameraSelector(cameraSelectorContainer, this);
        
        const pointerGestureSelectorContainer = this.#toolbarElement.querySelector('#dashboard-pointer-gesture-selector-container');
        this.#pointerGestureSelector = new PointerGestureSelector(pointerGestureSelectorContainer, this);

        this.interactionManager.initialize();
        this.#toolbar.initialize();
        
        const closeBtn = this.#toolbarElement.querySelector('#dashboard-close-btn');
        if (closeBtn) {
            this.getContext().uiComponents.setIcon(closeBtn, 'UI_CLOSE');
            closeBtn.addEventListener('click', () => this.toggleDashboard(false));
        }
        
        const store = this.#context.coreStateManager;
        
        this.#unsubscribeStore = store.subscribe(
            (state, prevState) => {
                const configsChanged = state.gestureConfigs !== prevState.gestureConfigs;
                const featuresChanged = 
                    state.enableBuiltInHandGestures !== prevState.enableBuiltInHandGestures ||
                    state.enableCustomHandGestures !== prevState.enableCustomHandGestures ||
                    state.enablePoseProcessing !== prevState.enablePoseProcessing;
                const languageChanged = state.languagePreference !== prevState.languagePreference;

                if (this.#isActive && (configsChanged || featuresChanged)) {
                    this.#cardRenderer.render();
                    this.#pointerGestureSelector.update();
                }
                if (languageChanged) {
                    this.#toolbar.applyTranslations();
                    this.#pointerGestureSelector.applyTranslations();
                }
            }
        );
        
        this.#loadCardSizePreference();
        this.#loadPointerGesturePreference();
        this.#updateCardSizeUI();
    }

    getContext() { return this.#context; }
    getRootElement() { return this.#rootElement; }
    getContentWrapperElement() { return this.#contentWrapperElement; }
    getCardContainerElement() { return this.#cardContainer; }
    getPointerGestureName() { return this.#pointerGestureName; }
    
    setPointerGestureName(name) {
        this.#pointerGestureName = name;
        localStorage.setItem(POINTER_GESTURE_STORAGE_KEY, name);
        this.#cardRenderer.render();
        this.#pointerGestureSelector.update();
    }

    setCardSize(size) {
        if (!['small', 'medium', 'large'].includes(size)) return;
        this.#cardContainer.classList.remove(`card-size-${this.#currentCardSize}`);
        this.#currentCardSize = size;
        this.#cardContainer.classList.add(`card-size-${this.#currentCardSize}`);
        localStorage.setItem(CARD_SIZE_STORAGE_KEY, size);
        this.#updateCardSizeUI();
    }

    #createUI() {
        this.#rootElement = document.createElement('div');
        this.#rootElement.id = 'dashboard-plugin-root';
        this.#rootElement.className = 'fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center invisible opacity-0 transition-opacity duration-300';
        
        this.#contentWrapperElement = document.createElement('div');
        this.#contentWrapperElement.className = 'w-[90vw] h-[85vh] max-w-[1400px] max-h-[900px] bg-surface border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden scale-95 opacity-0 transition-transform transition-opacity duration-300 ease-out';
        
        this.#toolbarElement = document.createElement('div');
        this.#toolbarElement.className = 'flex-shrink-0 p-2 flex items-center justify-between gap-2 border-b border-border';
        
        this.#toolbarElement.innerHTML = `
            <div class="flex-1 flex items-center gap-2 min-w-0">
                <div id="dashboard-camera-selector-container" class="relative"></div>
                <div id="dashboard-pointer-gesture-selector-container" class="relative"></div>
            </div>
            <h3 class="dashboard-title text-lg font-semibold text-text-primary hidden desktop:block"></h3>
            <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                <div id="dashboard-toolbar-buttons" class="flex items-center gap-2"></div>
                <button id="dashboard-close-btn" class="btn btn-icon"></button>
            </div>
        `;
        
        this.#cardContainer = document.createElement('div');
        this.#cardContainer.className = 'dashboard-card-container overflow-y-auto p-4 grid gap-3 content-start';
        
        this.#contentWrapperElement.append(this.#toolbarElement, this.#cardContainer);
        this.#rootElement.appendChild(this.#contentWrapperElement);
        document.body.appendChild(this.#rootElement);
    }

    #loadCardSizePreference() {
        const savedSize = localStorage.getItem(CARD_SIZE_STORAGE_KEY);
        if (savedSize && ['small', 'medium', 'large'].includes(savedSize)) {
            this.#currentCardSize = savedSize;
        }
        this.#cardContainer.classList.add(`card-size-${this.#currentCardSize}`);
    }
    
    #loadPointerGesturePreference() {
        const savedGesture = localStorage.getItem(POINTER_GESTURE_STORAGE_KEY);
        this.#pointerGestureName = savedGesture || 'POINTING_UP';
    }

    #updateCardSizeUI() {
        const { uiComponents } = this.#context;
        const sizeToggle = document.getElementById('dashboard-card-size-toggle');
        if (sizeToggle && uiComponents) {
            uiComponents.updateButtonGroupActiveState(sizeToggle, this.#currentCardSize);
        }
    }
    
    async #manageStreamForDashboard(shouldBeActive) {
        const { cameraService, uiController } = this.#context;
        if (!cameraService || !uiController) return;
    
        if (shouldBeActive) {
            this.#streamWasActiveBeforeDashboard = cameraService.isStreamActive();
    
            if (!this.#streamWasActiveBeforeDashboard) {
                let selectedSource = uiController.cameraManager.getCameraSourceManager().getSelectedCameraSource();
                if (!selectedSource || selectedSource.startsWith('rtsp:')) {
                    uiController.modalManager.toggleCameraSelectModal(true);
                    return;
                }
                try {
                    await cameraService.startStream({ cameraId: selectedSource, gestureType: 'hand' });
                } catch (e) {
                     console.error('[Dashboard] Failed to auto-start stream for dashboard.', e);
                }
            }
        } else {
            if (!this.#streamWasActiveBeforeDashboard && cameraService.isStreamActive()) {
                await cameraService.stopStream();
            }
            this.#streamWasActiveBeforeDashboard = false;
        }
    }

    async toggleDashboard(forceState) {
        const { GESTURE_EVENTS } = this.#context.shared.constants;
        const { pubsub } = this.#context.services;
        
        const shouldBeActive = forceState !== undefined ? forceState : !this.#isActive;
        if (this.#isActive === shouldBeActive) return;

        this.#isActive = shouldBeActive;
        
        document.body.classList.toggle('dashboard-active', this.#isActive);
        await this.#manageStreamForDashboard(this.#isActive);
        
        if (this.#isActive) {
            pubsub.publish(GESTURE_EVENTS.REQUEST_PROCESSING_OVERRIDE, { 
                hand: true, 
                pose: false, 
                numHands: 1,
                builtIn: true, 
                custom: true,
            });
            pubsub.publish(GESTURE_EVENTS.SUPPRESS_ACTIONS);
            this.#cardRenderer.render();
        } else {
            pubsub.publish(GESTURE_EVENTS.CLEAR_PROCESSING_OVERRIDE);
            pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        }

        this.#rootElement.classList.toggle('visible', this.#isActive);
        this.#rootElement.classList.toggle('invisible', !this.#isActive);
        this.#rootElement.classList.toggle('opacity-100', this.#isActive);
        this.#rootElement.classList.toggle('opacity-0', !this.#isActive);

        this.#contentWrapperElement.classList.toggle('scale-100', this.#isActive);
        this.#contentWrapperElement.classList.toggle('opacity-100', this.#isActive);
        this.#contentWrapperElement.classList.toggle('scale-95', !this.#isActive);
        this.#contentWrapperElement.classList.toggle('opacity-0', !this.#isActive);
        
        this.interactionManager.setEnabled(this.#isActive);
        
        pubsub.publish('DASHBOARD_MODE_CHANGED', this.#isActive);
    }

    destroy() {
        const { GESTURE_EVENTS } = this.#context.shared.constants;
        if (this.#unsubscribeStore) this.#unsubscribeStore();
        
        this.#context.services.pubsub.publish(GESTURE_EVENTS.CLEAR_PROCESSING_OVERRIDE);
        this.#context.services.pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        
        this.toggleDashboard(false).catch(e => console.error(e));
        this.interactionManager.destroy();
        this.#cameraSelector?.destroy();
        this.#pointerGestureSelector?.destroy();
        this.#toolbar?.destroy();
        this.#rootElement.remove();
        document.body.classList.remove('dashboard-active');
    }

    isActive = () => this.#isActive;
}