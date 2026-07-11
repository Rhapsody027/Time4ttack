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
