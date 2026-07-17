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
	return connected ? "STANDBY" : "DISCONNECTED";
}

export function Fh6Dashboard() {
	const telemetry = useTelemetry();
	const label = statusLabel(telemetry.stale, telemetry.connected);

	return (
		<main
			className="relative flex min-h-screen w-screen select-none items-center justify-center carbon-fiber-bg text-white font-mono crt-screen overflow-hidden px-4 py-4"
			style={{
				paddingTop: "max(1.15rem, env(safe-area-inset-top))",
				paddingBottom: "max(1.15rem, env(safe-area-inset-bottom))",
				paddingLeft: "max(1rem, env(safe-area-inset-left))",
				paddingRight: "max(1rem, env(safe-area-inset-right))",
			}}
		>
			{/* 背景淡紅戰術發光 */}
			<div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,0,85,0.04)_0%,transparent_75%)]" />

			{/* 連線警報 */}
			{label ? (
				<div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2 border border-red-500 bg-black/95 px-4 py-1 text-[8px] font-black tracking-[0.2em] text-red-500 shadow-[0_0_15px_rgba(255,0,85,0.4)] racing-text">
					⚠️ {label}
				</div>
			) : null}

			{/* 🏎️ 主儀表板面板 */}
			<div className="relative z-10 flex h-full w-full max-w-[460px] flex-col gap-4 rounded-[28px] border border-zinc-900/80 bg-[#020204]/96 px-4 py-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
				{/* 頂部：Time4ttack */}
				<div className="w-full flex items-center justify-between opacity-50 select-none">
					{/* 左漸變紅條 */}
					<div className="h-[2px] w-14 bg-gradient-to-r from-red-600 to-transparent" />

					{/* 專案名稱 */}
					<div className="text-[10px] font-black tracking-[0.3em] text-zinc-300 racing-text">
						Time4ttack
					</div>

					{/* 右漸變紅條 */}
					<div className="h-[2px] w-14 bg-gradient-to-l from-red-600 to-transparent" />
				</div>

				{/* 🏎️ 30/40/30 精準防跑版 Grid 骨架 */}
				<div className="grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)_minmax(0,1fr)] gap-x-3 gap-y-3 items-center justify-center">
					{/* Row 1: FL | GForce雷達 | FR */}
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<WheelCell cornerKey="fl" />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<GForceCell />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<WheelCell cornerKey="fr" />
					</div>

					{/* Row 2: LapDelta | Gear | Pedal */}
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<LapDeltaCell />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<GearCell />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<PedalCell />
					</div>

					{/* Row 3: RL | 雷雕狀態文字 | RR */}
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<WheelCell cornerKey="rl" />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<InsightCell telemetry={telemetry} />
					</div>
					<div className="flex min-h-0 min-w-0 items-center justify-center">
						<WheelCell cornerKey="rr" />
					</div>
				</div>
			</div>
		</main>
	);
}

export default Fh6Dashboard;
