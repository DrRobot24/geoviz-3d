
import { ThreeElements } from '@react-three/fiber';

/**
 * Fix: Augmenting the React.JSX namespace is the standard approach for React 18+ 
 * to ensure that both HTML elements and Three.js-specific elements (e.g., <mesh />, <ambientLight />) 
 * provided by React Three Fiber are correctly recognized without shadowing each other.
 */
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

export interface ExcavationDimensions {
  length: number;
  width: number;
  depth: number;
}

export interface SurfaceColors {
  bottom: string;
  sides_long: string;
  sides_short: string;
}

export interface SurfaceData {
  id: string;
  label: string;
  area: number;
  color: string;
  dimensions: string;
}
