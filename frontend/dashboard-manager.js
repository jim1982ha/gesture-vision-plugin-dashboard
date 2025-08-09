/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-manager.js */
import { WidgetGrid } from './widget-grid.js';
import { InteractionManager } from './interaction-manager.js';
import { WidgetEditor } from './ui/widget-editor.js';

export class DashboardManager {
    #context;
    #rootElement;
    #gridContainer;
    #toolbar;
    #widgetGrid;
    #interactionManager;
    #widgetEditor;
    #isActive = false;
    #isEditMode = false;

    constructor(context) {
        this.#context = context;
        this.#createUI();
        this.#widgetGrid = new WidgetGrid(this.#gridContainer, this);
        this.#interactionManager = new InteractionManager(this);
        this.#widgetEditor = new WidgetEditor(this.#context);

        this.#widgetGrid.loadLayout();
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
        
        this.#toolbar = document.createElement('div');
        this.#toolbar.className = 'dashboard-toolbar';

        this.#gridContainer = document.createElement('div');
        this.#gridContainer.className = 'dashboard-grid-container';
        
        const editModeBanner = document.createElement('div');
        editModeBanner.className = 'dashboard-edit-mode-banner';
        editModeBanner.textContent = 'Edit Mode';
        this.#gridContainer.appendChild(editModeBanner);

        this.#rootElement.append(this.#toolbar, this.#gridContainer);
        document.body.appendChild(this.#rootElement);

        this.#createToolbarButtons();
    }

    #createToolbarButtons() {
        const { services, uiComponents } = this.#context;

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

        this.#toolbar.append(editButton, addWidgetButton);
    }
    
    async #handleAddNewWidget() {
        const widgetConfig = await this.#widgetEditor.open();
        if (widgetConfig) {
            this.#widgetGrid.addWidget(widgetConfig);
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

    toggleDashboard(forceState) {
        const shouldBeActive = forceState !== undefined ? forceState : !this.#isActive;
        if (this.#isActive === shouldBeActive) return;

        this.#isActive = shouldBeActive;
        this.#rootElement.classList.toggle('visible', this.#isActive);
        this.#rootElement.classList.toggle('entering', this.#isActive);
        
        if (this.#isActive) {
            this.#refreshPluginData().catch(e => console.error(e));
        } else {
            this.#rootElement.classList.remove('entering');
            if (this.#isEditMode) {
                this.#toggleEditMode();
            }
        }
        
        this.#interactionManager.setEnabled(this.#isActive && !this.#isEditMode);
        this.#context.services.pubsub.publish('DASHBOARD_MODE_CHANGED', this.#isActive);
    }

    saveLayout() {
        const layout = this.#widgetGrid.getLayout();
        localStorage.setItem('gesture-vision-dashboard-layout', JSON.stringify(layout));
        this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_NOTIFICATION, { messageKey: 'notificationItemSaved', substitutions: {item: 'Dashboard Layout'}, type: 'success' });
    }
    
    destroy() {
        this.toggleDashboard(false);
        this.#interactionManager.destroy();
        this.#rootElement.remove();
    }

    isActive = () => this.#isActive;
    isEditMode = () => this.#isEditMode;
}