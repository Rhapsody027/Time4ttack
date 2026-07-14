// src/components/GForceCell.tsx
import { useEffect, useRef } from "react";
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

type GPoint = { x: number; y: number; time: number };

const G_RIM_RADIUS = 44;
const G_INNER_RADIUS = 22;
const TRAIL_DURATION = 2500;
const TRAIL_DECIMATE = 3; // 🚀 提高採樣率，讓黃色點形成極度滑順無縫的高能軌跡線

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

    const draw = (): void => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;

        context.setTransform(128 / 100, 0, 0, 128 / 100, 0, 0);
        context.clearRect(0, 0, 100, 100);

        const now = Date.now();
        trailRef.current = trailRef.current.filter((p) => now - p.time <= TRAIL_DURATION);

        const trail = trailRef.current;
        for (let i = 0; i < trail.length; i++) {
            const point = trail[i]!;
            const age = now - point.time;
            const opacity = Math.max(0, 1 - age / TRAIL_DURATION);

            context.globalAlpha = opacity * 0.75;
            context.fillStyle = "#FFDD00"; 
            context.beginPath();
            context.arc(point.x, point.y, 1.1, 0, Math.PI * 2);
            context.fill();
        }

        // 核心牽引線
        context.globalAlpha = 0.9;
        context.strokeStyle = "#FF0055";
        context.lineWidth = 1.0;
        context.beginPath();
        context.moveTo(50, 50);
        context.lineTo(dotPos.x, dotPos.y);
        context.stroke();

        // 紅色實心重力點 (稍微大顆一點點，極致耀眼)
        context.globalAlpha = 1.0;
        context.fillStyle = "#FF0055"; 
        context.beginPath();
        context.arc(dotPos.x, dotPos.y, 4.2, 0, Math.PI * 2); 
        context.fill();

        context.lineWidth = 0.8;
        context.strokeStyle = "#FFFFFF";
        context.stroke();
    };

    const drawRef = useRef(draw);
    useEffect(() => {
        drawRef.current = draw;
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 128;
        canvas.height = 128;
        contextRef.current = canvas.getContext("2d");

        let animationId: number;
        const renderLoop = () => {
            drawRef.current();
            animationId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        return () => cancelAnimationFrame(animationId);
    }, []);

    useEffect(() => {
        frameCounterRef.current += 1;
        if (frameCounterRef.current % TRAIL_DECIMATE === 0) {
            trailRef.current.push({ x: dotPos.x, y: dotPos.y, time: Date.now() });
        }
    }, [dotPos.x, dotPos.y]);

    return (
        <div className="flex w-full h-full items-center justify-center p-1">
            <div className="relative flex h-30 w-30 flex-col items-center justify-center overflow-visible scale-95">
                
                <svg viewBox="0 0 100 100" className="aspect-square w-full overflow-visible pointer-events-none">
                    <circle cx="50" cy="50" r="48" fill="#000000" fillOpacity="0.6" stroke="#ff0055" strokeWidth="0.8" strokeOpacity="0.15" />
                    
                    <circle cx="50" cy="50" r={G_INNER_RADIUS} fill="none" stroke="#52525b" strokeWidth="0.8" strokeDasharray="2,3" strokeOpacity="0.6" />
                    <circle cx="50" cy="50" r={G_RIM_RADIUS} fill="none" stroke="#ff0055" strokeWidth="0.8" strokeDasharray="3,4" strokeOpacity="0.5" />

                    <line x1="50" y1="2" x2="50" y2="98" stroke="#3f3f46" strokeWidth="0.6" strokeOpacity="0.5" />
                    <line x1="6" y1="50" x2="94" y2="50" stroke="#3f3f46" strokeWidth="0.6" strokeOpacity="0.5" />

                    <text x="50" y="26.5" textAnchor="middle" fill="#a1a1aa" fontSize="5" fontWeight="bold" fontFamily="monospace" className="select-none">1G</text>
                    <text x="50" y="10.5" textAnchor="middle" fill="#ff0055" fontSize="5" fontWeight="black" fontFamily="monospace" className="select-none">2G</text>
                </svg>
                
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-30 w-30 p-1" />

                {/* 預留高度與底部空間防止擠壓 */}
                <div className="absolute -bottom-5.5 w-full text-center font-mono text-[9px] tabular-nums text-zinc-400 font-black tracking-wider racing-text">
                    {formatNumber(Math.abs(latG), 2)} <span className="text-red-500/80">·</span>{" "}
                    {formatNumber(Math.abs(lngG), 2)} <span className="text-zinc-500 font-normal">G</span>
                </div>
            </div>
        </div>
    );
}
