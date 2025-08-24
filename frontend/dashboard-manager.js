/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-manager.js */
import { WidgetGrid } from './widget-grid.js';
import { InteractionManager } from './interaction-manager.js';
import { WidgetEditor } from './ui/widget-editor.js';
import { DashboardCameraSelector } from './dashboard-camera-selector.js';

export class DashboardManager {
    #context;
    #rootElement;
    #gridContainer;
    #toolbar;
    #widgetGrid;
    #interactionManager;
    #widgetEditor;
    #cameraSelector;
    #isActive = false;
    #isEditMode = false;
    #streamStartedByDashboard = false;

    constructor(context) {
        this.#context = context;
        this.#createUI();
    }
    
    initialize() {
        this.#interactionManager = new InteractionManager(this);
        this.#widgetGrid = new WidgetGrid(this.#gridContainer, this);
        this.#widgetEditor = new WidgetEditor(this.#context);
        const cameraSelectorContainer = this.#toolbar.querySelector('#dashboard-camera-selector-container');
        this.#cameraSelector = new DashboardCameraSelector(cameraSelectorContainer, this);
        
        this.#interactionManager.initialize();
        this.#createToolbarButtons();
        this.#widgetGrid.loadLayout();
        
        this.#toolbar.querySelector('#dashboard-close-btn')?.addEventListener('click', () => this.toggleDashboard(false));
        
        const { WEBSOCKET_EVENTS } = this.#context.shared.constants;
        this.#context.services.pubsub.subscribe(WEBSOCKET_EVENTS.BACKEND_ACTION_RESULT, (result) => {
            if (result?.success && result.pluginId === 'gesture-vision-plugin-home-assistant') {
                setTimeout(() => this.#refreshPluginData(), 500);
            }
        });
    }

    getContext() {
        return this.#context;
    }

    getWidgetGrid() {
        return this.#widgetGrid;
    }

    getRootElement() {
        return this.#rootElement;
    }

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
        
        this.#gridContainer = document.createElement('div');
        this.#gridContainer.className = 'dashboard-grid-container';
        
        const editModeBanner = document.createElement('div');
        editModeBanner.className = 'dashboard-edit-mode-banner';
        editModeBanner.textContent = 'Edit Mode';
        this.#gridContainer.appendChild(editModeBanner);

        contentWrapper.append(this.#toolbar, this.#gridContainer);
        this.#rootElement.appendChild(contentWrapper);
        document.body.appendChild(this.#rootElement);
    }

    #createToolbarButtons() {
        const { services, uiComponents } = this.#context;
        const buttonContainer = this.#toolbar.querySelector('#dashboard-toolbar-buttons');

        const createButton = (textKey, iconKey, clickHandler, id = null) => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            if (id) button.id = id;
            
            const iconSpan = document.createElement('span');
            const textSpan = document.createElement('span');
            
            uiComponents.setIcon(iconSpan, iconKey);
            textSpan.textContent = services.translate(textKey);
            
            button.append(iconSpan, textSpan);
            button.addEventListener('click', clickHandler);
            return button;
        };
        
        const addWidgetButton = createButton('addWidget', 'UI_ADD', () => this.#handleAddNewWidget());
        const editButton = createButton('editDashboard', 'edit', () => this.#toggleEditMode(), 'dashboard-edit-btn');
        
        const mirrorCursorButton = createButton('mirrorCursor', 'UI_VIDEO_MIRROR', () => this.#interactionManager.toggleMirroring(), 'dashboard-mirror-cursor-btn');
        
        buttonContainer.append(mirrorCursorButton, editButton, addWidgetButton);
        this.#interactionManager.updateMirrorButtonState();
    }
    
    async #handleAddNewWidget() {
        const widgetConfig = await this.#widgetEditor.open();
        if (widgetConfig) {
            await this.#widgetGrid.addWidget(widgetConfig);
            this.saveLayout();
        }
    }

    async editWidget(widgetId) {
        const existingConfig = this.#widgetGrid.getWidgetConfig(widgetId);
        if (!existingConfig) return;
        
        const newConfig = await this.#widgetEditor.open(existingConfig);
        if (newConfig) {
            this.#widgetGrid.updateWidget(widgetId, newConfig);
            this.saveLayout();
        }
    }

    deleteWidget(widgetId) {
        this.#widgetGrid.removeWidget(widgetId);
        this.saveLayout();
    }
    
    #toggleEditMode() {
        this.#isEditMode = !this.#isEditMode;
        this.#rootElement.classList.toggle('edit-mode', this.#isEditMode);
        
        this.#interactionManager.setEnabled(!this.#isEditMode && this.#isActive);
        this.#widgetGrid.setEditMode(this.#isEditMode);

        const editButton = this.#toolbar.querySelector('#dashboard-edit-btn');
        if (editButton) {
            const { services, uiComponents } = this.#context;
            const textKey = this.#isEditMode ? 'saveDashboard' : 'editDashboard';
            const iconKey = this.#isEditMode ? 'UI_SAVE' : 'edit';
            
            const textSpan = editButton.querySelector('span:not([class*="material-icons"]):not([class*="mdi"])');
            if(textSpan) textSpan.textContent = services.translate(textKey);

            const iconSpan = editButton.querySelector('.material-icons, .mdi');
            if(iconSpan) uiComponents.setIcon(iconSpan, iconKey);
            
            if (!this.#isEditMode) {
                this.saveLayout();
            }
        }
    }

    async #refreshPluginData() {
        const HA_PLUGIN_ID = 'gesture-vision-plugin-home-assistant';
        const { coreStateManager, services } = this.#context;
        const appState = coreStateManager.getState();
        
        const hasHaWidgets = this.#widgetGrid.getLayout().some(w => w.actionConfig?.pluginId === HA_PLUGIN_ID);
        const haConfig = appState.pluginGlobalConfigs.get(HA_PLUGIN_ID);

        if (hasHaWidgets && haConfig?.url && haConfig.token) {
            try {
                const response = await fetch(`/api/plugins/${HA_PLUGIN_ID}/entities`);
                if (!response.ok) throw new Error(`Failed to fetch HA entities: ${response.status}`);
                
                const entities = await response.json();
                const currentState = appState.pluginExtDataCache.get(HA_PLUGIN_ID) || {};
                
                coreStateManager.getState().actions.setPluginExtData(HA_PLUGIN_ID, {
                    ...currentState,
                    entities: entities,
                });
                
                services.pubsub.publish('PLUGIN_EXT_DATA_UPDATED', HA_PLUGIN_ID);
            } catch (error) {
                console.error("[Dashboard] Failed to refresh Home Assistant data:", error);
            }
        }
    }
    
    async #manageStreamForDashboard(shouldBeActive) {
        const { cameraService, uiController } = this.#context;
        if (!cameraService || !uiController) return;

        if (shouldBeActive) {
            if (!cameraService.isStreamActive()) {
                let selectedSource = uiController._cameraSourceManager.getSelectedCameraSource();
                if (!selectedSource || selectedSource.startsWith('rtsp:')) {
                    uiController.modalManager.toggleCameraSelectModal(true);
                    return;
                }
                
                try {
                    await cameraService.startStream({ cameraId: selectedSource, gestureType: 'hand' });
                    this.#streamStartedByDashboard = true;
                } catch (e) {
                     console.error('[Dashboard] Failed to auto-start stream for dashboard.', e);
                }
            }
            this.#refreshPluginData().catch(e => console.error(e));
        } else {
            if (this.#streamStartedByDashboard && cameraService.isStreamActive()) {
                await cameraService.stopStream();
            }
            this.#streamStartedByDashboard = false;
        }
    }


    async toggleDashboard(forceState) {
        const { GESTURE_EVENTS } = this.#context.shared.constants;
        const { pubsub } = this.#context.services;
        
        const shouldBeActive = forceState !== undefined ? forceState : !this.#isActive;
        if (this.#isActive === shouldBeActive) return;

        this.#isActive = shouldBeActive;
        
        if (this.#isActive) {
            pubsub.publish(GESTURE_EVENTS.SUPPRESS_ACTIONS);
        } else {
            pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        }

        this.#rootElement.classList.toggle('visible', this.#isActive);
        this.#rootElement.classList.toggle('entering', this.#isActive);
        
        document.body.classList.toggle('dashboard-active', this.#isActive);

        await this.#manageStreamForDashboard(this.#isActive);
        
        if (this.#isActive) {
            this.#interactionManager.setEnabled(!this.#isEditMode);
        } else {
            this.#interactionManager.setEnabled(false);
            this.#rootElement.classList.remove('entering');
            if (this.#isEditMode) {
                this.#toggleEditMode();
            }
        }
        
        this.#context.services.pubsub.publish('DASHBOARD_MODE_CHANGED', this.#isActive);
    }

    saveLayout() {
        const layout = this.#widgetGrid.getLayout();
        localStorage.setItem('gesture-vision-dashboard-layout', JSON.stringify(layout));
        this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_NOTIFICATION, { messageKey: 'notificationItemSaved', substitutions: {item: 'Dashboard Layout'}, type: 'success' });
    }
    
    destroy() {
        const { GESTURE_EVENTS } = this.#context.shared.constants;
        this.#context.services.pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        this.toggleDashboard(false).catch(e => console.error(e));
        this.#interactionManager.destroy();
        this.#cameraSelector?.destroy();
        this.#rootElement.remove();
        document.body.classList.remove('dashboard-active');
    }

    isActive = () => this.#isActive;
    isEditMode = () => this.#isEditMode;
}