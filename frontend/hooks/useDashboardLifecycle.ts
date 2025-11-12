/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/hooks/useDashboardLifecycle.ts */
import { useEffect } from 'react';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { GESTURE_EVENTS } from '#shared/index.js';
import type { AppContextType } from '#frontend/types/index.js';

/**
 * A custom hook to manage the lifecycle side-effects of the Dashboard component.
 * This includes starting/stopping the camera stream and managing gesture processing overrides.
 */
export const useDashboardLifecycle = (context: AppContextType) => {
    const { actions } = useAppStore(state => ({
        actions: state.actions,
    }));

    useEffect(() => {
        const cameraService = context.services.cameraService;
        const pubsub = context.services.pubsub;

        if (!cameraService) return;

        console.log('[DashboardLifecycle] Dashboard activated.');
        
        const wasStreamActiveInitially = cameraService.isStreamActive();

        if (!wasStreamActiveInitially) {
            const selectedSource = cameraService.getCurrentDeviceId();
            if (!selectedSource || selectedSource.startsWith('rtsp:')) {
                console.log('[DashboardLifecycle] No webcam selected, opening modal.');
                actions.openOverlay('cameraSelect');
            } else {
                console.log(`[DashboardLifecycle] Starting stream for selected source: ${selectedSource}`);
                cameraService.startStream({ cameraId: selectedSource }).catch(console.error);
            }
        }
        
        console.log('[DashboardLifecycle] Requesting processing override and suppressing main app actions.');
        pubsub.publish(GESTURE_EVENTS.REQUEST_PROCESSING_OVERRIDE, { hand: true, pose: false, numHands: 1, builtIn: true, custom: true });
        pubsub.publish(GESTURE_EVENTS.SUPPRESS_ACTIONS);

        return () => {
            console.log('[DashboardLifecycle] Dashboard deactivated. Cleaning up.');
            
            if (context.appStore.getState().activeOverlays.some(o => o.id === 'cameraSelect')) {
                actions.closeCurrentOverlay();
            }
            
            if (!wasStreamActiveInitially && cameraService.isStreamActive()) {
                console.log('[DashboardLifecycle] Stopping camera stream that was started by the dashboard.');
                cameraService.stopStream();
            }
            
            console.log('[DashboardLifecycle] Clearing processing override and resuming main app actions.');
            pubsub.publish(GESTURE_EVENTS.CLEAR_PROCESSING_OVERRIDE);
            pubsub.publish(GESTURE_EVENTS.RESUME_ACTIONS);
        };
    }, [context, actions]);
};