// src/components/Fh6Dashboard.tsx
import { useTelemetry } from "../useTelemetry";
import { WheelCell } from "./WheelCell";
import { GForceCell } from "./GForceCell";
import { LapDeltaCell } from "./LapDeltaCell";
import { GearCell } from "./GearCell";
import { PedalCell } from "./PedalCell";
import { InsightCell } from "./InsightCell";

function statusLabel(stale: boolean, connected: boolean): string | null {
	if (!stale) return null;
	return connected
		? "[ WAITING FOR FH6 GAME DATA ]"
		: "[ DISCONNECTED / WAITING FOR FH6 GAME DATA ]";
}

export function Fh6Dashboard() {
	const telemetry = useTelemetry();
	const label = statusLabel(telemetry.stale, telemetry.connected);

	return (
		<main className="relative flex min-h-screen select-none items-center justify-center bg-[#050508] p-4 text-white font-mono">
			{label ? (
				<div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-cyan-500/30 bg-black/80 px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-cyan-400 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.15)]">
					{label}
				</div>
			) : null}

			{/* 🚀 完美還原：移除 items-center，回歸最原始的 Grid 幾何分配，轉速條完美復原 */}
			<div className="grid h-180 w-120 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] grid-cols-3 grid-rows-3 gap-x-4 gap-y-8 p-2">
				<WheelCell cornerKey="fl" />
				<GForceCell />
				<WheelCell cornerKey="fr" />

				<LapDeltaCell />
				<GearCell />
				<PedalCell />

				<WheelCell cornerKey="rl" />
				<InsightCell />
				<WheelCell cornerKey="rr" />
			</div>
		</main>
	);
}

export default Fh6Dashboard;
