/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/stateful-button-widget.js */
import { BaseWidget } from './base-widget.js';

/**
 * A specialized widget that subscribes to generic plugin data updates
 * and changes its appearance based on an entity's state (e.g., on/off).
 * It determines which plugin's data to listen to based on its own actionConfig.
 */
export class StatefulButtonWidget extends BaseWidget {
    #iconElement;
    #labelElement;
    #statusElement;
    #unsubscribePubsub;
    
    constructor(config, grid) {
        super(config, grid);
        this.unsubscribeStore = this.getAppStore().subscribe(
            (state) => state.pluginExtDataCache.get(this.config.actionConfig.pluginId),
            () => this.updateStatus(),
            { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
        );
        
        const { pubsub } = this.getContext().services;
        this.#unsubscribePubsub = pubsub.subscribe('PLUGIN_EXT_DATA_UPDATED', (pluginId) => {
            if (pluginId === this.config.actionConfig.pluginId) {
                this.updateStatus();
            }
        });
    }

    async render() {
        this.#iconElement = document.createElement('span');
        this.#iconElement.className = 'widget-icon';
        
        this.#labelElement = document.createElement('span');
        this.#labelElement.className = 'widget-label';
        this.#labelElement.textContent = this.config.label || this.config.actionConfig.settings.entityId;

        this.#statusElement = document.createElement('span');
        this.#statusElement.className = 'widget-status';
        
        // Wait for the base class to populate the details container asynchronously
        await super.render();
        
        // Now, append all elements in the correct order
        this.element.prepend(this.#iconElement, this.#labelElement, this.detailsContainer);
        this.element.appendChild(this.#statusElement);
        
        this.updateStatus();
        
        this.element.classList.add('widget-added');
        setTimeout(() => this.element.classList.remove('widget-added'), 500);

        return this.element;
    }

    updateConfig(newConfig) {
        super.updateConfig(newConfig);
        this.updateStatus(); 
    }

    updateStatus() {
        const { uiComponents, pluginUIService } = this.getContext();
        const { translate } = this.getContext().services;
        const { pluginId, settings } = this.config.actionConfig;
        const pluginCache = this.getAppStore().getState().pluginExtDataCache.get(pluginId);
        
        if (!this.#statusElement || !this.#iconElement) return;

        if (!pluginCache || !Array.isArray(pluginCache.entities)) {
            this.#statusElement.textContent = translate('haDataFetchFailed', { message: 'N/A' });
            return;
        }

        const entityId = settings.entityId;
        const entity = pluginCache.entities.find(e => e.entity_id === entityId);

        if (entity) {
            const domain = entity.entity_id.split('.')[0];
            const isActive = ['on', 'open', 'playing'].includes(entity.state);
            
            this.element.classList.toggle('active-state', isActive);

            let iconName = 'toggle_on'; // Generic default
            if (domain.includes('light')) iconName = isActive ? 'lightbulb' : 'lightbulb_outline';
            if (domain.includes('switch')) iconName = isActive ? 'toggle_on' : 'toggle_off';
            if (domain.includes('fan')) iconName = isActive ? 'mdi-fan' : 'mdi-fan-off';
            if (domain.includes('media_player')) iconName = isActive ? 'volume_up' : 'volume_off';
            if (domain.includes('cover')) iconName = isActive ? 'arrow_upward' : 'arrow_downward';

            uiComponents.setIcon(this.#iconElement, iconName);
            this.#statusElement.textContent = entity.state;
        } else {
            const manifest = pluginUIService.getPluginManifest(pluginId);
            const pluginName = manifest ? translate(manifest.nameKey, { defaultValue: pluginId }) : pluginId;
            uiComponents.setIcon(this.#iconElement, 'UI_HELP');
            this.#statusElement.textContent = `${pluginName}: ${translate('entityNotFound') || 'Entity Not Found'}`;
        }
    }

    destroy() {
        super.destroy(); 
        if (this.#unsubscribePubsub) {
            this.#unsubscribePubsub();
        }
    }
}