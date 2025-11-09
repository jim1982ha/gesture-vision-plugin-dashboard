/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/index.tsx */
import type { FrontendPluginModule } from '#frontend/types/index.js';
import { DashboardHeaderButton, DashboardSlotComponent } from './DashboardComponents.js';

const dashboardPlugin: FrontendPluginModule = {
  UIComponent: DashboardSlotComponent,
  pluginSlot: 'fullscreen-overlay-slot',
  HeaderComponent: DashboardHeaderButton,
};

export default dashboardPlugin;