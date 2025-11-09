/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/DashboardCard.tsx */
import { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { getGestureDisplayInfo, setIcon, clsx } from '#frontend/ui/helpers/ui-helpers.js';
import type { GestureConfig, PoseConfig } from '#shared/index.js';
import { CardRoot, CardHeader, CardIcon, CardTitle, CardDetails, CardDetailLine, CardFooter } from '#frontend/components/shared/cards/Card.js';

interface DashboardCardProps {
    config: GestureConfig | PoseConfig;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ config }) => {
    const context = useContext(AppContext);
    const { translate } = context!.services.translationService;
    const { pluginUIService } = context!.services;
    const { customGestureMetadataList, pluginManifests } = useAppStore(state => ({
        customGestureMetadataList: state.customGestureMetadataList,
        pluginManifests: state.pluginManifests,
    }));
    
    if (!context) return null;

    const gestureName = 'gesture' in config ? config.gesture : config.pose;
    const { formattedName, iconDetails } = getGestureDisplayInfo(gestureName, customGestureMetadataList);
    const pluginId = config.actionConfig?.pluginId;
    const manifest = pluginId ? pluginManifests.find(m => m.id === pluginId) : null;
    const cardTitle = manifest ? translate(manifest.nameKey, { defaultValue: manifest.id }) : translate('actionTypeNone');
    
    const actionConfig = config.actionConfig;
    let detailsContent: React.ReactNode = (
        <CardDetailLine id={`dashboard-card-detail-none-${gestureName}`}>
            {translate('actionTypeNone')}
        </CardDetailLine>
    );

    if (actionConfig?.pluginId && actionConfig.pluginId !== 'none') {
        const renderer = pluginUIService.getActionDisplayDetailsRenderer(actionConfig.pluginId);
        if (renderer) {
            const details = renderer(actionConfig.settings, pluginUIService.getPluginUIContext(actionConfig.pluginId));
            detailsContent = details.map((d, i) => (
                <CardDetailLine key={i} id={`dashboard-card-detail-${i}-${gestureName}`} iconKey={d.icon}>
                    {d.value}
                </CardDetailLine>
            ));
        }
    }
    
    return (
        <CardRoot id={`dashboard-card-${gestureName}`} data-gesture-name={gestureName}>
            <CardHeader id={`dashboard-card-header-${gestureName}`}>
                <CardIcon id={`dashboard-card-icon-${gestureName}`} iconKey={manifest?.icon?.name || 'UI_ACTION'} />
                <CardTitle id={`dashboard-card-title-${gestureName}`}>{cardTitle}</CardTitle>
            </CardHeader>
            <CardDetails id={`dashboard-card-details-${gestureName}`}>
                {detailsContent}
            </CardDetails>
            <CardFooter
                id={`dashboard-card-footer-${gestureName}`}
                leftContent={
                    <>
                        <span ref={el => el && setIcon(el, iconDetails.iconName)} className={clsx('card-detail-icon', iconDetails.iconType)}></span>
                        <span id={`dashboard-card-gesture-name-${gestureName}`} className="truncate">{translate(formattedName, { defaultValue: formattedName })}</span>
                    </>
                }
            />
        </CardRoot>
    );
};