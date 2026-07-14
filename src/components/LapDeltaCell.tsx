// src/components/LapDeltaCell.tsx
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    }).format(value);
}

function formatSigned(value: number, fractionDigits = 2): string {
    return `${value >= 0 ? "+" : ""}${formatNumber(value, fractionDigits)}`;
}

export function LapDeltaCell() {
    const telemetry = useTelemetryStore((state: TelemetryStoreState) => state.telemetry);
    const delta = telemetry?.lapDelta;

    // 🚀 超前綠、落後紅、其餘透明白
    const getDeltaColorClass = () => {
        if (delta === null || delta === undefined || delta === 0) return "text-zinc-400"; // 透明白色 (不刺眼)
        return delta > 0 ? "text-red-500 cyber-glow-red" : "text-[#00FF66]";              // 落後紅 / 超前綠
    };

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black tracking-[0.2em] text-zinc-500 racing-text">LAP DELTA</span>
            <span className={`mt-1 font-mono text-xl font-black tracking-tight racing-text transition-colors duration-150 ${getDeltaColorClass()}`}>
                {delta === null || delta === undefined
                    ? "0.00"
                    : `${formatSigned(delta, 2)}s`}
            </span>
        </div>
    );
}
