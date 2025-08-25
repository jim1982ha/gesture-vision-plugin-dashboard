/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-manager.js */
import { InteractionManager } from './interaction-manager.js';
import { DashboardCameraSelector } from './dashboard-camera-selector.js';

const CARD_SIZE_STORAGE_KEY = 'gesture-vision-dashboard-card-size';

export class DashboardManager {
    #context;
    #rootElement;
    #cardContainer;
    #toolbar;
    #interactionManager;
    #cameraSelector;
    #isActive = false;
    #currentCardSize = 'medium';
    #unsubscribeStore;
    #streamWasActiveBeforeDashboard = false;

    constructor(context) {
        this.#context = context;
        this.#createUI();
    }
    
    initialize() {
        this.#interactionManager = new InteractionManager(this);
        const cameraSelectorContainer = this.#toolbar.querySelector('#dashboard-camera-selector-container');
        this.#cameraSelector = new DashboardCameraSelector(cameraSelectorContainer, this);
        
        this.#interactionManager.initialize();
        this.#createToolbarButtons();
        
        this.#toolbar.querySelector('#dashboard-close-btn')?.addEventListener('click', () => this.toggleDashboard(false));
        this.#cardContainer.addEventListener('click', this.#handleCardClick);
        
        const store = this.#context.coreStateManager;
        
        this.#unsubscribeStore = store.subscribe(
            (state, prevState) => {
                const configsChanged = state.gestureConfigs !== prevState.gestureConfigs;
                const featuresChanged = 
                    state.enableBuiltInHandGestures !== prevState.enableBuiltInHandGestures ||
                    state.enableCustomHandGestures !== prevState.enableCustomHandGestures ||
                    state.enablePoseProcessing !== prevState.enablePoseProcessing;

                if (this.#isActive && (configsChanged || featuresChanged)) {
                    this.#renderActionCards();
                }
            }
        );
        
