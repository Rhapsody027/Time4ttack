import { useEffect, useRef } from "react";
import {
	useTelemetry,
	useTelemetryStore,
	type CornerKey,
} from "../useTelemetry";

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

function formatSigned(value: number, fractionDigits = 2): string {
	return `${value >= 0 ? "+" : ""}${formatNumber(value, fractionDigits)}`;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function statusLabel(stale: boolean, connected: boolean): string | null {
	if (!stale) return null;
	return connected
		? "[ WAITING FOR FH6 GAME DATA ]"
		: "[ DISCONNECTED / WAITING FOR FH6 GAME DATA ]";
}

// 🚀 輪胎傻瓜元件：不負責任何物理計算，純消費 Zustand 數據
function WheelCell({ cornerKey }: { cornerKey: CornerKey }) {
	// 精確訂閱特定輪胎的狀態與大腦算好的發光漸層背景
	const wheel = useTelemetryStore((state) => state.wheels[cornerKey]);
	const stale = useTelemetryStore((state) => state.stale);

	const isFront = cornerKey === "fl" || cornerKey === "fr";
	const steerRotation = isFront ? wheel.steerDegrees : 0;

	const showRatioAxis = true;
	const showAngleAxis = isFront;

	// 🚀 從大腦直接提取自適應狀態顏色與 Hysteresis 防閃爍結果
	const borderColor =
		wheel.ratioWarning || wheel.angleWarning
			? "#ef4444"
			: wheel.ratioInBand || wheel.angleInBand
				? "#00F0FF"
				: "#064e3b";

	const axisColor =
		wheel.ratioWarning || wheel.angleWarning
			? "#ef4444"
			: wheel.ratioInBand || wheel.angleInBand
				? "#00F0FF"
				: "#27272a";

	const shadow =
		wheel.ratioInBand || wheel.angleInBand ? "0 0 12px #00F0FF" : "none";

	// 🚀 荷重顯化：直接讀取在大腦裡面算好的配重比例分數
	const loadGlow =
		wheel.loadScore > 0.15
			? `radial-gradient(circle at center, rgba(239, 68, 68, ${Math.min(wheel.loadScore * 0.4, 0.6)}) 0%, transparent 75%)`
			: "transparent";

	const ratioDirection = wheel.slipRatio >= 0 ? "down" : "up";
	const angleDirection = wheel.slipAngle <= 0 ? "left" : "right";

	return (
		<div className="relative flex h-32 w-24 items-center justify-center overflow-visible bg-transparent">
			<span
				className={`absolute ${cornerKey === "fl" ? "top-0 left-2" : cornerKey === "fr" ? "top-0 right-2" : cornerKey === "rl" ? "bottom-0 left-2" : "bottom-0 right-2"} text-[10px] font-mono font-bold tracking-widest text-zinc-600`}
			>
				{wheel.label}
			</span>

			<div
				className="absolute h-24 w-14 rounded-md border-solid bg-transparent overflow-visible z-10"
				style={{
					transform: `rotate(${steerRotation}deg)`,
					borderWidth: "2px",
					borderColor,
					opacity: stale ? 0.45 : 1,
					boxShadow: shadow,
					background: loadGlow,
				}}
			>
				{showRatioAxis && (
					<div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 opacity-25 pointer-events-none bg-zinc-800" />
				)}
				{showAngleAxis && (
					<div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 opacity-25 pointer-events-none bg-zinc-800" />
				)}

				<div
					className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full z-10"
					style={{ background: axisColor }}
				/>

				{/* 縱向光條 */}
				{showRatioAxis && (
					<div
						className="absolute left-1/2 w-0.75 rounded-full z-20"
						style={{
							top: "50%",
							height: `${wheel.ratioPercent}%`,
							background: axisColor,
							boxShadow: shadow,
							transform:
								ratioDirection === "down"
									? "translate(-50%, 0)"
									: "translate(-50%, -100%)",
						}}
					/>
				)}

				{/* 橫向光條 */}
				{showAngleAxis && (
					<div
						className="absolute top-1/2 h-0.75 rounded-full z-20 origin-left"
						style={{
							left: "50%",
							width: `${wheel.anglePercent / 2}%`,
							background: axisColor,
							boxShadow: shadow,
							transform:
								angleDirection === "right"
									? "translateY(-50%) scaleX(1)"
									: "translateY(-50%) scaleX(-1)",
						}}
					/>
				)}
			</div>
		</div>
	);
}

// 🚀 G力圓盤：直接訂閱 Zustand 大腦處理好的 Canvas 像素座標點
function GForceCell() {
	const dotPos = useTelemetryStore((state) => state.gForceDot);
	const telemetry = useTelemetryStore((state) => state.telemetry);

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
				{formatSigned(-latG, 2)} <span className="text-zinc-500">·</span>{" "}
				{formatSigned(lngG, 2)} <span className="text-zinc-500">g</span>
			</span>
		</div>
	);
}

function LapDeltaCell() {
	const telemetry = useTelemetryStore((state) => state.telemetry);
	return (
		<div className="flex flex-col items-center justify-center text-center">
			<span className="text-[9px] font-bold tracking-widest text-gray-600">
				LAP DELTA
			</span>
			<span className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-300">
				{telemetry?.lapDelta === null || telemetry?.lapDelta === undefined
					? "--"
					: `${formatSigned(telemetry.lapDelta, 2)}s`}
			</span>
		</div>
	);
}

