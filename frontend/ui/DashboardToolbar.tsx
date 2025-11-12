/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/DashboardToolbar.tsx */
import React, { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { usePubSub } from '#frontend/hooks/usePubSub.js';
import { DashboardCameraSelector } from '../dashboard-camera-selector.js';
import { PointerGestureSelector } from '../pointer-gesture-selector.js';
import { setIcon, clsx } from '#frontend/ui/helpers/ui-helpers.js';
import { pubsub, UI_EVENTS } from '#shared/index.js';

interface DashboardToolbarProps {
    cardSize: string;
    onCardSizeChange: (size: string) => void;
    pointerGesture: string;
    onPointerGestureChange: (gesture: string) => void;
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({ cardSize, onCardSizeChange, pointerGesture, onPointerGestureChange }) => {
    const context = useContext(AppContext);
    const toggleDashboard = useAppStore(state => state.actions.toggleDashboard);
    
    usePubSub(UI_EVENTS.REQUEST_BUTTON_STATE_UPDATE);

    if (!context || !context.services.cameraService) return null;
    const { translate } = context.services.translationService;
    const { cameraService } = context.services;
    const isMirrored = cameraService.isMirrored();

    return (
        <div id="dashboard-toolbar" className="flex-shrink-0 p-2 flex items-center justify-between gap-2">
            <div id="dashboard-toolbar-left" className="flex-1 flex items-center gap-2 min-w-0">
                <DashboardCameraSelector />
                <PointerGestureSelector value={pointerGesture} onChange={onPointerGestureChange} />
            </div>
            <h3 id="dashboard-toolbar-title" className="text-lg font-semibold hidden desktop:block">{translate('dashboardMode')}</h3>
            <div id="dashboard-toolbar-right" className="flex-1 flex items-center justify-end gap-2 min-w-0">
                <button id="dashboard-toolbar-mirror-button" onClick={() => pubsub.publish(UI_EVENTS.REQUEST_MIRROR_TOGGLE)} className={clsx('btn btn-icon', isMirrored && 'active')} title={translate('toggleMirrorView')}>
                    <span ref={el => el && setIcon(el, 'UI_VIDEO_MIRROR')}></span>
                </button>
                <div id="dashboard-size-toggle-group-desktop" className="hidden desktop:flex items-center gap-2">
                    <div className="button-toggle-group">
                        {['small', 'medium', 'large'].map(size => (
                            <button key={size} id={`dashboard-size-toggle-${size}`} onClick={() => onCardSizeChange(size)} className={`btn btn-secondary ${cardSize === size ? 'active' : ''}`} title={translate(`widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}Tooltip`)}>
                                {translate(`widgetSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <button id="dashboard-close-button" onClick={() => toggleDashboard(false)} className="btn btn-icon" title={translate('close')}>
                    <span ref={el => el && setIcon(el, 'UI_CLOSE')}></span>
                </button>
            </div>
        </div>
    );
};