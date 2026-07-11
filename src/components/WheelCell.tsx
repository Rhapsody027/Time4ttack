// src/components/WheelCell.tsx
import { useTelemetryStore, type CornerKey, type TelemetryStoreState } from "../useTelemetry";

export function WheelCell({ cornerKey }: { cornerKey: CornerKey }) {
const wheel = useTelemetryStore(
(state: TelemetryStoreState) => state.wheels[cornerKey],
);
const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);
const telemetry = useTelemetryStore(
(state: TelemetryStoreState) => state.telemetry,
);

const isFront = cornerKey === "fl" || cornerKey === "fr";
const steerRotation = isFront ? wheel.steerDegrees : 0;
const isAnyOut = wheel.isRatioOut || wheel.isAngleOut;

const borderColor = isAnyOut ? "#ef4444" : "#1f2937";
const shadow = isAnyOut ? "0 0 16px rgba(239, 68, 68, 0.4)" : "none";

const latG = telemetry?.gForce.lateral ?? 0;
const lngG = telemetry?.gForce.longitudinal ?? 0;

const isRightSide = cornerKey === "fr" || cornerKey === "rr";
const isFrontSide = cornerKey === "fl" || cornerKey === "fr";

let longLoad = 0;
let latLoad = 0;

if (lngG < 0 && isFrontSide) {
longLoad = Math.abs(lngG) * 0.6;
} else if (lngG > 0 && !isFrontSide) {
longLoad = lngG * 0.4;
}

if (latG < 0 && isRightSide) {
latLoad = Math.abs(latG) * 0.6;
} else if (latG > 0 && !isRightSide) {
latLoad = latG * 0.6;
}

const totalDynamicWeight = longLoad + latLoad;
const loadGlow =
totalDynamicWeight > 0.15
? `radial-gradient(circle at center, rgba(239, 68, 68, ${Math.min(totalDynamicWeight * 0.35, 0.45)}) 0%, transparent 85%)`
: "transparent";

const ratioDirection = wheel.slipRatio >= 0 ? "down" : "up";
const angleDirection = wheel.slipAngle <= 0 ? "left" : "right";

const ratioHeightStyle = wheel.isRatioOut ? "75%" : `${(wheel.ratioPercent / 100) * 50}%`;

const isLatGZero = Math.abs(latG) < 0.15;
const angleWidthStyle = wheel.isAngleOut ? "75%" : isLatGZero ? "0%" : `${(wheel.anglePercent / 100) * 50}%`;

return (
// 🚀 核心優化：外層強制套一個 flex justify-center items-center。這樣不論 Grid 單元格怎麼被拉伸，內部的 h-24 w-14 輪胎永遠死死維持在幾何正中心，絕不歪斜！
<div className="flex h-full w-full items-center justify-center">
<div className="relative flex h-32 w-24 items-center justify-center overflow-visible bg-transparent">
<span
className={`absolute ${cornerKey === "fl" ? "top-0 left-0" : cornerKey === "fr" ? "top-0 right-0" : cornerKey === "rl" ? "bottom-0 left-0" : "bottom-0 right-0"} text-[10px] font-mono font-bold tracking-widest text-zinc-500`}
>
{wheel.label}
</span>

<div
className="absolute h-24 w-14 rounded border-solid bg-transparent overflow-visible z-10 transition-all duration-75"
style={{
transform: `rotate(${steerRotation}deg)`,
borderWidth: "2px",
borderColor,
opacity: stale ? 0.45 : 1,
boxShadow: shadow,
background: loadGlow,
}}
>
<div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 opacity-10 pointer-events-none bg-zinc-600" />
{isFront && (
<div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 opacity-10 pointer-events-none bg-zinc-600" />
)}
<div
className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full z-10"
style={{ background: isAnyOut ? "#ef4444" : "#1f2937" }}
/>

<div
className="absolute left-1/2 w-0.75 rounded-full z-20 transition-all duration-75"
style={{
top: "50%",
height: ratioHeightStyle,
background: wheel.isRatioOut ? "#ef4444" : "#9ca3af",
boxShadow: wheel.isRatioOut ? "0 0 8px #ef4444" : "none",
transform:
ratioDirection === "down"
? "translate(-50%, 0)"
: "translate(-50%, -100%)",
}}
/>

{isFront && (
<div
className="absolute top-1/2 h-0.75 rounded-full z-20 origin-left transition-all duration-75"
style={{
left: "50%",
width: angleWidthStyle,
background: wheel.isAngleOut ? "#ef4444" : "#9ca3af",
boxShadow: wheel.isAngleOut ? "0 0 8px #ef4444" : "none",
transform:
angleDirection === "right"
? "translateY(-50%) scaleX(1)"
: "translateY(-50%) scaleX(-1)",
}}
/>
)}
</div>
</div>
</div>
);
}
