// src/useTelemetry.ts
import { create } from "zustand";

export type CornerKey = "fl" | "fr" | "rl" | "rr";
export type Quad = Record<CornerKey, number>;

export type WheelView = {
    label: string;
    cornerKey: CornerKey;
    steerDegrees: number;
    slipRatio: number;
    slipAngle: number;
    suspensionMeters: number;
    loadScore: number;
    ratioPercent: number;
    anglePercent: number;
    isRatioOut: boolean;
    isAngleOut: boolean;
    isRatioPeak: boolean;
    isAnglePeak: boolean;
};

export type BackendTelemetryData = {
    rpm: number;
    rpmMax: number;
    gear: number;
    speedKmh: number;
    throttle: number;
    brake: number;
    steer: number;
    acceleration: { x: number; y: number; z: number };
    gForce: { lateral: number; longitudinal: number };
    car: { drivetrain: number };
    slipRatio: Quad;
    slipAngle: Quad;
    suspensionMeters: Quad;
    lap: { number: number; racePosition: number };
};

type LegacyNormalizedTelemetry = {
    throttle: number;
    brake: number;
    lapDelta: number | null;
    gForce: { lateral: number; longitudinal: number };
    car: { drivetrain: number };
};

export type TelemetryStoreState = {
    connected: boolean;
    lastPacketAt: number | null;
    stale: boolean;
    telemetry: LegacyNormalizedTelemetry | null;
    rpmPercent: number;
    shiftOn: boolean;
    gearLabel: string;
    speedDisplay: number;
    gForceDot: { x: number; y: number };
    pedalOverlap: boolean;
    freeRoam: boolean;
    drivingInsights: {
        modeLabel: string;
        statusLabel: string;
        gripEfficiency: number;
        trailBrakingSmoothness: number;
        throttleCommit: string;
        rank: string;
    };
    wheels: Record<CornerKey, WheelView>;
    hubIp: string;
    setHubIp: (ip: string) => void;
    initWebSocket: (targetIp?: string) => void;
    closeWebSocket: () => void; // 🚀 新增：主動斷開與清理機制
    startMdnsDiscovery: () => void;
    setDisconnected: () => void;
};

const G_RANGE = 2.0;
const G_RIM_RADIUS = 44;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function createDefaultWheel(cornerKey: CornerKey): WheelView {
    return {
        label: cornerKey.toUpperCase(),
        cornerKey,
        steerDegrees: 0,
        slipRatio: 0,
        slipAngle: 0,
        suspensionMeters: 0,
        loadScore: 0,
        ratioPercent: 0,
        anglePercent: 0,
        isRatioOut: false,
        isAngleOut: false,
        isRatioPeak: false,
        isAnglePeak: false,
    };
}

const INITIAL_HUB_IP = localStorage.getItem("fh6_hub_ip") || "localhost";

