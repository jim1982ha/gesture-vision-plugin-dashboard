/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/index.js */
import { DashboardManager } from './dashboard-manager.js';

let dashboardManagerInstance = null;

const dashboardPlugin = {
  async init(context) {
    const { pluginUIService, uiComponents, services, manifest } = context;
    const { setIcon } = uiComponents;
    const { translate } = services;

    const dashboardToggleButton = document.createElement('button');
    dashboardToggleButton.id = 'dashboard-mode-toggle-btn';
    dashboardToggleButton.className = 'btn btn-secondary btn-icon';
    dashboardToggleButton.title = translate("dashboardMode");
    
    const iconSpan = document.createElement('span');
    dashboardToggleButton.appendChild(iconSpan);
    setIcon(iconSpan, manifest.icon.name);

    dashboardManagerInstance = new DashboardManager(context);
    dashboardManagerInstance.initialize();

    dashboardToggleButton.addEventListener('click', () => {
        dashboardManagerInstance.toggleDashboard();
    });
    
    pluginUIService.registerContribution('header-controls', dashboardToggleButton, manifest.id);
    
    context.services.pubsub.subscribe('DASHBOARD_MODE_CHANGED', (isActive) => {
        dashboardToggleButton.classList.toggle('active', isActive);
    });
  },

  destroy() {
    if (dashboardManagerInstance) {
      dashboardManagerInstance.destroy();
      dashboardManagerInstance = null;
    }
    const toggleButton = document.getElementById('dashboard-mode-toggle-btn');
    if (toggleButton) toggleButton.remove();
  }
};

export default dashboardPlugin;