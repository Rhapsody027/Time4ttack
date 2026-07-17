// src/components/InsightCell.tsx
import { useMemo } from "react";
import type { TelemetryStoreState } from "../useTelemetry";
import { buildWebSocketUrl } from "../useTelemetry";

type InsightCellProps = {
	telemetry: TelemetryStoreState;
};

export function InsightCell({ telemetry }: InsightCellProps) {
	const wsTarget = useMemo(
		() => buildWebSocketUrl(telemetry.hubIp),
		[telemetry.hubIp],
	);

	const pairState = telemetry.connected
		? "CONNECTED"
		: telemetry.stale
			? "STANDBY"
			: "SEARCHING";

	return (
		<div className="flex h-full w-full select-none items-stretch justify-center py-1">
			<div className="flex h-full w-full flex-col justify-center gap-3 rounded-[20px] border border-zinc-800/80 bg-zinc-950/85 px-3 py-3 shadow-[0_0_18px_rgba(0,0,0,0.35)] backdrop-blur-[1px]">
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<div className="text-[7px] font-black tracking-[0.25em] text-zinc-400 uppercase leading-none">
							QR Pairing
						</div>
						<div className="mt-1 truncate text-[7px] tracking-[0.16em] text-zinc-600">
							{wsTarget}
						</div>
					</div>
					<div className="shrink-0 rounded-full border border-red-500/30 bg-red-950/20 px-2 py-1 text-[7px] font-black tracking-[0.22em] text-red-300 uppercase">
						{pairState}
					</div>
				</div>

				<div className="grid grid-cols-[auto_1fr] items-center gap-2 border-t border-zinc-900/80 pt-2">
					<div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,0,85,0.65)]" />
					<div className="min-w-0 text-[7px] leading-4 tracking-[0.14em] text-zinc-600 uppercase">
						Scan the QR shown on the hub computer to connect this phone
						instantly.
					</div>
				</div>
			</div>
		</div>
	);
}
