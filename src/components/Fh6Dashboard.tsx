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
        // 🚀 物理避讓核心：pb-safe / pt-safe，完美繞開動態島、劉海與底部的 Home 條，上下界絕對不穿幫
        <main className="relative flex h-screen w-screen select-none items-center justify-center carbon-fiber-bg text-white font-mono crt-screen overflow-hidden p-3 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
            {/* 背景淡紅戰術發光 */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,0,85,0.04)_0%,transparent_75%)]" />

            {/* 連線警報 */}
            {label ? (
                <div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2 border border-red-500 bg-black/95 px-4 py-1 text-[8px] font-black tracking-[0.2em] text-red-500 shadow-[0_0_15px_rgba(255,0,85,0.4)] racing-text">
                    ⚠️ {label}
                </div>
            ) : null}

            {/* 🏎️ 主儀表板面板 */}
            <div className="relative z-10 flex h-full w-full max-w-[420px] flex-col justify-between py-4 px-3 bg-[#020204] border border-zinc-900/80 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                
                {/* 頂部：Time4ttack */}
                <div className="w-full flex items-center justify-between opacity-50 mb-3 select-none">
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
                <div className="grid grid-cols-[30%_40%_30%] grid-rows-3 gap-y-12 w-full items-center justify-center flex-grow">
                    {/* Row 1: FL | GForce雷達 | FR */}
                    <div className="flex items-center justify-center h-full">
                        <WheelCell cornerKey="fl" />
                    </div>
                    <div className="flex items-center justify-center h-full">
                        <GForceCell />
                    </div>
                    <div className="flex items-center justify-center h-full">
                        <WheelCell cornerKey="fr" />
                    </div>

                    {/* Row 2: LapDelta | Gear | Pedal */}
                    <div className="flex items-center justify-start sm:justify-center h-full pl-2 sm:pl-0">
                        <LapDeltaCell />
                    </div>
                    <div className="flex items-center justify-center h-full">
                        <GearCell />
                    </div>
                    <div className="flex items-center justify-end sm:justify-center h-full pr-2 sm:pr-0">
                        <PedalCell />
                    </div>

                    {/* Row 3: RL | 雷雕狀態文字 | RR */}
                    <div className="flex items-center justify-center h-full">
                        <WheelCell cornerKey="rl" />
                    </div>
                    <div className="flex items-center justify-center h-full">
                        <InsightCell />
                    </div>
                    <div className="flex items-center justify-center h-full">
                        <WheelCell cornerKey="rr" />
                    </div>
                </div>

                {/* 底部點綴 */}
                <div className="w-full flex justify-between items-center opacity-30 mt-3 px-2">
                    <div className="h-[1px] w-4 bg-zinc-700" />
                    <div className="text-[7px] text-zinc-600 font-black tracking-[0.4em] select-none">
                        ─ ♢ ─
                    </div>
                    <div className="h-[1px] w-4 bg-zinc-700" />
                </div>
            </div>
        </main>
    );
}

export default Fh6Dashboard;