        this.#loadCardSizePreference();
        this.#updateCardSizeUI();
    }

    getContext() { return this.#context; }
    getRootElement() { return this.#rootElement; }

    #createUI() {
        this.#rootElement = document.createElement('div');
        this.#rootElement.id = 'dashboard-plugin-root';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'dashboard-content-wrapper';
        
        this.#toolbar = document.createElement('div');
        this.#toolbar.className = 'dashboard-toolbar';
        
        const { services, manifest } = this.#context;
        const title = services.translate(manifest.nameKey, { defaultValue: 'Dashboard' });

        this.#toolbar.innerHTML = `
            <div class="dashboard-header-left">
                <div id="dashboard-camera-selector-container"></div>
            </div>
            <h3 class="dashboard-title">${title}</h3>
            <div class="dashboard-header-right">
                <div id="dashboard-toolbar-buttons"></div>
                <button id="dashboard-close-btn" class="btn btn-icon header-close-btn" aria-label="${services.translate('close')}">
                    <span class="mdi mdi-close"></span>
                </button>
            </div>
        `;
        
        this.#cardContainer = document.createElement('div');
        this.#cardContainer.className = 'config-list dashboard-card-container';
        
        contentWrapper.append(this.#toolbar, this.#cardContainer);
        this.#rootElement.appendChild(contentWrapper);
        document.body.appendChild(this.#rootElement);
    }

    #createToolbarButtons() {
        const { services, uiComponents } = this.#context;
        const buttonContainer = this.#toolbar.querySelector('#dashboard-toolbar-buttons');
        if (!buttonContainer) return;

        const cardSizeGroup = document.createElement('div');
        cardSizeGroup.className = 'button-toggle-group';
        cardSizeGroup.id = 'dashboard-card-size-toggle';
        
        ['small', 'medium', 'large'].forEach(size => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.dataset.value = size;
            button.textContent = services.translate(`widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}`);
            button.addEventListener('click', () => this.#setCardSize(size));
            cardSizeGroup.appendChild(button);
        });
        
        const mirrorCursorButton = document.createElement('button');
        mirrorCursorButton.className = 'btn btn-secondary';
        mirrorCursorButton.id = 'dashboard-mirror-cursor-btn';
        
        const mirrorIconSpan = document.createElement('span');
        uiComponents.setIcon(mirrorIconSpan, 'UI_VIDEO_MIRROR');
        
        const mirrorTextSpan = document.createElement('span');
        mirrorTextSpan.textContent = services.translate('mirrorCursor');
        
        mirrorCursorButton.append(mirrorIconSpan, mirrorTextSpan);
        mirrorCursorButton.addEventListener('click', () => this.#interactionManager.toggleMirroring());
        
        buttonContainer.append(cardSizeGroup, mirrorCursorButton);
        this.#interactionManager.updateMirrorButtonState();
    }
    
    #handleCardClick = (event) => {
        const card = (event.target).closest('.card-item');
        const gestureName = card?.dataset.gestureName;

        if (gestureName) {
            this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.REQUEST_EDIT_CONFIG, gestureName);
        }
    };

    #loadCardSizePreference() {
        const savedSize = localStorage.getItem(CARD_SIZE_STORAGE_KEY);
        if (savedSize && ['small', 'medium', 'large'].includes(savedSize)) {
            this.#currentCardSize = savedSize;
        }
        this.#cardContainer.classList.add(`card-size-${this.#currentCardSize}`);
    }

    #setCardSize(size) {
        if (!['small', 'medium', 'large'].includes(size)) return;
        this.#cardContainer.classList.remove(`card-size-${this.#currentCardSize}`);
        this.#currentCardSize = size;
        this.#cardContainer.classList.add(`card-size-${this.#currentCardSize}`);
        localStorage.setItem(CARD_SIZE_STORAGE_KEY, size);
        this.#updateCardSizeUI();
    }

    #updateCardSizeUI() {
        const { uiComponents } = this.#context;
        const sizeToggle = document.getElementById('dashboard-card-size-toggle');
        if (sizeToggle && uiComponents) {
            uiComponents.updateButtonGroupActiveState(sizeToggle, this.#currentCardSize);
        }
    }

    async #renderActionCards() {
        const { uiController, coreStateManager } = this.#context;
        if (!uiController || !coreStateManager) return;

        this.#cardContainer.innerHTML = '';
        const configs = coreStateManager.getState().gestureConfigs;
        
        if (!configs || configs.length === 0) {
            this.#renderEmptyState();
            return;
        }

        await uiController.renderConfigListToContainer(this.#cardContainer, configs);
    }
    
    #renderEmptyState() {
        const { services, uiComponents } = this.#context;
        const emptyStateDiv = document.createElement('div');
        emptyStateDiv.className = 'dashboard-empty-state';

        const message = document.createElement('p');
        message.textContent = services.translate('dashboardEmptyMessage');
        
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        uiComponents.setIcon(button, 'UI_TUNE');
        button.append(services.translate('dashboardEmptyButton'));
        button.addEventListener('click', () => {
            this.toggleDashboard(false);
            this.#context.uiController?.sidebarManager.toggleConfigSidebar(true);
        });

        emptyStateDiv.append(message, button);
        this.#cardContainer.appendChild(emptyStateDiv);
    }
    
    async #manageStreamForDashboard(shouldBeActive) {
        const { cameraService, uiController } = this.#context;
        if (!cameraService || !uiController) return;
    
        if (shouldBeActive) {
            this.#streamWasActiveBeforeDashboard = cameraService.isStreamActive();
    
            if (!this.#streamWasActiveBeforeDashboard) {
                let selectedSource = uiController._cameraSourceManager.getSelectedCameraSource();
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
            // Only stop the stream if it was NOT running before the dashboard was opened.
            if (!this.#streamWasActiveBeforeDashboard) {
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
            pubsub.publish(GESTURE_EVENTS.SUPPRESS_ACTIONS);
            this.#renderActionCards();
        } else {
            pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        }

        this.#rootElement.classList.toggle('visible', this.#isActive);
        this.#interactionManager.setEnabled(this.#isActive);
        
        pubsub.publish('DASHBOARD_MODE_CHANGED', this.#isActive);
    }

    destroy() {
        const { GESTURE_EVENTS } = this.#context.shared.constants;
        if (this.#unsubscribeStore) this.#unsubscribeStore();
        this.#context.services.pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        this.toggleDashboard(false).catch(e => console.error(e));
        this.#interactionManager.destroy();
        this.#cameraSelector?.destroy();
        this.#rootElement.remove();
        document.body.classList.remove('dashboard-active');
    }

    isActive = () => this.#isActive;
}