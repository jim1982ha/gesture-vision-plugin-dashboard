/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/widgets/widget-factory.js */
import { StatefulButtonWidget } from './stateful-button-widget.js';
import { GenericButtonWidget } from './generic-button-widget.js';

export class WidgetFactory {
    static createWidget(config, grid) {
        const pluginId = config.actionConfig?.pluginId;
        const settings = config.actionConfig?.settings;

        if (!pluginId || pluginId === 'none') {
            console.warn(`[WidgetFactory] Attempted to create widget with no pluginId.`, config);
            return null;
        }

        // Generic check for any plugin that provides an `entityId`.
        // This makes the factory plugin-agnostic.
        if (settings && typeof settings.entityId === 'string' && settings.entityId) {
            return new StatefulButtonWidget(config, grid);
        }
        
        // Fallback for all other action types.
        return new GenericButtonWidget(config, grid);
    }
}