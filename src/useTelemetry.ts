// src/useTelemetry.ts
import { create } from "zustand";
import { ZeroConf } from "capacitor-zeroconf";

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
    startMdnsTest: () => void; // 🚀 mDNS 單純搜尋測試 Action
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

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => {
    let ws: WebSocket | null = null;

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
            if (ws) {
                ws.close();
            }
        },

        initWebSocket: (targetIp) => {
            const activeIp = targetIp || get().hubIp;
            const url = `ws://${activeIp}:8765`; 
            
            console.log(`[WS] Trying to connect to: ${url}`);
            
            const connect = () => {
                if (ws && ws.readyState === WebSocket.CONNECTING) return;
                
                ws = new WebSocket(url);
                ws.onopen = () => set({ connected: true, stale: false });
                ws.onmessage = (e) => {
                    try {
                        const parsed = JSON.parse(e.data);
                        if (parsed.type === "telemetry" && parsed.data)
                            get().updateTelemetry(parsed.data);
                    } catch {}
                };
                ws.onclose = () => {
                    get().setDisconnected();
                    setTimeout(connect, 3000);
                };
                ws.onerror = () => get().setDisconnected();
            };
            connect();
        },

        // 🚀 【mDNS 單純搜尋測試，不連動 WebSocket 建立】
        startMdnsTest: () => {
            const isCapacitor = (window as any).Capacitor !== undefined;
            if (!isCapacitor) {
                console.log("[mDNS Test] 瀏覽器環境，跳過原生 Bonjour 搜尋。");
                return;
            }

            console.log("[mDNS Test] 正在開啟 iPhone 原生 Bonjour 監聽: _fh6hub._tcp.local...");

            try {
                // 1. 設定原生事件監聽
                ZeroConf.addListener('discover', (result: any) => {
                    console.log(`[mDNS Test] 偵測到服務 [Action: ${result.action}]:`, result);
                    if (result.action === 'resolved' && result.service) {
                        const service = result.service;
                        const ip = service.ipv4Addresses?.[0] || service.urls?.[0]?.split('/')?.[2]?.split(':')?.[0];
                        console.log(`[mDNS Test] 🚀 成功自動解析！裝置名稱: ${service.name}, 取得 IP: ${ip}, Port: ${service.port}`);
                    }
                }).then(() => {
                    // 2. 啟動 watch，監聽服務
                    ZeroConf.watch({ type: '_fh6hub._tcp.', domain: 'local.' })
                        .then((res: any) => console.log('[mDNS Test] watch 啟動成功，等待廣播...', res))
                        .catch((err: any) => console.error('[mDNS Test] watch 啟動失敗:', err));
                });
            } catch (error) {
                console.error("[mDNS Test] 呼叫 capacitor-zeroconf 失敗: ", error);
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
            // 🚀 實機上，掛載時僅開啟 mDNS 測試，先不主動呼叫 initWebSocket 
            if (isCapacitor) {
                setTimeout(() => store.startMdnsTest(), 0);
            } else {
                setTimeout(() => store.initWebSocket(), 0);
            }
        }
    }
    return store;
}
