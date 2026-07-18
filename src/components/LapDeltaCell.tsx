// src/components/LapDeltaCell.tsx
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
	}).format(value);
}

function formatSigned(value: number, fractionDigits = 2): string {
	return `${value >= 0 ? "+" : ""}${formatNumber(value, fractionDigits)}`;
}

export function LapDeltaCell() {
	const telemetry = useTelemetryStore(
		(state: TelemetryStoreState) => state.telemetry,
	);
	const delta = telemetry?.lapDelta;
	const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);

	// 🚀 超前綠、落後紅、其餘透明白
	const getDeltaColorClass = () => {
		if (delta === null || delta === undefined || delta === 0)
			return stale ? "text-zinc-600" : "text-zinc-300"; // 在stale狀態下使用更深的顏色
		return delta > 0 ? "text-red-500 cyber-glow-red" : "text-[#00FF66]"; // 落後紅 / 超前綠
	};

	return (
		<div className="flex min-h-[104px] min-w-[104px] flex-col items-center justify-center rounded-[20px] bg-black/15 px-3 py-2 text-center backdrop-blur-[1px]">
			<span className="text-[8px] font-black tracking-[0.2em] text-zinc-500 racing-text uppercase leading-none">
				LAP DELTA
			</span>
			<span
				className={`mt-2 min-h-[1.2em] font-mono text-[1.85rem] font-black leading-none tracking-tight tabular-nums racing-text transition-colors duration-150 ${getDeltaColorClass()}`}
			>
				{delta === null || delta === undefined
					? "0.00"
					: `${formatSigned(delta, 2)}s`}
			</span>
		</div>
	);
}
