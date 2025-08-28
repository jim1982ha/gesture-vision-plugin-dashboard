/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/index.js */
import { DashboardManager } from './dashboard-manager.js';

let dashboardManagerInstance = null;
let unsubscribeStore = null;

const dashboardPlugin = {
  async init(context) {
    const { pluginUIService, uiComponents, services, manifest, coreStateManager: appStore } = context;
    const { setIcon } = uiComponents;
    const { translate } = services;

    const dashboardToggleButton = document.createElement('button');
    dashboardToggleButton.id = 'dashboard-mode-toggle-btn';
    dashboardToggleButton.className = 'btn btn-secondary';
    
    const iconSpan = document.createElement('span');
    setIcon(iconSpan, manifest.icon.name);

    const textSpan = document.createElement('span');
    textSpan.className = 'dashboard-button-text';

    // Create a dedicated function to apply translations
    const updateButtonTranslations = () => {
      dashboardToggleButton.title = translate("dashboardMode");
      textSpan.textContent = translate("dashboardMode");
    };

    updateButtonTranslations(); // Set initial text

    dashboardToggleButton.appendChild(iconSpan);
    dashboardToggleButton.appendChild(textSpan);

    dashboardManagerInstance = new DashboardManager(context);
    dashboardManagerInstance.initialize();

    dashboardToggleButton.addEventListener('click', () => {
        dashboardManagerInstance.toggleDashboard();
    });
    
    pluginUIService.registerContribution('header-controls', dashboardToggleButton, manifest.id);
    
    context.services.pubsub.subscribe('DASHBOARD_MODE_CHANGED', (isActive) => {
        dashboardToggleButton.classList.toggle('active', isActive);
    });

    // Subscribe to the app store for language changes
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
    const toggleButton = document.getElementById('dashboard-mode-toggle-btn');
    if (toggleButton) toggleButton.remove();

    // Unsubscribe from the store to prevent memory leaks
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
  }
};

export default dashboardPlugin;