// src/components/InsightCell.tsx
import { useEffect, useMemo } from "react";
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
			<div className="flex h-full w-full flex-col justify-center gap-2 border border-zinc-800/80 bg-zinc-950/85 px-2 py-2 shadow-[0_0_18px_rgba(0,0,0,0.35)]">
				{/*
					未來這裡會換成駕駛技術評分系統。
					原本的識別文案先保留，等 scoring 功能實作時直接接回。
					<div className="flex h-full w-full items-center justify-center select-none py-1">
						<span className="text-[7px] font-black tracking-[0.22em] text-zinc-600 racing-text uppercase text-center">
							FORZA HORIZON 6 TELEMETRY
						</span>
					</div>
				*/}
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<div className="text-[7px] font-black tracking-[0.25em] text-zinc-400 uppercase">
							QR Pairing
						</div>
						<div className="mt-1 truncate text-[7px] tracking-[0.16em] text-zinc-600">
							{wsTarget}
						</div>
					</div>
					<div className="shrink-0 border border-zinc-800 px-2 py-1 text-[7px] font-black tracking-[0.22em] text-red-300 uppercase">
						{pairState}
					</div>
				</div>

				<div className="text-[7px] leading-4 tracking-[0.14em] text-zinc-600 uppercase">
					Use the QR shown on the hub computer to open the app and auto-connect.
				</div>
			</div>
		</div>
	);
}
