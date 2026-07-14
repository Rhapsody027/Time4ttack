// src/components/WheelCell.tsx
import { useTelemetryStore, type CornerKey, type TelemetryStoreState } from "../useTelemetry";

export function WheelCell({ cornerKey }: { cornerKey: CornerKey }) {
    const wheel = useTelemetryStore((state: TelemetryStoreState) => state.wheels[cornerKey]);
    const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);
    const telemetry = useTelemetryStore((state: TelemetryStoreState) => state.telemetry);

    const isFront = cornerKey === "fl" || cornerKey === "fr";
    const steerRotation = isFront ? wheel.steerDegrees : 0;
    const isAnyOut = wheel.isRatioOut || wheel.isAngleOut;

    const borderColor = isAnyOut ? "#FF0055" : "#1f1f2e";
    const shadow = isAnyOut ? "0 0 15px rgba(255, 0, 85, 0.5)" : "none";

    const latG = telemetry?.gForce.lateral ?? 0;
    const lngG = telemetry?.gForce.longitudinal ?? 0;

    const isRightSide = cornerKey === "fr" || cornerKey === "rr";
    const isFrontSide = cornerKey === "fl" || cornerKey === "fr";

    let longLoad = 0;
    let latLoad = 0;

    if (lngG < 0 && isFrontSide) {
        longLoad = Math.abs(lngG) * 0.6;
    } else if (lngG > 0 && !isFrontSide) {
        longLoad = lngG * 0.4;
    }

    if (latG < 0 && isRightSide) {
        latLoad = Math.abs(latG) * 0.6;
    } else if (latG > 0 && !isRightSide) {
        latLoad = latG * 0.6;
    }

    const totalDynamicWeight = longLoad + latLoad;
    const loadGlow =
        totalDynamicWeight > 0.15
            ? `radial-gradient(circle at center, rgba(255, 0, 85, ${Math.min(totalDynamicWeight * 0.4, 0.6)}) 0%, transparent 80%)`
            : "transparent";

    const ratioDirection = wheel.slipRatio >= 0 ? "down" : "up";
    const angleDirection = wheel.slipAngle <= 0 ? "left" : "right";

    const ratioHeightStyle = wheel.isRatioOut ? "75%" : `${(wheel.ratioPercent / 100) * 50}%`;

    const isLatGZero = Math.abs(latG) < 0.15;
    const angleWidthStyle = wheel.isAngleOut ? "75%" : isLatGZero ? "0%" : `${(wheel.anglePercent / 100) * 50}%`;

    return (
        <div className="flex h-full w-full items-center justify-center">
            {/* 無外框、無背景卡片 */}
            <div className="relative flex h-28 w-20 items-center justify-center overflow-visible">
                
                {/* 輪胎位置代號標籤 */}
                <span className={`absolute ${
                    cornerKey === "fl" ? "top-0 left-0" : 
                    cornerKey === "fr" ? "top-0 right-0" : 
                    cornerKey === "rl" ? "bottom-0 left-0" : "bottom-0 right-0"
                } text-[9px] font-black tracking-widest racing-text ${isAnyOut ? "text-red-500" : "text-zinc-600"}`}>
                    {wheel.label}
                </span>

                {/* 輪胎主體 */}
                <div
                    className="absolute h-20 w-10 rounded-sm bg-[#040407]/90 z-10 transition-all duration-75 border"
                    style={{
                        transform: `rotate(${steerRotation}deg)`,
                        borderColor,
                        opacity: stale ? 0.25 : 1,
                        boxShadow: shadow,
                        background: loadGlow,
                    }}
                >
                    {/* 胎紋中線 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 opacity-10 pointer-events-none bg-zinc-600" />
                    
                    {isAnyOut && (
                        <div className="absolute inset-0 bg-red-950/10 pointer-events-none" />
                    )}

                    {/* 縱向動態滑移 */}
                    <div
                        className="absolute left-1/2 w-0.5 rounded-full z-20 transition-all duration-75"
                        style={{
                            top: "50%",
                            height: ratioHeightStyle,
                            background: wheel.isRatioOut ? "#FF0055" : "#52525b",
                            boxShadow: wheel.isRatioOut ? "0 0 6px #FF0055" : "none",
                            transform: ratioDirection === "down" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
                        }}
                    />

                    {/* 橫向側滑滑移 (前輪適用) */}
                    {isFront && (
                        <div
                            className="absolute top-1/2 h-0.5 rounded-full z-20 origin-left transition-all duration-75"
                            style={{
                                left: "50%",
                                width: angleWidthStyle,
                                background: wheel.isAngleOut ? "#FF0055" : "#52525b",
                                boxShadow: wheel.isAngleOut ? "0 0 6px #FF0055" : "none",
                                transform: angleDirection === "right" ? "translateY(-50%) scaleX(1)" : "translateY(-50%) scaleX(-1)",
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
