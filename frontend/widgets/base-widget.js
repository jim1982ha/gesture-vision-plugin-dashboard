/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/base-widget.js */
export class BaseWidget {
    id;
    element;
    config;
    grid;
    unsubscribeStore;

    constructor(config, grid) {
        this.id = config.id;
        this.config = config;
        this.grid = grid;
        this.element = this.createBaseElement();
    }

    createBaseElement() {
        const el = document.createElement('div');
        el.className = 'dashboard-widget';
        el.dataset.widgetId = this.id;
        el.style.gridColumn = `span ${this.config.size.split('x')[0] * 2}`;
        el.style.gridRow = `span ${this.config.size.split('x')[1] * 2}`;
        
        const controls = document.createElement('div');
        controls.className = 'widget-edit-controls';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-icon';
        const editIconSpan = document.createElement('span');
        editBtn.appendChild(editIconSpan);
        this.getContext().uiComponents.setIcon(editIconSpan, 'edit');
        editBtn.title = this.getContext().services.translate('editWidget', { defaultValue: 'Edit Widget' });
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.grid.getDashboardManager().editWidget(this.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-icon btn-icon-danger';
        const deleteIconSpan = document.createElement('span');
        deleteBtn.appendChild(deleteIconSpan);
        this.getContext().uiComponents.setIcon(deleteIconSpan, 'UI_DELETE');
        deleteBtn.title = this.getContext().services.translate('deleteWidget', { defaultValue: 'Delete Widget' });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#handleDelete();
        });

        controls.append(editBtn, deleteBtn);
        el.appendChild(controls);

        el.addEventListener('click', (e) => {
            if (this.grid.isEditMode()) {
                e.preventDefault();
            }
        });

        return el;
    }

    #handleDelete() {
        const confirmMgr = this.getContext().uiController._confirmationModalMgr;
        if (confirmMgr) {
            confirmMgr.show({
                titleKey: 'deleteWidget',
                messageKey: 'confirmDeleteWidgetMessage',
                messageSubstitutions: { widgetLabel: this.config.label || this.id },
                confirmTextKey: 'delete',
                onConfirm: () => {
                    this.grid.removeWidget(this.id);
                    this.grid.getDashboardManager().saveLayout();
                }
            });
        } else {
            console.error("ConfirmationModalManager not available.");
        }
    }

    render() {
        return this.element;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.element.style.gridColumn = `span ${this.config.size.split('x')[0] * 2}`;
        this.element.style.gridRow = `span ${this.config.size.split('x')[1] * 2}`;
        
        const controls = this.element.querySelector('.widget-edit-controls');
        this.element.innerHTML = '';
        if (controls) this.element.appendChild(controls);
        
        this.render();
    }

    setEditMode(_isEditing) {
        // Subclasses can override if they need to change appearance in edit mode
    }

    getActionConfig() {
        return this.config.actionConfig;
    }
    
    getConfig() {
        return this.config;
    }
    
    getElement() {
        return this.element;
    }

    getContext() {
        return this.grid.getContext();
    }
    
    getAppStore() {
        return this.getContext().coreStateManager;
    }

    destroy() {
        if (this.unsubscribeStore) this.unsubscribeStore();
        this.element.remove();
    }
}