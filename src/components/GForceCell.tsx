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
	const dotPos = useTelemetryStore(
		(state: TelemetryStoreState) => state.gForceDot,
	);
	const telemetry = useTelemetryStore(
		(state: TelemetryStoreState) => state.telemetry,
	);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const trailRef = useRef<GPoint[]>([]);
	const frameCounterRef = useRef(0);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const contextRef = useRef<CanvasRenderingContext2D | null>(null);

	const latG = telemetry?.gForce.lateral ?? 0;
	const lngG = telemetry?.gForce.longitudinal ?? 0;

	const draw = (): void => {
		const canvas = canvasRef.current;
		const context = contextRef.current;
		if (!canvas || !context) return;
		const size = canvas.width;
		context.setTransform(size / 100, 0, 0, size / 100, 0, 0);
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
		context.fillStyle = "rgba(34, 197, 94, 0.45)";
		context.beginPath();
		context.arc(dotPos.x, dotPos.y, 6, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#4ade80";
		context.beginPath();
		context.arc(dotPos.x, dotPos.y, 2.5, 0, Math.PI * 2);
		context.fill();
		context.lineWidth = 0.5;
		context.strokeStyle = "#0f0f12";
		context.stroke();
	};

	const drawRef = useRef(draw);
	useEffect(() => {
		drawRef.current = draw;
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const resize = (): void => {
			const dpr = window.devicePixelRatio || 1;
			const cssSize = canvas.clientWidth || 100;
			canvas.width = Math.max(1, Math.round(cssSize * dpr));
			canvas.height = Math.max(1, Math.round(cssSize * dpr));
			contextRef.current = canvas.getContext("2d");
		};
		resize();
		drawRef.current();
		resizeObserverRef.current = new ResizeObserver(() => {
			resize();
			drawRef.current();
		});
		resizeObserverRef.current.observe(canvas);
		return () => resizeObserverRef.current?.disconnect();
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
		<div className="relative flex flex-col items-center justify-center">
			<svg viewBox="0 0 100 100" className="aspect-square w-full">
				<circle
					cx="50"
					cy="50"
					r="48"
					fill="#0f0f12"
					stroke="#3f3f46"
					strokeWidth="0.6"
				/>
				<line
					x1="50"
					y1="3"
					x2="50"
					y2="97"
					stroke="#52525b"
					strokeWidth="0.4"
				/>
				<line
					x1="3"
					y1="50"
					x2="97"
					y2="50"
					stroke="#52525b"
					strokeWidth="0.4"
				/>
				<circle
					cx="50"
					cy="50"
					r={G_INNER_RADIUS}
					fill="none"
					stroke="#52525b"
					strokeWidth="0.4"
					strokeDasharray="2,2"
				/>
				<circle
					cx="50"
					cy="50"
					r={G_RIM_RADIUS}
					fill="none"
					stroke="#3f3f46"
					strokeWidth="0.4"
					strokeDasharray="1,2"
				/>
				<text
					x="50"
					y="26.5"
					textAnchor="middle"
					fill="#52525b"
					fontSize="3.5"
					fontFamily="monospace"
				>
					1g
				</text>
				<text
					x="50"
					y="4.5"
					textAnchor="middle"
					fill="#3f3f46"
					fontSize="3.5"
					fontFamily="monospace"
				>
					2g
				</text>
			</svg>
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 h-full w-full"
			/>
			<span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.25em] text-zinc-500">
				G-G ENVELOPE
			</span>
			<span className="absolute right-2 bottom-2 font-mono text-xs tabular-nums text-zinc-300">
				{formatNumber(Math.abs(latG), 2)}{" "}
				<span className="text-zinc-500">·</span>{" "}
				{formatNumber(Math.abs(lngG), 2)}{" "}
				<span className="text-zinc-500">g</span>
			</span>
		</div>
	);
}
