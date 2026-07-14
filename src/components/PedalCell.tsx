// src/components/PedalCell.tsx
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
	}).format(value);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function PedalCell() {
	const telemetry = useTelemetryStore(
		(state: TelemetryStoreState) => state.telemetry,
	);
	const pedalOverlap = useTelemetryStore(
		(state: TelemetryStoreState) => state.pedalOverlap,
	);
	const throttle = telemetry?.throttle ?? 0;
	const brake = telemetry?.brake ?? 0;

	return (
		<div className="relative flex flex-col items-center justify-center p-1">
			{/* 🚀 核心優化：將單邊 w-8 縮窄至 w-5！這樣可以完美解鎖 gap-4，讓你修改外層 gap 隨心縮放！ */}
			<div className="flex h-24 items-end gap-2">
				{/* THR (油門) */}
				<div className="flex h-full w-5 flex-col items-center justify-between">
					<div className="text-[7px] font-bold text-zinc-400 tracking-wider racing-text select-none">
						THR
					</div>
					<div className="relative flex h-16 w-1.5 items-end bg-[#050508]">
						<div
							className="w-full bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.4)] transition-all duration-75"
							style={{ height: `${clamp(throttle * 100, 0, 100)}%` }}
						/>
					</div>
					<span className="text-[9px] font-black text-[#00FF66] racing-text tabular-nums">
						{formatNumber(throttle * 100, 0)}
					</span>
				</div>

				{/* BRK (煞車) */}
				<div className="flex h-full w-5 flex-col items-center justify-between">
					<div className="text-[7px] font-bold text-zinc-400 tracking-wider racing-text select-none">
						BRK
					</div>
					<div className="relative flex h-16 w-1.5 items-end bg-[#050508]">
						<div
							className="w-full bg-[#FF0055] shadow-[0_0_8px_rgba(255,0,85,0.4)] transition-all duration-75"
							style={{ height: `${clamp(brake * 100, 0, 100)}%` }}
						/>
					</div>
					<span className="text-[9px] font-black text-[#FF0055] racing-text tabular-nums">
						{formatNumber(brake * 100, 0)}
					</span>
				</div>
			</div>

			{/* 圓角警告標籤底盤 */}
			<div
				className={`mt-1.5 rounded-full px-2 py-0.5 text-[7px] font-bold tracking-widest racing-text transition-all duration-150 ${
					pedalOverlap
						? "bg-yellow-950/40 text-yellow-500 border border-yellow-500/30"
						: "text-zinc-600"
				}`}
			>
				{pedalOverlap ? "BRAKE OVERLAP" : "NOMINAL"}
			</div>
		</div>
	);
}
