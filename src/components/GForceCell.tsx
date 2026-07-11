// src/components/GForceCell.tsx
import { useEffect, useRef } from "react";
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

type GPoint = { x: number; y: number };

const G_RIM_RADIUS = 44;
const G_INNER_RADIUS = 22;
const TRAIL_SAMPLES = 200;
const TRAIL_DECIMATE = 6;

function formatNumber(value: number, fractionDigits = 0): string {
return new Intl.NumberFormat("en-US", {
maximumFractionDigits: fractionDigits,
minimumFractionDigits: fractionDigits,
}).format(value);
}

export function GForceCell() {
const dotPos = useTelemetryStore((state: TelemetryStoreState) => state.gForceDot);
const telemetry = useTelemetryStore((state: TelemetryStoreState) => state.telemetry);
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const trailRef = useRef<GPoint[]>([]);
const frameCounterRef = useRef(0);
const contextRef = useRef<CanvasRenderingContext2D | null>(null);

const latG = telemetry?.gForce.lateral ?? 0;
const lngG = telemetry?.gForce.longitudinal ?? 0;

// 🚀 100% 還原最初大腦：直接讓 Canvas 的渲染寬高與外層 DOM 容器（32x32 = 128px）完全同步
const draw = (): void => {
const canvas = canvasRef.current;
const context = contextRef.current;
if (!canvas || !context) return;

context.setTransform(128 / 100, 0, 0, 128 / 100, 0, 0);
context.clearRect(0, 0, 100, 100);

const trail = trailRef.current;
context.fillStyle = "#fbbf24";
for (let index = 0; index < trail.length; index += 1) {
const point = trail[index]!;
context.globalAlpha = ((index + 1) / trail.length) * 0.35;
context.beginPath();
context.arc(point.x, point.y, 0.75, 0, Math.PI * 2);
context.fill();
}

context.globalAlpha = 1;
context.fillStyle = "rgba(34, 197, 94, 0.35)";
context.beginPath();
context.arc(dotPos.x, dotPos.y, 4.5, 0, Math.PI * 2); 
context.fill();

context.fillStyle = "#4ade80";
context.beginPath();
context.arc(dotPos.x, dotPos.y, 2.0, 0, Math.PI * 2); 
context.fill();

context.lineWidth = 0.4;
context.strokeStyle = "#050508";
context.stroke();
};

const drawRef = useRef(draw);
useEffect(() => {
drawRef.current = draw;
});

useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;
// 🚀 核心物理鎖死：直接強制 Canvas 像素點就是 128x128，與 w-32 h-32 的 DOM 完美 1:1，解決拉伸導致的圓心偏離！
canvas.width = 128;
canvas.height = 128;
contextRef.current = canvas.getContext("2d");
drawRef.current();
}, []);

useEffect(() => {
frameCounterRef.current += 1;
if (frameCounterRef.current % TRAIL_DECIMATE === 0) {
trailRef.current.push({ x: dotPos.x, y: dotPos.y });
if (trailRef.current.length > TRAIL_SAMPLES) trailRef.current.shift();
}
drawRef.current();
}, [dotPos.x, dotPos.y]);

return (
// 🚀 核心外殼：獨立用 flex 居中，並且用 w-32 h-32 形成一個絕對正方形護城河，隔絕 Grid 單元格拉伸
<div className="flex h-full w-full items-center justify-center">
<div className="relative flex h-32 w-32 flex-col items-center justify-center overflow-visible">
<svg viewBox="0 0 100 100" className="aspect-square w-full overflow-visible">
<circle cx="50" cy="50" r="48" fill="#0b0b0e" stroke="#1f2937" strokeWidth="0.8" />
<line x1="50" y1="2" x2="50" y2="98" stroke="#1f2937" strokeWidth="0.5" />
<line x1="2" y1="50" x2="98" y2="50" stroke="#1f2937" strokeWidth="0.5" />
<circle cx="50" cy="50" r={G_INNER_RADIUS} fill="none" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="2,2" />
<circle cx="50" cy="50" r={G_RIM_RADIUS} fill="none" stroke="#374151" strokeWidth="0.5" strokeDasharray="1,2" />

<text x="50" y="26.5" textAnchor="middle" fill="#d1d5db" fontSize="4.5" fontWeight="bold" fontFamily="monospace">1g</text>
<text x="50" y="5.5" textAnchor="middle" fill="#9ca3af" fontSize="4.5" fontWeight="bold" fontFamily="monospace">2g</text>
</svg>
<canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-32 w-32" />

<div className="absolute -bottom-6 w-full text-center font-mono text-xs tabular-nums text-zinc-400 font-bold tracking-wider">
{formatNumber(Math.abs(latG), 2)} <span className="text-zinc-600">·</span>{" "}
{formatNumber(Math.abs(lngG), 2)} <span className="text-zinc-600 font-normal">g</span>
</div>
</div>
</div>
);
}
