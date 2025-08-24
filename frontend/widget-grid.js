/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widget-grid.js */
import { WidgetFactory } from './widgets/widget-factory.js';

export class WidgetGrid {
    #gridElement;
    #dashboardManager;
    #widgets = new Map();
    #isEditMode = false;

    constructor(container, dashboardManager) {
        this.#gridElement = document.createElement('div');
        this.#gridElement.className = 'dashboard-grid';
        container.appendChild(this.#gridElement);
        this.#dashboardManager = dashboardManager;
    }
    
    getContext() {
        return this.#dashboardManager.getContext();
    }

    loadLayout() {
        const savedLayout = localStorage.getItem('gesture-vision-dashboard-layout');
        if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            layout.forEach(widgetConfig => this.addWidget(widgetConfig, false));
        }
    }

    async addWidget(widgetConfig, isNew = true) {
        const id = isNew ? `widget-${Date.now()}` : widgetConfig.id;
        const config = { ...widgetConfig, id };

        const widget = WidgetFactory.createWidget(config, this);
        if (widget) {
            this.#widgets.set(id, widget);
            // Await the render method in case it's async (like StatefulButtonWidget)
            const widgetElement = await widget.render();
            this.#gridElement.appendChild(widgetElement);
        }
    }
    
    updateWidget(widgetId, newConfig) {
        const widget = this.#widgets.get(widgetId);
        if (widget) {
            widget.updateConfig(newConfig);
        }
    }

    removeWidget(widgetId) {
        const widget = this.#widgets.get(widgetId);
        if (widget) {
            widget.destroy();
            this.#widgets.delete(widgetId);
        }
    }

    getWidgetConfig(widgetId) {
        return this.#widgets.get(widgetId)?.getConfig();
    }

    setEditMode(isEditing) {
        this.#isEditMode = isEditing;
        this.#widgets.forEach(widget => widget.setEditMode(isEditing));
    }

    isEditMode() {
        return this.#isEditMode;
    }

    getLayout() {
        return Array.from(this.#widgets.values()).map(widget => widget.getConfig());
    }

    getWidgetElements() {
        return Array.from(this.#widgets.values()).map(w => w.getElement());
    }

    getWidgetById(id) {
        return this.#widgets.get(id);
    }
    
    getDashboardManager() {
        return this.#dashboardManager;
    }
}