import { useEffect, useState } from 'react';

interface ViewportState {
  keyboardOpen: boolean;
  height: number;
}

/**
 * Tracks iOS Safari visualViewport height so the bottom composer docks cleanly
 * above the software keyboard without page bounce or occluded input.
 */
export function useVisualViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => ({
    keyboardOpen: false,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      const visualHeight = vv ? vv.height : window.innerHeight;
      const layoutHeight = window.innerHeight;
      // Threshold of 120px avoids false positives from Safari URL bar collapse
      const keyboardOpen = layoutHeight - visualHeight > 120;

      document.documentElement.style.setProperty('--app-height', `${Math.round(visualHeight)}px`);
      setState({
        keyboardOpen,
        height: Math.round(visualHeight),
      });

      // Keep top anchored when iOS tries to scroll the layout viewport
      if (vv && vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    update();
    window.addEventListener('resize', update);
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, []);

  return state;
}
