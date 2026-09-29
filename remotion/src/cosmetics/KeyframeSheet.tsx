import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../brand";
import { CosmeticsKeyframes } from "./Keyframes";

const TILES = [
  "1 · 0:01.5 · intro", "2 · 0:04 · three mailers", "3 · 0:07 · the cap", "4 · 0:16 · glass",
  "5 · 0:22 · storage", "6 · 0:29 · summary", "7 · 0:33 · final",
];
const TW = 540, TH = 960, LAB = 64, GAP = 16;
export const SHEET = { w: 4 * TW + 5 * GAP, h: 2 * (TH + LAB) + 3 * GAP };

/** All seven key frames on one sheet for review. */
export const KeyframeSheet: React.FC = () => (
  <AbsoluteFill style={{ background: C.white }}>
    {TILES.map((label, i) => {
      const x = GAP + (i % 4) * (TW + GAP), y = GAP + Math.floor(i / 4) * (TH + LAB + GAP);
      return (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: TW, height: TH + LAB }}>
          <div style={{ height: LAB, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontWeight: 500, fontSize: 26, color: C.ink }}>{label}</div>
          <div style={{ position: "relative", width: TW, height: TH, overflow: "hidden", border: `2px solid ${C.grey}` }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: "scale(0.5)", transformOrigin: "0 0" }}>
              <CosmeticsKeyframes scene={i + 1} />
            </div>
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);
