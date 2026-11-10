'use client';

import { useEffect, useRef } from 'react';
import { mountImpactoAnimation } from './impacto-animations.mjs';

// Use type="street" ou type="payment", abaixo do título do painel.
export default function ImpactoAnimation({ type = 'street', paused = false }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const animation = mountImpactoAnimation(canvasRef.current, type);
    animationRef.current = animation;
    return () => {
      animation.destroy();
      animationRef.current = null;
    };
  }, [type]);

  useEffect(() => {
    if (paused) animationRef.current?.pause();
    else animationRef.current?.play();
  }, [paused, type]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block', width: '100%', height: 100, background: '#fff' }} />;
}
