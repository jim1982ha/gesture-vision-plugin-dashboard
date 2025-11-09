/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-camera-selector.tsx */
import { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { CAMERA_SOURCE_EVENTS } from '#shared/index.js';
import { DashboardSelector } from './ui/DashboardSelector.js';

export const DashboardCameraSelector = () => {
    // All hooks must be called unconditionally at the top level of the component.
    const context = useContext(AppContext);
    const isWebcamRunning = useAppStore(state => state.isWebcamRunning);
    const [deviceMap, setDeviceMap] = useState<Map<string, string>>(new Map());
    const options = useMemo(() => Array.from(deviceMap, ([id, label]) => ({ id, label })), [deviceMap]);
    
    useEffect(() => {
        // Guard against null context *inside* the effect, not before it.
        if (!context) return;
        
        const { cameraService, pubsub } = context.services;
        const updateMap = (map: unknown) => setDeviceMap(new Map(map as Map<string, string>));
        const unsubscribe = pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, updateMap);
        
        // This can safely be called even if cameraService is null on the first tick.
        cameraService?.getCameraManager().getCameraSourceManager().refreshDeviceList();
        
        return () => unsubscribe();
    }, [context]);

    // Guard clauses and other logic must come *after* all hook calls.
    if (!context) return null;

    const { cameraService, translationService } = context.services;
    const { translate } = translationService;

    const activeSourceId = isWebcamRunning ? cameraService!.getCameraManager().getCurrentDeviceId() : null;
    const activeLabel = activeSourceId ? deviceMap.get(activeSourceId) || 'Unknown' : translate('noStreamActive');

    const handleSelect = (id: string) => {
        cameraService!.startStream({ cameraId: id }).catch(e => console.error(e));
    };


    return (
        <DashboardSelector
            id="dashboard-camera-selector"
            triggerIcon="UI_VIDEOCAM"
            activeLabel={activeLabel}
            activeId={activeSourceId}
            options={options}
            onSelect={handleSelect}
        />
    );
};