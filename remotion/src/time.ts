import { createContext, useContext } from "react";

/** Global time in seconds. Shared elements live across scenes, so every
 *  component reads the composition clock rather than its Sequence-local one. */
export const TimeContext = createContext(0);
export const useT = () => useContext(TimeContext);

/** Scene windows (seconds). Scenes mount only inside their window. */
export const SCENES = {
  hook: [0, 4.2],
  polybag: [3.9, 12.2],
  mailer: [11.5, 20.0],
  box: [20.0, 27.0],
  recap: [26.4, 33.4],
  question: [32.9, 34.7],
  logo: [34.2, 36.0],
} as const;

/** The deliberate half-second of stillness before the recap (script). */
export const PAUSE: [number, number] = [27.0, 27.5];
export const inPause = (t: number) => t >= PAUSE[0] && t < PAUSE[1];
