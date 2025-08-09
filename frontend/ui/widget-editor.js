/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/widget-editor.js */
export class WidgetEditor {
    #context;
    #modalElement;
    #resolvePromise;
    
    #actionPluginUIManager;
    #labelInput;
    #sizeSelect;

    constructor(context) {
        this.#context = context;
    }

    async open(existingConfig = null) {
        if (!this.#modalElement) {
            await this.#createModal();
        }

        this.#populateForm(existingConfig);
        this.#modalElement.classList.remove('hidden');
        this.#modalElement.classList.add('visible');
        this.#context.services.pubsub.publish('ui:modalVisibilityChanged', { modalId: 'widget-editor', isVisible: true });
        document.body.classList.add('modal-open');

        return new Promise((resolve) => {
            this.#resolvePromise = resolve;
        });
    }

    async #createModal() {
        const { services, uiComponents } = this.#context;
        const response = await fetch('/api/plugins/assets/gesture-vision-plugin-dashboard/frontend/ui/widget-editor.html');
        let html = await response.text();

        html = html.replace(/\{\{([\w\s-]+)}}/g, (_match, key) => {
            return services.translate(key, { defaultValue: key });
        });

        const container = document.createElement('div');
        container.innerHTML = html;
        this.#modalElement = container.firstElementChild;
        document.body.appendChild(this.#modalElement);
        
        this.#labelInput = this.#modalElement.querySelector('#widget-label-input');
        this.#sizeSelect = this.#modalElement.querySelector('#widget-size-select');
        
        const actionTypeSelect = this.#modalElement.querySelector('#widget-action-type-select');

        this.#actionPluginUIManager = new uiComponents.ActionPluginUIManager(
            actionTypeSelect,
            this.#modalElement.querySelector('#widget-action-fields-container'),
            this.#context.uiController,
            () => {}
        );
        
        actionTypeSelect.addEventListener('change', (e) => this.#actionPluginUIManager.handleActionTypeChange(e));

        this.#modalElement.querySelector('#widget-editor-save-btn').addEventListener('click', () => this.#handleSave());
        this.#modalElement.querySelector('#widget-editor-cancel-btn').addEventListener('click', () => this.#handleCancel());
        this.#modalElement.querySelector('#widget-editor-close-btn').addEventListener('click', () => this.#handleCancel());
    }

    #populateForm(config) {
        this.#actionPluginUIManager.populateActionTypeSelect();
        
        if (config) {
            this.#labelInput.value = config.label || '';
            this.#sizeSelect.value = config.size || '1x1';
            this.#actionPluginUIManager.loadPluginUI(config.actionConfig?.pluginId, config.actionConfig?.settings);
        } else {
            this.#labelInput.value = '';
            this.#sizeSelect.value = '1x1';
            this.#actionPluginUIManager.loadPluginUI(null, null);
        }
    }

    #handleSave() {
        const actionData = this.#actionPluginUIManager.getSettingsToSave();
        if (!actionData) {
            this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'actionConfigRequiredForWidget' });
            return;
        }

        const config = {
            label: this.#labelInput.value.trim(),
            size: this.#sizeSelect.value,
            actionConfig: {
                pluginId: actionData.pluginId,
                settings: actionData.settings
            }
        };

        this.close();
        this.#resolvePromise(config);
    }

    #handleCancel() {
        this.close();
        this.#resolvePromise(null);
    }

    close() {
        if (!this.#modalElement) return;
        this.#modalElement.classList.add('hidden');
        this.#modalElement.classList.remove('visible');
        this.#context.services.pubsub.publish('ui:modalVisibilityChanged', { modalId: 'widget-editor', isVisible: false });
        document.body.classList.remove('modal-open');
    }
}