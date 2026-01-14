import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SceneManager } from '../engine/SceneManager';

export const CanvasContainer = forwardRef(({ onSelectionChange }, ref) => {
    const canvasRef = useRef(null);
    const sceneManagerRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getSceneManager: () => sceneManagerRef.current
    }));

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Engine
        sceneManagerRef.current = new SceneManager(canvasRef.current, onSelectionChange);

        // Cleanup
        return () => {
            if (sceneManagerRef.current) {
                sceneManagerRef.current.dispose();
            }
        };
    }, []); // Empty dependency array = mount once

    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
    );
});
