/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/generic-button-widget.js */
import { BaseWidget } from './base-widget.js';

export class GenericButtonWidget extends BaseWidget {
    render() {
        const { uiComponents, pluginUIService, services } = this.getContext();
        
        const iconElement = document.createElement('span');
        iconElement.className = 'widget-icon';
        
        const manifest = pluginUIService.getPluginManifest(this.config.actionConfig.pluginId);
        uiComponents.setIcon(iconElement, manifest?.icon?.name || 'send'); 
        
        const labelElement = document.createElement('span');
        labelElement.className = 'widget-label';
        
        const translatedPluginName = manifest ? services.translate(manifest.nameKey, { defaultValue: manifest.id }) : this.config.actionConfig.pluginId;
        labelElement.textContent = this.config.label || translatedPluginName.replace('gesture-vision-plugin-', '');

        this.element.prepend(iconElement, labelElement, this.detailsContainer);
        
        super.render();
        return this.element;
    }

    updateConfig(newConfig) {
        super.updateConfig(newConfig);
    }
}