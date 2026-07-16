// src/components/Fh6Dashboard.tsx
import { useState } from "react";
import { useTelemetry, useTelemetryStore } from "../useTelemetry";
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
    
    // 🚀 手動設定 IP 面板狀態管理
    const [showSettings, setShowSettings] = useState(false);
    const [ipInput, setIpInput] = useState(useTelemetryStore.getState().hubIp);

    const handleSaveSettings = () => {
        const store = useTelemetryStore.getState();
        store.setHubIp(ipInput);
        store.initWebSocket(ipInput);
        setShowSettings(false);
    };

    return (
        // 全螢幕背景碳纖維紋理
        <main className="relative flex h-screen w-screen select-none items-center justify-center carbon-fiber-bg text-white font-mono crt-screen overflow-hidden p-3">
            {/* 背景淡紅戰術發光 */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,0,85,0.04)_0%,transparent_75%)]" />

            {/* 連線警報 */}
            {label ? (
                <div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2 border border-red-500 bg-black/95 px-4 py-1 text-[8px] font-black tracking-[0.2em] text-red-500 shadow-[0_0_15px_rgba(255,0,85,0.4)] racing-text">
                    ⚠️ {label}
                </div>
            ) : null}

            {/* 🚀 主儀表板面板：限制最大寬度以維持長方形 */}
            <div className="relative z-10 flex h-full w-full max-w-[420px] flex-col justify-between py-4 px-3 bg-[#020204] border border-zinc-900/80 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                
                {/* 頂部：Time4ttack */}
                <div className="w-full flex items-center justify-between opacity-50 mb-3 select-none">
                    {/* 左漸變紅條 */}
                    <div className="h-[2px] w-14 bg-gradient-to-r from-red-600 to-transparent" />

                    {/* 專案名稱 */}
                    <div className="text-[10px] font-black tracking-[0.3em] text-zinc-300 racing-text">
                        Time4ttack
                    </div>

                    {/* 🚀 手動連線設定卡榫按鈕 */}
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-[9px] font-black border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 rounded text-zinc-400 hover:text-white hover:border-zinc-500 active:scale-95 transition-all"
                    >
                        ⚙️ SETTING
                    </button>

                    {/* 右漸變紅條 */}
                    <div className="h-[2px] w-14 bg-gradient-to-l from-red-600 to-transparent" />
                </div>

                {/* 🏎️ 30/40/30 精準防跑版 Grid 骨架 */}
                <div className="grid grid-cols-[30%_40%_30%] grid-rows-3 gap-y-12 w-full items-center justify-center flex-grow">
                    {/* Row 1: 左前輪 FL | GForce雷達 (40) | 右前輪 FR */}
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

                    {/* Row 3: 左後輪 RL | 雷雕狀態文字 (40) | 右後輪 RR */}
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

                {/* 底部點綴：極簡機甲卡榫 */}
                <div className="w-full flex justify-between items-center opacity-30 mt-3 px-2">
                    <div className="h-[1px] w-4 bg-zinc-700" />
                    <div className="text-[7px] text-zinc-600 font-black tracking-[0.4em] select-none">
                        ─ ♢ ─
                    </div>
                    <div className="h-[1px] w-4 bg-zinc-700" />
                </div>
            </div>

            {/* 🚀 彈出式手動連線設定面板 */}
            {showSettings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
                    <div className="w-80 border border-zinc-800 bg-[#0c0d10] p-6 rounded-lg shadow-2xl">
                        <div className="text-xs text-[#FF0055] font-black tracking-widest mb-1">
                            [ CONNECTION SETUP ]
                        </div>
                        <h3 className="text-base font-bold text-white mb-4">
                            手動連接 Telemetry Hub
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] text-zinc-500 font-bold mb-1">TELEMETRY HUB IP</label>
                                <input 
                                    type="text" 
                                    value={ipInput}
                                    onChange={(e) => setIpInput(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm font-mono text-white rounded focus:outline-none focus:border-[#FF0055]"
                                    placeholder="192.168.x.x"
                                />
                            </div>
                            <div className="text-[9px] text-zinc-500 leading-relaxed">
                                * 請輸入運行 FH6 Hub 電腦在區域網路中的 IP 位址。<br />
                                * 預設連線連接埠為 <span className="text-zinc-300">8765</span>。
                            </div>
                        </div>

                        <div className="flex space-x-3 text-xs">
                            <button 
                                onClick={handleSaveSettings}
                                className="flex-1 py-2.5 bg-[#FF0055] hover:bg-red-600 text-white font-bold rounded transition-all"
                            >
                                確認儲存並連線
                            </button>
                            <button 
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition-all"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Fh6Dashboard;
