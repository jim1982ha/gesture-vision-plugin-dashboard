/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/index.js */
import { DashboardManager } from './dashboard-manager.js';

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
    dashboardToggleButton.className = 'btn btn-secondary';
    
    const iconSpan = document.createElement('span');
    setIcon(iconSpan, manifest.icon.name);

    const textSpan = document.createElement('span');
    textSpan.className = 'dashboard-button-text';

    const updateButtonTranslations = () => {
      dashboardToggleButton.title = translate("dashboardMode");
      textSpan.textContent = translate("dashboardMode");
    };

    updateButtonTranslations();

    dashboardToggleButton.appendChild(iconSpan);
    dashboardToggleButton.appendChild(textSpan);

    dashboardManagerInstance = new DashboardManager(context);
    dashboardManagerInstance.initialize();

    // FIX: Use event delegation to handle clicks on both original and cloned buttons.
    // The listener is attached to the body and checks if the click came from our button.
    handleDashboardButtonClick = (event) => {
      if (event.target.closest('#dashboard-mode-toggle-btn')) {
        dashboardManagerInstance.toggleDashboard();
      }
    };
    document.body.addEventListener('click', handleDashboardButtonClick);
    
    pluginUIService.registerContribution('header-controls', dashboardToggleButton, manifest.id);
    
    context.services.pubsub.subscribe('DASHBOARD_MODE_CHANGED', (isActive) => {
        // This needs to update both buttons, so we query for all matches.
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
    
    // Cleanup both original and cloned buttons
    document.querySelectorAll('#dashboard-mode-toggle-btn').forEach(btn => btn.remove());

    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    
    // FIX: Remove the global event listener to prevent memory leaks.
    if (handleDashboardButtonClick) {
      document.body.removeEventListener('click', handleDashboardButtonClick);
      handleDashboardButtonClick = null;
    }
  }
};

export default dashboardPlugin;