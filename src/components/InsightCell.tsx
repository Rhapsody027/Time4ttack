// src/components/InsightCell.tsx
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
	}).format(value);
}

export function InsightCell() {
	const drivingInsights = useTelemetryStore(
		(state: TelemetryStoreState) => state.drivingInsights,
	);
	const freeRoam = useTelemetryStore(
		(state: TelemetryStoreState) => state.freeRoam,
	);

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
					[ STANDBY / FREE ROAM ]
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
							<span className="text-[9px] font-bold text-cyan-400">
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
