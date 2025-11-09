/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/pointer-gesture-selector.tsx */
import React, { useContext, useMemo } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { useAppStore } from '#frontend/hooks/useAppStore.js';
import { BUILT_IN_HAND_GESTURES } from '#shared/index.js';
import { formatGestureNameForDisplay } from '#frontend/ui/helpers/ui-helpers.js';
import { DashboardSelector } from './ui/DashboardSelector.js';

interface PointerGestureSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export const PointerGestureSelector: React.FC<PointerGestureSelectorProps> = ({ value, onChange }) => {
    const context = useContext(AppContext);
    const { customGestureMetadataList, enableBuiltInHandGestures, enableCustomHandGestures } = useAppStore(state => ({
        customGestureMetadataList: state.customGestureMetadataList,
        enableBuiltInHandGestures: state.enableBuiltInHandGestures,
        enableCustomHandGestures: state.enableCustomHandGestures,
    }));
    
    // FIX: All hooks must be called unconditionally before any early returns.
    const availableGestures = useMemo(() => {
        const gestures: string[] = [];
        if (enableBuiltInHandGestures) gestures.push(...BUILT_IN_HAND_GESTURES.filter(g => g !== 'NONE'));
        if (enableCustomHandGestures) gestures.push(...customGestureMetadataList.filter(g => g.type !== 'pose').map(g => g.name));
        return [...new Set(gestures)];
    }, [enableBuiltInHandGestures, enableCustomHandGestures, customGestureMetadataList]);
    
    // This hook depends on translate, which comes from context. It's safe as long as
    // the early return for context is below it.
    const options = useMemo(() => {
        if (!context) return [];
        const { translate } = context.services.translationService;
        return availableGestures.map(name => ({
            id: name,
            label: translate(formatGestureNameForDisplay(name), { defaultValue: formatGestureNameForDisplay(name) })
        }));
    }, [availableGestures, context]);
    
    if (!context) return null;

    const { translate } = context.services.translationService;
    const activeLabel = translate(formatGestureNameForDisplay(value), {defaultValue: formatGestureNameForDisplay(value)});

    return (
        <DashboardSelector
            id="dashboard-pointer-gesture-selector"
            triggerIcon="ads_click"
            activeLabel={activeLabel}
            activeId={value}
            options={options}
            onSelect={onChange}
        />
    );
};