function GearCell() {
	const gearLabel = useTelemetryStore((state) => state.gearLabel);
	const rpmPercent = useTelemetryStore((state) => state.rpmPercent);
	const shiftOn = useTelemetryStore((state) => state.shiftOn);
	const speedDisplay = useTelemetryStore((state) => state.speedDisplay);
	const stale = useTelemetryStore((state) => state.stale);

	return (
		<div
			className={`relative flex flex-col items-center justify-center px-2 ${stale ? "opacity-45" : ""}`}
		>
			<div className="absolute top-0 h-2 w-full overflow-hidden rounded-full bg-gray-950">
				<div
					className={`h-full rounded-full ${shiftOn ? "bg-[#FF0055]" : "bg-yellow-400"}`}
					style={{ width: `${rpmPercent}%` }}
				/>
			</div>
			<div className="pt-4 text-center">
				<span className="block text-[9px] font-bold tracking-widest text-gray-600">
					GEAR
				</span>
				<div className="my-1 font-mono text-7xl font-black leading-none text-white">
					{gearLabel}
				</div>
				<div className="font-mono text-2xl font-bold tracking-tight text-white">
					{formatNumber(speedDisplay, 0)}
				</div>
				<span className="block -mt-1 text-[9px] font-bold tracking-wider text-gray-500">
					km/h
				</span>
			</div>
		</div>
	);
}

function PedalCell() {
	const telemetry = useTelemetryStore((state) => state.telemetry);
	const pedalOverlap = useTelemetryStore((state) => state.pedalOverlap);

	const throttle = telemetry?.throttle ?? 0;
	const brake = telemetry?.brake ?? 0;

	return (
		<div className="relative flex flex-col items-center justify-center">
			<div className="flex h-20 items-end gap-4">
				<div className="flex h-full flex-col items-center justify-between">
					<div className="flex h-14 w-1.5 items-end rounded-full bg-gray-950">
						<div
							className="w-full rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]"
							style={{ height: `${clamp(throttle * 100, 0, 100)}%` }}
						/>
					</div>
					<span className="mt-1 text-[9px] font-bold text-emerald-400">
						{formatNumber(throttle * 100, 0)}
					</span>
				</div>
				<div className="flex h-full flex-col items-center justify-between">
					<div className="flex h-14 w-1.5 items-end rounded-full bg-gray-950">
						<div
							className="w-full rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]"
							style={{ height: `${clamp(brake * 100, 0, 100)}%` }}
						/>
					</div>
					<span className="mt-1 text-[9px] font-bold text-red-500">
						{formatNumber(brake * 100, 0)}
					</span>
				</div>
			</div>
			<div
				className={`absolute -bottom-4 rounded border px-1 text-[8px] font-bold tracking-wider ${pedalOverlap ? "animate-pulse border-yellow-500/20 bg-yellow-500/10 text-yellow-500" : "border-slate-800 bg-slate-950/80 text-slate-500"}`}
			>
				{pedalOverlap ? "PEDAL OVERLAP" : "PEDALS CLEAN"}
			</div>
		</div>
	);
}

function InsightCell() {
	const drivingInsights = useTelemetryStore((state) => state.drivingInsights);
	const freeRoam = useTelemetryStore((state) => state.freeRoam);

	return (
		<div className="flex flex-col justify-center border-t border-b border-gray-900 px-2 py-1">
			<div className="mb-1 text-center text-[9px] font-bold tracking-[0.28em] text-cyan-300">
				{drivingInsights.modeLabel}
			</div>
			<div className="mb-2 text-center text-[8px] font-bold tracking-[0.24em] text-gray-600">
				{drivingInsights.statusLabel}
			</div>
			{freeRoam ? (
				<div className="rounded border border-white/10 bg-white/5 px-2 py-3 text-center text-[10px] font-bold tracking-[0.24em] text-slate-300">
					[ STANDBY / FREE ROAM MODE ]
				</div>
			) : (
				<>
					<div className="space-y-1 font-mono text-[10px]">
						<div className="flex justify-between gap-4">
							<span className="text-[9px] font-bold text-gray-600">
								GRIP EFF
							</span>
							<span className="font-bold text-emerald-400">
								{formatNumber(drivingInsights.gripEfficiency ?? 0, 1)}%
							</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-[9px] font-bold text-gray-600">
								TRAIL BRK
							</span>
							<span className="font-bold text-yellow-400">
								{formatNumber(drivingInsights.trailBrakingSmoothness ?? 0, 1)}%
							</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-[9px] font-bold text-gray-600">
								EXIT TIMING
							</span>
							<span className="font-bold text-cyan-400">
								{drivingInsights.throttleCommit}
							</span>
						</div>
					</div>
					<div className="mt-1 text-center text-[9px] font-bold tracking-widest text-gray-600">
						RANK{" "}
						<span className="text-xs text-cyan-400">
							{drivingInsights.rank}
						</span>
					</div>
				</>
			)}
		</div>
	);
}

export function Fh6Dashboard() {
	// 🚀 掛載此頂層組件時全自動啟動與 Bun 的連線
	const telemetry = useTelemetry();
	const label = statusLabel(telemetry.stale, telemetry.connected);

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-[#0B0C10] p-4 text-white font-mono">
			{label ? (
				<div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-cyan-300 backdrop-blur-xl">
					{label}
				</div>
			) : null}
			<div className="grid h-180 w-120 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] grid-cols-3 grid-rows-3 gap-x-4 gap-y-8 p-2">
				<WheelCell cornerKey="fl" />
				<GForceCell />
				<WheelCell cornerKey="fr" />

				<LapDeltaCell />
				<GearCell />
				<PedalCell />

				<WheelCell cornerKey="rl" />
				<InsightCell />
				<WheelCell cornerKey="rr" />
			</div>
		</main>
	);
}

export default Fh6Dashboard;
