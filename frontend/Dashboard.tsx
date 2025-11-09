/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/Dashboard.tsx */
import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { type AppContextType } from '#frontend/types/index.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { type GestureConfig, type PoseConfig, GESTURE_EVENTS, type CustomGestureMetadata, normalizeNameForMtx, type ActionDisplayDetail } from '#shared/index.js';
import { DashboardToolbar } from './ui/DashboardToolbar.js';
import { DashboardCard } from './ui/DashboardCard.js';
import { useDashboardInteraction } from './hooks/use-dashboard-interaction.js';
import { useDashboardLifecycle } from './hooks/useDashboardLifecycle.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';
import { AppContext } from '#frontend/contexts/AppContext.js';

const CARD_SIZE_STORAGE_KEY = 'gv-dashboard-card-size';
const POINTER_GESTURE_STORAGE_KEY = 'gv-dashboard-pointer-gesture';
const DWELL_TIME_MS = 1000;

export const Dashboard = ({ context }: { context: AppContextType }) => {
    const coreContext = useContext(AppContext);
    const { actions, gestureConfigs, customGestureMetadataList, pluginManifests } = useAppStore(state => ({
        actions: state.actions,
        gestureConfigs: state.gestureConfigs,
        customGestureMetadataList: state.customGestureMetadataList,
        pluginManifests: state.pluginManifests,
    }));
    
    const { translate } = context.services.translationService;
    const dwellTimeoutRef = useRef<number | null>(null);
    const dwellIntervalRef = useRef<number | null>(null);
    
    const latestStateRef = useRef({ gestureConfigs, customGestureMetadataList, actions, coreContext, pluginManifests });
    useEffect(() => {
        latestStateRef.current = { gestureConfigs, customGestureMetadataList, actions, coreContext, pluginManifests };
    }, [gestureConfigs, customGestureMetadataList, actions, coreContext, pluginManifests]);

    const [cardSize, setCardSize] = useState(() => localStorage.getItem(CARD_SIZE_STORAGE_KEY) || 'medium');
    const [pointerGesture, setPointerGesture] = useState(() => localStorage.getItem(POINTER_GESTURE_STORAGE_KEY) || 'POINTING_UP');
    
    useEffect(() => {
        localStorage.setItem(POINTER_GESTURE_STORAGE_KEY, pointerGesture);
    }, [pointerGesture]);
    
    useDashboardLifecycle(context);
    const { cursorElement, hoveredCard } = useDashboardInteraction(pointerGesture, true);
    
    const filteredConfigs = useMemo(() => {
        const normalizedPointer = normalizeNameForMtx(pointerGesture);
        return gestureConfigs.filter((c: GestureConfig | PoseConfig) => {
            const configGestureName = 'gesture' in c ? c.gesture : c.pose;
            return normalizeNameForMtx(configGestureName) !== normalizedPointer;
        });
    }, [gestureConfigs, pointerGesture]);

    useEffect(() => {
        if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
        if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);

        const cursor = document.getElementById('dashboard-cursor');
        const rootElement = document.getElementById('dashboard-plugin-root');
        const hudElement = document.getElementById('dashboard-hud');
        
        if (hoveredCard && cursor && hudElement) {
            cursor.classList.add('dwelling');
            rootElement?.classList.add('is-hovering');

            const { gestureConfigs: currentConfigs, pluginManifests: currentManifests, coreContext: latestCoreContext } = latestStateRef.current;
            const config = currentConfigs.find(c => ('gesture' in c ? c.gesture : c.pose) === hoveredCard);
            const manifest = config?.actionConfig ? currentManifests.find(m => m.id === config.actionConfig?.pluginId) : null;
            const actionName = manifest ? translate(manifest.nameKey, { defaultValue: manifest.id }) : translate('actionTypeNone');

            let detailsText = '';
            if (config?.actionConfig && latestCoreContext) {
                const renderer = latestCoreContext.services.pluginUIService!.getActionDisplayDetailsRenderer(config.actionConfig.pluginId);
                if (renderer) {
                    const details: ActionDisplayDetail[] = renderer(config.actionConfig.settings, latestCoreContext.services.pluginUIService!.getPluginUIContext(config.actionConfig.pluginId));
                    detailsText = details.map(d => d.value).join('\n');
                }
            }
            
            hudElement.setAttribute('data-action-name', actionName);
            hudElement.setAttribute('data-action-details', detailsText);
            
            const startTime = Date.now();
            dwellIntervalRef.current = window.setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, DWELL_TIME_MS - elapsed);
                hudElement.setAttribute('data-timer', `${(remaining / 1000).toFixed(2)}s`);
            }, 50);

            dwellTimeoutRef.current = window.setTimeout(() => {
                const { coreContext: finalCoreContext, customGestureMetadataList: latestCustomMetadata, actions: latestActions } = latestStateRef.current;
                
                if (!finalCoreContext || !config?.actionConfig) return;

                const { webSocketService, pubsub } = finalCoreContext.services;
                const { getGestureDisplayInfo } = finalCoreContext.shared.services.actionDisplayUtils;
                const { category } = getGestureDisplayInfo(hoveredCard, latestCustomMetadata as CustomGestureMetadata[]);
                const actionDetails = { gestureName: hoveredCard, confidence: 1.0, timestamp: Date.now() };

                webSocketService.sendDispatchAction(config, actionDetails);
                pubsub.publish(GESTURE_EVENTS.DETECTED_ALERT, { gesture: hoveredCard, actionType: config.actionConfig.pluginId });
                latestActions.addHistoryEntry({ gesture: hoveredCard, actionType: config.actionConfig.pluginId, gestureCategory: category, details: config.actionConfig });
                
                const cardElement = document.querySelector(`.card-item[data-gesture-name="${CSS.escape(hoveredCard)}"]`);
                cardElement?.classList.add('widget-triggered');
                setTimeout(() => cardElement?.classList.remove('widget-triggered'), 400);

            }, DWELL_TIME_MS);
        } else {
            cursor?.classList.remove('dwelling');
            rootElement?.classList.remove('is-hovering');
        }

        return () => { 
            if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
            if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
        };
    }, [hoveredCard, translate]);

    return (
        <div id="dashboard-plugin-root" className="fixed inset-0 z-modal-overlay backdrop-blur-sm flex items-center justify-center visible opacity-100 transition-opacity duration-300">
            {cursorElement}
            <div id="dashboard-hud" />
            <div id="dashboard-content-panel" className="w-[90vw] h-[85vh] max-w-[1400px] max-h-[900px] rounded-lg shadow-2xl flex flex-col overflow-hidden scale-100 opacity-100 transition duration-300 ease-out relative">
                <DashboardToolbar 
                    cardSize={cardSize} 
                    onCardSizeChange={setCardSize}
                    pointerGesture={pointerGesture}
                    onPointerGestureChange={setPointerGesture}
                />
                <div id="dashboard-card-container" className={`dashboard-card-container overflow-y-auto p-4 grid gap-3 content-start card-size-${cardSize}`}>
                    {filteredConfigs.length > 0 ? (
                        filteredConfigs.map((config: GestureConfig | PoseConfig) => {
                            const gestureName = 'gesture' in config ? config.gesture : config.pose;
                            const stableKey = `${gestureName}-${config.actionConfig?.pluginId || 'none'}`;
                            return <DashboardCard key={stableKey} config={config} />;
                        })
                    ) : (
                        <div id="dashboard-empty-state-container" className="col-span-full flex flex-col items-center justify-center text-center gap-4 p-8">
                            <p className="text-base max-w-sm">{translate('dashboardEmptyMessage')}</p>
                            <button id="dashboard-empty-state-configure-button" onClick={() => actions.toggleSettingsModal(true)} className="btn btn-primary">
                                <span ref={el => el && setIcon(el, 'UI_TUNE')}></span>
                                <span>{translate('dashboardEmptyButton')}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};