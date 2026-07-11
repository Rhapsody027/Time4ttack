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
		<main className="relative flex min-h-screen select-none items-center justify-center bg-[#0B0C10] p-4 text-white font-mono">
			{label ? (
				<div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-cyan-300 backdrop-blur-xl">
					{label}
				</div>
			) : null}
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
