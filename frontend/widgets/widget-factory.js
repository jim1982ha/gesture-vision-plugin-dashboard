/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/widget-factory.js */
import { HomeAssistantToggleWidget } from './home-assistant-widget.js';
import { GenericButtonWidget } from './generic-button-widget.js';

export class WidgetFactory {
    static createWidget(config, grid) {
        const pluginId = config.actionConfig?.pluginId;

        switch(pluginId) {
            // Specialized widgets have their own case.
            case 'gesture-vision-plugin-home-assistant':
                return new HomeAssistantToggleWidget(config, grid);
            
            // The default case now handles the webhook plugin and any other action plugin generically.
            default:
                if (!pluginId || pluginId === 'none') {
                    console.warn(`[WidgetFactory] Attempted to create widget with no pluginId.`, config);
                    return null; 
                }
                // This will correctly create a widget for Webhook, OS Command, Presenter, etc.
                // using their respective manifest icons and names.
                return new GenericButtonWidget(config, grid);
        }
    }
}