// src/components/Fh6Dashboard.tsx
import { useTelemetry } from "../useTelemetry";
import { WheelCell } from "./WheelCell";
import { GForceCell } from "./GForceCell";
import { LapDeltaCell } from "./LapDeltaCell";
import { GearCell } from "./GearCell";
import { PedalCell } from "./PedalCell";
import { InsightCell } from "./InsightCell";

export function Fh6Dashboard() {
    const telemetry = useTelemetry();

    return (
        <main className="relative flex h-full w-full select-none items-center justify-center carbon-fiber-bg text-white font-mono crt-screen overflow-hidden px-4 py-4">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,0,85,0.04)_0%,transparent_75%)]" />

            <div className="relative z-10 flex h-full w-full flex-col gap-4 rounded-[28px] border border-zinc-900/80 bg-[#020204]/96 px-4 py-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
                <div className="w-full flex items-center justify-between opacity-50 select-none">
                    <div className="h-[2px] w-14 bg-gradient-to-r from-red-600 to-transparent" />
                    <div className="text-[10px] font-black tracking-[0.3em] text-zinc-300 racing-text">
                        Time4ttack
                    </div>
                    <div className="h-[2px] w-14 bg-gradient-to-l from-red-600 to-transparent" />
                </div>

                <div className="grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)_minmax(0,1fr)] gap-x-3 gap-y-3 items-center justify-center">
                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <WheelCell cornerKey="fl" />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <GForceCell />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <WheelCell cornerKey="fr" />
                    </div>

                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <LapDeltaCell />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <GearCell />
                    </div>
                    <div className="flex min-h-0 min-w-0 items-center justify-center">
                        <PedalCell />
                    </div>

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