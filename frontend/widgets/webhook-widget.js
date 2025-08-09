import { BaseWidget } from './base-widget.js';

export class WebhookButtonWidget extends BaseWidget {
    render() {
        const { uiComponents } = this.getContext();
        
        const iconElement = document.createElement('span');
        iconElement.className = 'widget-icon material-icons';
        const manifest = this.getContext().pluginUIService.getPluginManifest(this.config.actionConfig.pluginId);
        uiComponents.setIcon(iconElement, manifest?.icon?.name || 'webhook');
        
        const labelElement = document.createElement('span');
        labelElement.className = 'widget-label';
        labelElement.textContent = this.config.label || this.config.actionConfig.pluginId.replace('gesture-vision-plugin-', '');

        this.element.prepend(iconElement, labelElement);
        return this.element;
    }
}