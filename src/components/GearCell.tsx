// src/components/GearCell.tsx
import { useEffect, useRef, useState } from "react";
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
	}).format(value);
}

export function GearCell() {
	const gearLabel = useTelemetryStore(
		(state: TelemetryStoreState) => state.gearLabel,
	);
	const speedDisplay = useTelemetryStore(
		(state: TelemetryStoreState) => state.speedDisplay,
	);
	const shiftOn = useTelemetryStore(
		(state: TelemetryStoreState) => state.shiftOn,
	);
	const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);

	const [displayGear, setDisplayGear] = useState(gearLabel);
	const lastValidGearRef = useRef(gearLabel);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// 120Hz 雙向滯後狀態與 DOM 操作 Ref
	const isRedStateRef = useRef(false);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const gearTextRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const isInvalid =
			gearLabel === "15" || Number(gearLabel) > 10 || gearLabel === "";
		if (!isInvalid) {
			lastValidGearRef.current = gearLabel;
			setDisplayGear(gearLabel);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		} else {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(() => {
				setDisplayGear("N");
			}, 100);
		}
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [gearLabel]);

	// Canvas 圓弧轉速繪製
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.width = 160;
		canvas.height = 160;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationId: number;

		const drawLoop = () => {
			ctx.clearRect(0, 0, 160, 160);

			const currentRpm = useTelemetryStore.getState().rpmPercent;
			const cx = 80;
			const cy = 80;
			const radius = 68;

			const startAngle = 0.75 * Math.PI;
			const totalArc = 1.5 * Math.PI;
			const endAngle = startAngle + (currentRpm / 100) * totalArc;

			// 1. 繪製底部凹槽
			ctx.lineWidth = 8;
			ctx.lineCap = "round";
			ctx.strokeStyle = "#050508";
			ctx.beginPath();
			ctx.arc(cx, cy, radius, startAngle, startAngle + totalArc);
			ctx.stroke();

			// 2. 雙向滯後濾波
			if (currentRpm >= 95) {
				isRedStateRef.current = true;
			} else if (currentRpm < 91) {
				isRedStateRef.current = false;
			}

			let color = "#FFFFFF";
			let isRed = false;

			if (isRedStateRef.current) {
				color = "#FF0055";
				isRed = true;
			} else if (currentRpm >= 85) {
				color = "#FBBF24";
			}

			// 直接操作 DOM 變色與微縮放
			if (gearTextRef.current) {
				if (isRed) {
					gearTextRef.current.style.color = "#FF0055";
					gearTextRef.current.classList.add("cyber-glow-red");
					gearTextRef.current.classList.remove("scale-105");
				} else {
					gearTextRef.current.style.color = "#F4F4F5";
					gearTextRef.current.classList.remove("cyber-glow-red", "scale-105");
				}
			}

			// 3. 繪製動態轉速條
			if (currentRpm > 0) {
				ctx.lineWidth = 6;
				ctx.strokeStyle = color;
				ctx.beginPath();
				ctx.arc(cx, cy, radius, startAngle, endAngle);
				ctx.stroke();
			}

			animationId = requestAnimationFrame(drawLoop);
		};

		drawLoop();
		return () => cancelAnimationFrame(animationId);
	}, []);

	return (
		<div
			className={`relative flex h-full w-full items-center justify-center transition-all duration-300 ${stale ? "opacity-30" : ""}`}
		>
			<div className="relative h-44 w-44 aspect-square flex items-center justify-center scale-110">
				{/* 正圓形現代紅黑金屬硬裝甲 */}
				<div
					className="relative z-10 h-32 w-32 aspect-square overflow-visible isolate rounded-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1d24] via-[#050608] to-[#010102] border border-[#272a35]"
					style={{
						boxShadow: shiftOn
							? "0 16px 30px rgba(255, 0, 85, 0.35), 0 4px 10px rgba(0,0,0,0.8)"
							: "0 18px 25px rgba(0, 0, 0, 0.95), 0 3px 6px rgba(0,0,0,0.5)",
					}}
				>
					{/* 紅白裝甲精細接縫線 */}
					<div className="absolute inset-1 aspect-square rounded-full border border-black/90 pointer-events-none" />

					{/* GEAR 標籤 */}
					<span className="z-10 text-[8px] font-black tracking-[0.25em] text-zinc-500 racing-text mt-1 select-none">
						GEAR
					</span>

					{/* 檔位字體微縮 (text-6xl) */}
					<div
						ref={gearTextRef}
						className="relative z-20 font-mono text-6xl font-black leading-none transition-colors duration-75 racing-text text-zinc-100 whitespace-nowrap"
					>
						{displayGear}
					</div>

					{/* 時速與下邊緣拉開距離 */}
					<div className="z-10 flex flex-col items-center justify-center -mt-1 mb-1">
						<div className="font-mono text-xl font-black tracking-tight text-white racing-text">
							{formatNumber(speedDisplay, 0)}
						</div>
						<span className="text-[7px] font-bold tracking-widest text-zinc-500 -mt-1.5 racing-text select-none">
							KM/H
						</span>
					</div>
				</div>

				{/* 零延遲 Canvas 圓形繪圖畫布 */}
				<canvas
					ref={canvasRef}
					className="absolute inset-0 h-full w-full aspect-square pointer-events-none z-0"
				/>
			</div>
		</div>
	);
}