// 🚀 執行緒安全的單例守衛：將實際的 WebSocket 實例移出 Zustand State，避免 React 重新渲染觸發複製
let activeWs: WebSocket | null = null;
let reconnectTimer: any = null;

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => {
    return {
        connected: false,
        lastPacketAt: null,
        stale: true,
        telemetry: null,
        rpmPercent: 0,
        shiftOn: false,
        gearLabel: "N",
        speedDisplay: 0,
        gForceDot: { x: 50, y: 50 },
        pedalOverlap: false,
        freeRoam: true,
        drivingInsights: {
            modeLabel: "[ STANDBY ]",
            statusLabel: "[ STANDBY ]",
            gripEfficiency: 100,
            trailBrakingSmoothness: 100,
            throttleCommit: "MATURE",
            rank: "B",
        },
        wheels: {
            fl: createDefaultWheel("fl"),
            fr: createDefaultWheel("fr"),
            rl: createDefaultWheel("rl"),
            rr: createDefaultWheel("rr"),
        },
        hubIp: INITIAL_HUB_IP,

        setHubIp: (ip) => {
            localStorage.setItem("fh6_hub_ip", ip);
            set({ hubIp: ip });
            get().closeWebSocket(); // IP 變更時，直接執行物理斷線重連
            get().initWebSocket(ip);
        },

        initWebSocket: (targetIp) => {
            const activeIp = targetIp || get().hubIp;
            const url = `ws://${activeIp}:8765`; 
            
            // 🚀 Singleton Guard 1: 如果目前連線正常，或者正在嘗試連線中，直接攔截，絕不建立第二條連線
            if (activeWs) {
                if (activeWs.readyState === WebSocket.OPEN || activeWs.readyState === WebSocket.CONNECTING) {
                    console.log(`[WS Guard] 偵測到已有連線實例存在 (${activeWs.url})，攔截重複連線請求。`);
                    return;
                }
                // 若殘留舊實例但已斷線，先清理
                get().closeWebSocket();
            }
            
            console.log(`[WS] 正在建立單一實例連線: ${url}`);
            
            const connect = () => {
                // 🚀 Singleton Guard 2: 雙重防禦
                if (activeWs && (activeWs.readyState === WebSocket.OPEN || activeWs.readyState === WebSocket.CONNECTING)) {
                    return;
                }

                activeWs = new WebSocket(url);

                activeWs.onopen = () => {
                    console.log(`[WS] 成功連線至 Hub: ${url}`);
                    set({ connected: true, stale: false });
                };

                activeWs.onmessage = (e) => {
                    try {
                        const parsed = JSON.parse(e.data);
                        if (parsed.type === "telemetry" && parsed.data)
                            get().updateTelemetry(parsed.data);
                    } catch {}
                };

                activeWs.onclose = (event) => {
                    console.log(`[WS] 連線關閉 (Code: ${event.code})。3秒後自動嘗試重連...`);
                    get().setDisconnected();
                    
                    // 清除可能殘留的計時器，避免堆疊
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => {
                        connect();
                    }, 3000);
                };

                activeWs.onerror = () => {
                    get().setDisconnected();
                };
            };

            connect();
        },

        // 🚀 物理斷線與資源清理
        closeWebSocket: () => {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (activeWs) {
                console.log("[WS Guard] 執行物理斷線與監聽器釋放。");
                activeWs.onopen = null;
                activeWs.onmessage = null;
                activeWs.onclose = null;
                activeWs.onerror = null;
                activeWs.close();
                activeWs = null;
            }
            set({ connected: false, stale: true });
        },

        startMdnsDiscovery: async () => {
            const isCapacitor = (window as any).Capacitor !== undefined;
            if (!isCapacitor) {
                return;
            }

            try {
                const { ZeroConf } = await import("capacitor-zeroconf");
                console.log("[mDNS] 正在透過 Capacitor 啟動 iPhone 原生 Bonjour 監聽: _fh6hub._tcp...");

                await ZeroConf.addListener('discover', (result: any) => {
                    if (result.action === 'resolved' && result.service) {
                        const service = result.service;
                        const ip = service.ipv4Addresses?.[0] || service.urls?.[0]?.split('/')?.[2]?.split(':')?.[0];
                        if (ip) {
                            console.log(`[mDNS] 成功自動定位 Windows Hub！IP: ${ip}, Port: ${service.port}`);
                            get().setHubIp(ip);
                            get().initWebSocket(ip);
                            
                            ZeroConf.unwatch({ type: '_fh6hub._tcp.', domain: 'local.' }).catch(() => {});
                        }
                    }
                });

                await ZeroConf.watch({ type: '_fh6hub._tcp.', domain: 'local.' });
            } catch (error) {
                console.error("[mDNS] 發生錯誤:", error);
            }
        },

        setDisconnected: () =>
            set({
                connected: false,
                stale: true,
                gearLabel: "N",
                speedDisplay: 0,
                gForceDot: { x: 50, y: 50 },
                freeRoam: true,
            }),

        updateTelemetry: (raw) => {
            const now = Date.now();
            const rpmPercent =
                raw.rpmMax > 0 ? clamp((raw.rpm / raw.rpmMax) * 100, 0, 100) : 0;

            const gForceDot = {
                x: 50 - (raw.gForce.lateral / G_RANGE) * G_RIM_RADIUS,
                y: 50 + (raw.gForce.longitudinal / G_RANGE) * G_RIM_RADIUS,
            };

            const isFreeRoam = raw.lap.number === 0 && raw.lap.racePosition === 0;

            const updatedWheels = (["fl", "fr", "rl", "rr"] as CornerKey[]).reduce(
                (acc, key) => {
                    let rawRatio = raw.slipRatio[key];
                    const rawAngle = Math.abs(raw.slipAngle[key]);

                    const isFront = key === "fl" || key === "fr";

                    if (isFront && rawRatio > 0 && raw.brake === 0) rawRatio = 0;
                    if (!isFront && rawRatio < 0 && raw.throttle === 0) rawRatio = 0;

                    const ratioMag = Math.abs(rawRatio);

                    const isRatioOut = ratioMag > 1.0;
                    const isAngleOut = rawAngle > 1.0;

                    const ratioPercent = isRatioOut ? 140 : ratioMag * 100;
                    const anglePercent = isAngleOut ? 140 : rawAngle * 100;

                    acc[key] = {
                        label: key.toUpperCase(),
                        cornerKey: key,
                        steerDegrees: isFront ? raw.steer * 27.7 : 0,
                        slipRatio: rawRatio,
                        slipAngle: raw.slipAngle[key],
                        suspensionMeters: raw.suspensionMeters[key],
                        loadScore: raw.suspensionMeters[key],
                        ratioPercent,
                        anglePercent,
                        isRatioOut,
                        isAngleOut,
                        isRatioPeak: false,
                        isAnglePeak: false,
                    };
                    return acc;
                },
                {} as Record<CornerKey, WheelView>,
            );

            set({
                connected: true,
                lastPacketAt: now,
                stale: false,
                rpmPercent,
                shiftOn: rpmPercent >= 95,
                gearLabel:
                    raw.gear === 0 ? "R" : raw.gear === 15 ? "N" : String(raw.gear),
                speedDisplay: Math.round(raw.speedKmh),
                gForceDot,
                pedalOverlap: raw.throttle > 0.1 && raw.brake > 0.1,
                freeRoam: isFreeRoam,
                telemetry: {
                    throttle: raw.throttle,
                    brake: raw.brake,
                    lapDelta: null,
                    gForce: raw.gForce,
                    car: raw.car,
                },
                drivingInsights: {
                    modeLabel: isFreeRoam ? "[ FREE ROAM ]" : `LAP ${raw.lap.number}`,
                    statusLabel: "LIVE",
                    gripEfficiency: 100,
                    trailBrakingSmoothness: 100,
                    throttleCommit: "MATURE",
                    rank: "A",
                },
                wheels: updatedWheels,
            });
        },
    };
});

export function useTelemetry() {
    const store = useTelemetryStore();
    
    if (typeof globalThis !== "undefined" && "WebSocket" in globalThis) {
        const isCapacitor = (globalThis as any).Capacitor !== undefined;
        if (!store.connected && !useTelemetryStore.getState().connected) {
            if (isCapacitor) {
                setTimeout(() => store.startMdnsDiscovery(), 0);
            } else {
                setTimeout(() => store.initWebSocket(), 0);
            }
        }
    }
    return store;
}
