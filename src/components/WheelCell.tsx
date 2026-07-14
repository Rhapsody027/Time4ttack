// src/components/WheelCell.tsx
import { useEffect, useRef } from "react";
import { useTelemetryStore, type CornerKey, type TelemetryStoreState } from "../useTelemetry";

type SmokeParticle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    maxSize: number;
    alpha: number;
    life: number;
    maxLife: number;
};

export function WheelCell({ cornerKey }: { cornerKey: CornerKey }) {
    const wheel = useTelemetryStore((state: TelemetryStoreState) => state.wheels[cornerKey]);
    const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);
    const telemetry = useTelemetryStore((state: TelemetryStoreState) => state.telemetry);

    const isFront = cornerKey === "fl" || cornerKey === "fr";
    const steerRotation = isFront ? wheel.steerDegrees : 0;
    
    const isRearSpinning = !isFront && wheel.isRatioOut && wheel.slipRatio > 0;
    const isFrontLockup = isFront && wheel.isRatioOut && wheel.slipRatio < 0;
    const isAnyOut = wheel.isRatioOut || wheel.isAngleOut;

    const smokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<SmokeParticle[]>([]);

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
    
    const groundLoadGlow =
        totalDynamicWeight > 0.12
            ? `radial-gradient(circle at center, rgba(255, 0, 85, ${Math.min(totalDynamicWeight * 0.22, 0.25)}) 0%, transparent 75%)`
            : "transparent";

    // 🚀 【3px 外框與卡鉗夾緊動態重構】
    let outerBorderStyle: React.CSSProperties = {
        borderRadius: "5px",
        padding: "3px", // 確保外框厚度絕對固定為 3px
        transition: "transform 0.08s ease-out" // 控制卡鉗向內夾緊動態的平滑度
    };

    let outerBg = "#1a1b23"; // 預設暗灰色
    let tireScale = "scale(1)"; // 預設無夾緊

    if (isFront && isFrontLockup) {
        // 1. 前輪煞車鎖死：
        // 🚀 卡鉗向內夾緊：當煞車鎖死時，整體外殼做微幅的向內收斂，模擬多活塞向內死咬碟盤的機械夾力
        tireScale = "scale(0.96)"; 

        if (isAnyOut) {
            // 🚀 共存狀態：漸層端點改為失控紅（#FF0055），與上下失控完美融合，不露一絲黑！
            outerBg = "linear-gradient(to bottom, #FF0055 0%, #FF0055 20%, #FF4400 40%, #FF7700 60%, #FF0055 80%, #FF0055 100%)";
        } else {
            // 單純煞車鎖死：左右卡鉗漸層橘，其餘部分維持輪胎暗黑（#020204）
            outerBg = "linear-gradient(to bottom, #020204 15%, #FF4400 35%, #FF7700 65%, #020204 85%)";
        }
    } else if (isAnyOut) {
        // 2. 單純側向/縱向失控：3px 剛硬實心賽車紅框 (前後輪一致)
        outerBg = "#FF0055";
    }

    // Canvas 胎煙引擎
    useEffect(() => {
        if (isFront || stale) return;

        const canvas = smokeCanvasRef.current;
        if (!canvas) return;

        canvas.width = 120;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;

        const updateAndDrawParticles = () => {
            ctx.clearRect(0, 0, 120, 160);

            if (useTelemetryStore.getState().wheels[cornerKey].isRatioOut && useTelemetryStore.getState().wheels[cornerKey].slipRatio > 0) {
                const spawnCount = 3; 
                for (let i = 0; i < spawnCount; i++) {
                    particlesRef.current.push({
                        x: 60 + (Math.random() - 0.5) * 40, 
                        y: 34,                              
                        vx: (Math.random() - 0.5) * 3.8,    
                        vy: 4.0 + Math.random() * 3.5,      
                        size: 6 + Math.random() * 4,        
                        maxSize: 34 + Math.random() * 10,   
                        alpha: 0.35,                        
                        life: 0,
                        maxLife: 24 + Math.random() * 10    
                    });
                }
            }

            const particles = particlesRef.current;
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]!;
                p.life++;

                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }

                p.x += p.vx;
                p.y += p.vy;
                const lifeRatio = p.life / p.maxLife;
                p.size = p.size + (p.maxSize - p.size) * lifeRatio;
                
                let currentAlpha = 0.35 * Math.pow(1 - lifeRatio, 2.5);
                if (lifeRatio < 0.2) {
                    currentAlpha *= (lifeRatio / 0.2); 
                }
                p.alpha = currentAlpha;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.filter = "blur(5px)";
                
                const grad = ctx.createRadialGradient(p.x, p.y, p.size * 0.05, p.x, p.y, p.size);
                grad.addColorStop(0, "rgba(240, 242, 250, 0.95)");
                grad.addColorStop(0.4, "rgba(205, 208, 218, 0.5)");
                grad.addColorStop(1, "transparent");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            animationId = requestAnimationFrame(updateAndDrawParticles);
        };

        updateAndDrawParticles();
        return () => cancelAnimationFrame(animationId);
    }, [isFront, stale, cornerKey]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="relative flex h-28 w-20 items-center justify-center overflow-visible">
                
                {/* 輪胎位置標籤 */}
                <span className={`absolute ${
                    cornerKey === "fl" ? "top-0 left-0" : 
                    cornerKey === "fr" ? "top-0 right-0" : 
                    cornerKey === "rl" ? "bottom-0 left-0" : "bottom-0 right-0"
                } text-[9px] font-black tracking-widest racing-text ${isAnyOut ? "text-[#FF0055]" : "text-zinc-600"}`}>
                    {wheel.label}
                </span>

                {/* 旋轉底盤容器 */}
                <div 
                    className="absolute h-22 w-14 flex items-center justify-center overflow-visible"
                    style={{ transform: `rotate(${steerRotation}deg)` }}
                >
                    {/* 【地表荷重投影】 (Z-10) */}
                    <div 
                        className="absolute inset-0 -m-6 pointer-events-none rounded-full z-10"
                        style={{ 
                            background: groundLoadGlow,
                            filter: "blur(10px)",
                            opacity: stale ? 0 : 1
                        }}
                    />

                    {/* 【後輪專用：Canvas 胎煙引擎】 (Z-30) */}
                    {!isFront && (
                        <canvas 
                            ref={smokeCanvasRef}
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[160px] pointer-events-none z-30 overflow-visible"
                            style={{ transformOrigin: "50% 44px" }}
                        />
                    )}

                    {/* 🚀 【F1 實體外框】 (Z-20) 
                         - 利用 outerBg 統一渲染 3px 的失控紅/卡鉗橘漸層
                         - 利用 transform: tireScale 實現煞車鎖死向內微縮(夾緊)動態 */}
                    <div
                        className="absolute inset-0 overflow-hidden z-20"
                        style={{
                            opacity: stale ? 0.25 : 1,
                            background: outerBg,
                            transform: tireScale,
                            boxShadow: isAnyOut && !isFrontLockup ? "0 0 15px rgba(255, 0, 85, 0.4)" : "none",
                            ...outerBorderStyle
                        }}
                    >
                        {/* 內層實體光頭胎（遮擋漸層，露出 3px 外框） */}
                        <div 
                            className="w-full h-full relative bg-black flex items-center justify-center"
                            style={{
                                borderRadius: "3px",
                                backgroundImage: "linear-gradient(90deg, #020204 0%, #0a0b0e 25%, #101115 50%, #0a0b0e 75%, #020204 100%)"
                            }}
                        >
                            {/* 胎面中央極細基準線 */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 opacity-10 pointer-events-none bg-zinc-600" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
