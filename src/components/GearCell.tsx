// src/components/GearCell.tsx
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
	const rpmPercent = useTelemetryStore(
		(state: TelemetryStoreState) => state.rpmPercent,
	);
	const shiftOn = useTelemetryStore(
		(state: TelemetryStoreState) => state.shiftOn,
	);
	const speedDisplay = useTelemetryStore(
		(state: TelemetryStoreState) => state.speedDisplay,
	);
	const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);

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
