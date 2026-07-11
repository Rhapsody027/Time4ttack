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
