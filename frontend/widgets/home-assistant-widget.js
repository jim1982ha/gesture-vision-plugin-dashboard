/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/home-assistant-widget.js */
import { BaseWidget } from './base-widget.js';

// This is a specialized widget that subscribes to Home Assistant state changes
// and updates its appearance dynamically based on the entity's state (e.g., on/off).
// It correctly inherits from BaseWidget and was not part of the generic widget refactoring.
export class HomeAssistantToggleWidget extends BaseWidget {
    #iconElement;
    #labelElement;
    #statusElement;
    #unsubscribePubsub;
    
    constructor(config, grid) {
        super(config, grid);
        this.unsubscribeStore = this.getAppStore().subscribe(
            (state) => state.pluginExtDataCache.get('gesture-vision-plugin-home-assistant'),
            () => this.updateStatus(),
            { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
        );
        
        const { pubsub } = this.getContext().services;
        this.#unsubscribePubsub = pubsub.subscribe('PLUGIN_EXT_DATA_UPDATED', (pluginId) => {
            if (pluginId === 'gesture-vision-plugin-home-assistant') {
                this.updateStatus();
            }
        });
    }

    render() {
        this.#iconElement = document.createElement('span');
        this.#iconElement.className = 'widget-icon';
        
        this.#labelElement = document.createElement('span');
        this.#labelElement.className = 'widget-label';
        this.#labelElement.textContent = this.config.label || this.config.actionConfig.settings.entityId;

        this.#statusElement = document.createElement('span');
        this.#statusElement.className = 'widget-status';
        
        this.element.prepend(this.#iconElement, this.#labelElement, this.#statusElement);
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
        const { uiComponents } = this.getContext();
        const haCache = this.getAppStore().getState().pluginExtDataCache.get('gesture-vision-plugin-home-assistant');
        
        if (!this.#statusElement) return;

        if (!haCache || !haCache.entities) {
            this.#statusElement.textContent = 'HA Data Unavailable';
            return;
        }

        const entityId = this.config.actionConfig.settings.entityId;
        const entity = haCache.entities.find(e => e.entity_id === entityId);

        if (entity) {
            const domain = entity.entity_id.split('.')[0];
            const isActive = (entity.state === 'on' || entity.state === 'open' || entity.state === 'playing');
            
            this.element.classList.toggle('active-state', isActive);

            let iconName = 'toggle_on';
            if (domain.includes('light')) iconName = isActive ? 'lightbulb' : 'lightbulb_outline';
            if (domain.includes('switch')) iconName = isActive ? 'toggle_on' : 'toggle_off';
            if (domain.includes('fan')) iconName = isActive ? 'mdi-fan' : 'mdi-fan-off';
            if (domain.includes('media_player')) iconName = isActive ? 'volume_up' : 'volume_off';
            if (domain.includes('cover')) iconName = isActive ? 'arrow_upward' : 'arrow_downward';

            uiComponents.setIcon(this.#iconElement, iconName);
            this.#statusElement.textContent = entity.state;
        } else {
            uiComponents.setIcon(this.#iconElement, 'UI_HELP');
            this.#statusElement.textContent = 'Entity Not Found';
        }
    }

    destroy() {
        super.destroy(); 
        if (this.#unsubscribePubsub) {
            this.#unsubscribePubsub();
        }
    }
}