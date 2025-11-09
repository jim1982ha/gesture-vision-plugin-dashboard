/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/hooks/use-dashboard-interaction.tsx */
import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { GESTURE_EVENTS, normalizeNameForMtx } from '#shared/index.js';

const SMOOTHING_FACTOR = 0.4;
const CALIBRATION_RESET_DELAY = 1500;
const CALIBRATION_MARGIN = 0.05;
const MIN_CALIBRATION_RANGE = 0.1;

interface RenderData {
    handGestureResults?: { 
        gestures?: { categoryName?: string }[][];
        landmarks?: { x: number; y: number }[][];
    };
    customActionableGestures?: { categoryName?: string; score?: number }[];
}

export const useDashboardInteraction = (pointerGestureName: string, isEnabled: boolean) => {
    const context = useContext(AppContext);
    const cursorRef = useRef<HTMLDivElement>(null);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const visualPosRef = useRef({ x: -100, y: -100 });
    const targetPosRef = useRef({ x: -100, y: -100 });
    
    const calibrationBounds = useRef({ minX: 1.0, maxX: 0.0, minY: 1.0, maxY: 0.0 });
    const calibrationResetTimer = useRef<number | null>(null);
    
    const resetCalibration = useCallback(() => {
        calibrationBounds.current = { minX: 1.0, maxX: 0.0, minY: 1.0, maxY: 0.0 };
    }, []);

    const handleLandmarks = useCallback((data: unknown) => {
        const renderData = data as RenderData;
        if (!isEnabled || !context) return;

        const { cameraService } = context.services;
        const rootElement = document.getElementById('dashboard-plugin-root');
        const contentWrapperElement = rootElement?.querySelector('#dashboard-content-panel');
        if (!contentWrapperElement) return;

        const isMirrored = cameraService!.getCameraManager().isMirrored();
        const pointerGestureKey = normalizeNameForMtx(pointerGestureName);
        const builtInGestures = renderData?.handGestureResults?.gestures?.[0] || [];
        const customGestures = renderData?.customActionableGestures || [];
        const allDetectedGestures = [...builtInGestures, ...customGestures];
        const isPointerActive = allDetectedGestures.some(g => g.categoryName && normalizeNameForMtx(g.categoryName) === pointerGestureKey);
        const fingertip = renderData?.handGestureResults?.landmarks?.[0]?.[8];

        if (isPointerActive && fingertip) {
            if (calibrationResetTimer.current) clearTimeout(calibrationResetTimer.current);
            const bounds = calibrationBounds.current;

            bounds.minX = Math.min(bounds.minX, fingertip.x + CALIBRATION_MARGIN);
            bounds.maxX = Math.max(bounds.maxX, fingertip.x - CALIBRATION_MARGIN);
            bounds.minY = Math.min(bounds.minY, fingertip.y + CALIBRATION_MARGIN);
            bounds.maxY = Math.max(bounds.maxY, fingertip.y - CALIBRATION_MARGIN);

            const rangeX = Math.max(MIN_CALIBRATION_RANGE, bounds.maxX - bounds.minX);
            const rangeY = Math.max(MIN_CALIBRATION_RANGE, bounds.maxY - bounds.minY);
            
            const normalizedCalibratedX = Math.max(0, Math.min(1, (fingertip.x - bounds.minX) / rangeX));
            const normalizedCalibratedY = Math.max(0, Math.min(1, (fingertip.y - bounds.minY) / rangeY));

            calibrationResetTimer.current = window.setTimeout(resetCalibration, CALIBRATION_RESET_DELAY);
            cursorRef.current?.classList.add('visible');
            const containerRect = contentWrapperElement.getBoundingClientRect();

            targetPosRef.current.x = containerRect.left + (isMirrored ? (1 - normalizedCalibratedX) : normalizedCalibratedX) * containerRect.width;
            targetPosRef.current.y = containerRect.top + normalizedCalibratedY * containerRect.height;
        } else {
            cursorRef.current?.classList.remove('visible');
            setHoveredCard(null);
        }
    }, [isEnabled, pointerGestureName, context, resetCalibration]);

    useEffect(() => {
        if (!isEnabled || !context) return;
        const { pubsub } = context.services;
        let animationFrameId: number;

        const animationLoop = () => {
            animationFrameId = requestAnimationFrame(animationLoop);
            if (!cursorRef.current) return;
            
            visualPosRef.current.x += (targetPosRef.current.x - visualPosRef.current.x) * SMOOTHING_FACTOR;
            visualPosRef.current.y += (targetPosRef.current.y - visualPosRef.current.y) * SMOOTHING_FACTOR;
            
            const cursorX = visualPosRef.current.x;
            const cursorY = visualPosRef.current.y;
            
            cursorRef.current.style.left = `${cursorX}px`;
            cursorRef.current.style.top = `${cursorY}px`;
            
            let currentTarget: string | null = null;
            if (cursorRef.current.classList.contains('visible')) {
                const elements = document.elementsFromPoint(cursorX, cursorY);
                const card = elements.find(el => el.matches('.card-item:not(.config-item-disabled)')) as HTMLElement | undefined;
                currentTarget = card?.dataset.gestureName || null;
            }
            
            setHoveredCard(prev => (prev !== currentTarget ? currentTarget : prev));
        };

        const unsub = pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, handleLandmarks);
        animationFrameId = requestAnimationFrame(animationLoop);

        return () => {
            unsub();
            cancelAnimationFrame(animationFrameId);
            if (calibrationResetTimer.current) clearTimeout(calibrationResetTimer.current);
        };
    }, [isEnabled, context, handleLandmarks]);
    
    const cursorElement = <div ref={cursorRef} id="dashboard-cursor"></div>;
    
    return { cursorElement, hoveredCard };
};