/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/dashboard-camera-selector.tsx */
import { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { CAMERA_SOURCE_EVENTS } from '#shared/index.js';
import { DashboardSelector } from './ui/DashboardSelector.js';

export const DashboardCameraSelector = () => {
    const context = useContext(AppContext);
    const isWebcamRunning = useAppStore(state => state.isWebcamRunning);
    const [deviceMap, setDeviceMap] = useState<Map<string, string>>(new Map());
    const options = useMemo(() => Array.from(deviceMap, ([id, label]) => ({ id, label })), [deviceMap]);
    
    useEffect(() => {
        if (!context || !context.services.cameraService) return;
        
        const { cameraService, pubsub } = context.services;
        const updateMap = (map: unknown) => setDeviceMap(new Map(map as Map<string, string>));
        const unsubscribe = pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, updateMap);
        
        cameraService.refreshDeviceList();
        
        return () => unsubscribe();
    }, [context]);

    if (!context || !context.services.cameraService) return null;

    const { cameraService, translationService } = context.services;
    const { translate } = translationService;

    const activeSourceId = isWebcamRunning ? cameraService.getCurrentDeviceId() : null;
    const activeLabel = activeSourceId ? deviceMap.get(activeSourceId) || 'Unknown' : translate('noStreamActive');

    const handleSelect = (id: string) => {
        cameraService.startStream({ cameraId: id }).catch(e => console.error(e));
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