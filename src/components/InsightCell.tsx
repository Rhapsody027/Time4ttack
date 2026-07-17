// src/components/InsightCell.tsx
import { useEffect, useMemo, useState } from "react";
import type { TelemetryStoreState } from "../useTelemetry";
import { buildWebSocketUrl } from "../useTelemetry";

type InsightCellProps = {
	telemetry: TelemetryStoreState;
};

export function InsightCell({ telemetry }: InsightCellProps) {
	const [manualTarget, setManualTarget] = useState(telemetry.hubIp);

	useEffect(() => {
		setManualTarget(telemetry.hubIp);
	}, [telemetry.hubIp]);

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
			<div className="flex h-full w-full flex-col justify-between border border-zinc-800/80 bg-zinc-950/85 px-2 py-2 shadow-[0_0_18px_rgba(0,0,0,0.35)]">
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
							Pair Hub
						</div>
						<div className="mt-1 truncate text-[7px] tracking-[0.16em] text-zinc-600">
							{wsTarget}
						</div>
					</div>
					<div className="shrink-0 border border-zinc-800 px-2 py-1 text-[7px] font-black tracking-[0.22em] text-red-300 uppercase">
						{pairState}
					</div>
				</div>

				<div className="grid grid-cols-[1fr_auto] gap-2">
					<input
						value={manualTarget}
						onChange={(event) => setManualTarget(event.target.value)}
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						placeholder="192.168.1.10 / time4ttack.local"
						className="min-w-0 border border-zinc-800 bg-black/60 px-2 py-1.5 text-[8px] tracking-[0.14em] text-zinc-100 outline-none placeholder:text-zinc-600"
					/>
					<button
						type="button"
						onClick={() => {
							telemetry.setHubIp(manualTarget);
							telemetry.closeWebSocket();
							telemetry.initWebSocket(manualTarget);
						}}
						className="border border-red-600/70 bg-red-600/10 px-2 py-1.5 text-[7px] font-black tracking-[0.18em] text-red-200 uppercase"
					>
						Go
					</button>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => telemetry.startMdnsDiscovery()}
						className="border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[7px] font-black tracking-[0.18em] text-zinc-200 uppercase"
					>
						Scan
					</button>
					<button
						type="button"
						onClick={() => {
							if (navigator.clipboard?.writeText) {
								void navigator.clipboard.writeText(wsTarget);
							}
						}}
						className="border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[7px] font-black tracking-[0.18em] text-zinc-200 uppercase"
					>
						Copy
					</button>
					<button
						type="button"
						onClick={() => {
							telemetry.closeWebSocket();
							telemetry.initWebSocket(manualTarget);
						}}
						className="border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[7px] font-black tracking-[0.18em] text-zinc-200 uppercase"
					>
						Retry
					</button>
				</div>
			</div>
		</div>
	);
}
