/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/index.js */
import { DashboardManager } from './dashboard-manager.js';

// Ensure the global registry exists
if (!window.GestureVisionPlugins) {
  window.GestureVisionPlugins = {};
}

let dashboardManagerInstance = null;
let unsubscribeStore = null;
let handleDashboardButtonClick = null; // To hold the event handler for proper removal

const dashboardPlugin = {
  async init(context) {
    const { pluginUIService, uiComponents, services, manifest, coreStateManager: appStore } = context;
    const { setIcon } = uiComponents;
    const { translate } = services;

    const dashboardToggleButton = document.createElement('button');
    dashboardToggleButton.id = 'dashboard-mode-toggle-btn';
    dashboardToggleButton.className = 'btn btn-secondary px-2 desktop:px-4';
    
    const iconSpan = document.createElement('span');
    setIcon(iconSpan, manifest.icon.name);

    const textSpan = document.createElement('span');
    textSpan.className = 'dashboard-button-text hidden desktop:inline';

    dashboardToggleButton.title = translate("dashboardMode");
    textSpan.textContent = translate("dashboardMode");
    
    dashboardToggleButton.appendChild(iconSpan);
    dashboardToggleButton.appendChild(textSpan);

    const updateButtonTranslations = () => {
      const buttonInDom = document.getElementById('dashboard-mode-toggle-btn');
      if (!buttonInDom) return;
      
      const textSpanInDom = buttonInDom.querySelector('.dashboard-button-text');

      buttonInDom.title = translate("dashboardMode");
      if (textSpanInDom) {
        textSpanInDom.textContent = translate("dashboardMode");
      }
    };

    dashboardManagerInstance = new DashboardManager(context);
    dashboardManagerInstance.initialize();

    handleDashboardButtonClick = (event) => {
      if (event.target.closest('#dashboard-mode-toggle-btn')) {
        dashboardManagerInstance.toggleDashboard();
      }
    };
    document.body.addEventListener('click', handleDashboardButtonClick);
    
    pluginUIService.registerContribution('header-controls', dashboardToggleButton, manifest.id);
    
    context.services.pubsub.subscribe('DASHBOARD_MODE_CHANGED', (isActive) => {
        document.querySelectorAll('#dashboard-mode-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', isActive);
        });
    });

    unsubscribeStore = appStore.subscribe((state, prevState) => {
      if (state.languagePreference !== prevState.languagePreference) {
        updateButtonTranslations();
      }
    });
  },

  destroy() {
    if (dashboardManagerInstance) {
      dashboardManagerInstance.destroy();
      dashboardManagerInstance = null;
    }
    
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    
    if (handleDashboardButtonClick) {
      document.body.removeEventListener('click', handleDashboardButtonClick);
      handleDashboardButtonClick = null;
    }
  }
};

// Register the module with the global registry
window.GestureVisionPlugins['gesture-vision-plugin-dashboard'] = dashboardPlugin;

export default dashboardPlugin;