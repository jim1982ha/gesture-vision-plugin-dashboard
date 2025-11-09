/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/DashboardComponents.tsx */
import React, { useContext } from 'react';
import { Dashboard } from './Dashboard.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { AppContext } from '#frontend/contexts/AppContext.js';

export function DashboardHeaderButton() {
  const context = useContext(AppContext);
  const { toggleDashboard, isDashboardActive } = useAppStore(state => ({
    toggleDashboard: state.actions.toggleDashboard,
    isDashboardActive: state.isDashboardActive,
  }));

  if (!context) return null;
  const { translate } = context.services.translationService;

  return (
    <button
      id="dashboard-mode-toggle-btn"
      className={`btn btn-secondary px-2 desktop:px-4 ${isDashboardActive ? 'active' : ''}`}
      title={translate("dashboardMode")}
      onClick={() => toggleDashboard()}
    >
      <span ref={el => el && setIcon(el, "dashboard")}></span>
      <span className="hidden desktop:inline">{translate("dashboardMode")}</span>
    </button>
  );
};

export function DashboardSlotComponent() {
    const context = useContext(AppContext);
    const isDashboardActive = useAppStore(state => state.isDashboardActive);
    if (!context) return null;
    return isDashboardActive ? <Dashboard context={context} /> : null;
};