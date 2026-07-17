// src/useTelemetry.ts
import { useEffect, useRef } from "react";
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
	closeWebSocket: () => void;
	startMdnsDiscovery: () => void;
	setDisconnected: () => void;
	updateTelemetry: (data: BackendTelemetryData) => void;
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

let activeWs: WebSocket | null = null;
let activeWsUrl = "";
let reconnectTimer: any = null;
let connectTimeoutTimer: any = null;
let isNativeListenerAttached = false;

function parseHubEndpoint(target: string): { host: string; port: number } {
	const trimmed = target.trim();
	if (!trimmed) {
		return { host: "", port: 8765 };
	}

	const candidate = trimmed.includes("://") ? trimmed : `ws://${trimmed}`;

	try {
		const parsed = new URL(candidate);
		return {
			host: parsed.hostname.replace(/\.$/, ""),
			port: parsed.port ? Number(parsed.port) : 8765,
		};
	} catch {
		return {
			host: trimmed.replace(/\.$/, ""),
			port: 8765,
		};
	}
}

export function buildWebSocketUrl(target: string): string {
	const endpoint = parseHubEndpoint(target);
	if (!endpoint.host) return "ws://localhost:8765";
	return `ws://${endpoint.host}:${endpoint.port}`;
}

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
		hubIp: localStorage.getItem("fh6_hub_ip") || "localhost",

		setHubIp: (ip) => {
			localStorage.setItem("fh6_hub_ip", ip);
			set({ hubIp: ip });
		},

		initWebSocket: (targetIp) => {
			const activeTarget = targetIp || get().hubIp;
			const url = buildWebSocketUrl(activeTarget);

			if (activeWs) {
				if (activeWsUrl !== url) {
					get().closeWebSocket();
				} else if (
					activeWs.readyState === WebSocket.OPEN ||
					activeWs.readyState === WebSocket.CONNECTING
				) {
					return;
				} else {
					get().closeWebSocket();
				}
			}

			console.log(`[WS Pipeline] 建立單例連線至: ${url}`);

			const connect = () => {
				if (
					activeWs &&
					(activeWs.readyState === WebSocket.OPEN ||
						activeWs.readyState === WebSocket.CONNECTING)
				) {
					return;
				}

				activeWsUrl = url;
				activeWs = new WebSocket(url);

				if (connectTimeoutTimer) {
					clearTimeout(connectTimeoutTimer);
				}
				connectTimeoutTimer = setTimeout(() => {
					if (activeWs && activeWs.readyState === WebSocket.CONNECTING) {
						console.error(`[WS] 連線逾時未完成: ${url}`);
						activeWs.close();
					}
				}, 6000);

				activeWs.onopen = () => {
					if (connectTimeoutTimer) {
						clearTimeout(connectTimeoutTimer);
						connectTimeoutTimer = null;
					}
					console.log(`[WS] 成功連線: ${url}`);
					set({ connected: true, stale: false });

					// 🚀 物理斷開，不再依賴 capacitor-zeroconf import
					const capacitor = (window as any).Capacitor;
					if (capacitor && capacitor.Plugins.MdnsBridge) {
						capacitor.Plugins.MdnsBridge.stopDiscovery();
					}
				};

				activeWs.onmessage = (e) => {
					try {
						const parsed = JSON.parse(e.data);
						if (parsed.type === "telemetry" && parsed.data)
							get().updateTelemetry(parsed.data);
					} catch {}
				};

				activeWs.onclose = () => {
					if (connectTimeoutTimer) {
						clearTimeout(connectTimeoutTimer);
						connectTimeoutTimer = null;
					}
					console.log(`[WS] 連線已中斷: ${url}。重新啟動 mDNS 搜尋...`);
					get().setDisconnected();

					const capacitor = (window as any).Capacitor;
					if (capacitor) {
						if (reconnectTimer) clearTimeout(reconnectTimer);
						reconnectTimer = setTimeout(() => {
							get().startMdnsDiscovery();
						}, 2000);
					} else {
						if (reconnectTimer) clearTimeout(reconnectTimer);
						reconnectTimer = setTimeout(() => connect(), 3000);
					}
				};

				activeWs.onerror = (event) => {
					console.error(`[WS] 連線錯誤: ${url}`, event);
					get().setDisconnected();
				};
			};

			connect();
		},

		closeWebSocket: () => {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			if (connectTimeoutTimer) {
				clearTimeout(connectTimeoutTimer);
				connectTimeoutTimer = null;
			}
			if (activeWs) {
				activeWs.onopen = null;
				activeWs.onmessage = null;
				activeWs.onclose = null;
				activeWs.onerror = null;
				activeWs.close();
				activeWs = null;
			}
			activeWsUrl = "";
			set({ connected: false, stale: true });
		},

		// 🚀 【完全移除舊第三方套件 import，改為直接對接我們手刻的本地原生 MdnsBridge 插件】
		startMdnsDiscovery: async () => {
			const capacitor = (window as any).Capacitor;
			if (!capacitor) {
				console.log("[mDNS Web] 瀏覽器環境，直接連線 localhost。");
				get().initWebSocket("localhost");
				return;
			}

			// 🚀 關鍵修改：直接從 Capacitor 的全域 Plugins 容器動態讀取，
			// 這樣 Vite 編譯時就不會去解析 node_modules，100% 繞過靜態編譯限制！
			const MdnsBridge = capacitor.Plugins.MdnsBridge;
			if (!MdnsBridge) {
				console.error(
					"[mDNS Native] 找不到自製原生 MdnsBridge 插件，請確認 Xcode 註冊正確。",
				);
				return;
			}

			try {
				if (!isNativeListenerAttached) {
					// 綁定自製插件的監聽器
					await MdnsBridge.addListener("onHubDiscovered", (data: any) => {
						const discoveredTarget = data?.url || data?.host || data?.ip || "";
						if (discoveredTarget) {
							console.log(
								`[mDNS Discovery] 🚀 自動發現 Windows Hub! Target: ${buildWebSocketUrl(discoveredTarget)}`,
							);
							get().setHubIp(discoveredTarget);
							get().initWebSocket(discoveredTarget);
						}
					});
					isNativeListenerAttached = true;
				}

				console.log("[mDNS Native] 呼叫 iOS Swift 原生網路框架尋找 Hub...");
				await MdnsBridge.startDiscovery();
			} catch (err) {
				console.error("[mDNS Native] 啟動自動發現失敗: ", err);
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

		updateTelemetry: (raw: BackendTelemetryData) => {
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
					acc[key] = {
						label: key.toUpperCase(),
						cornerKey: key,
						steerDegrees: isFront ? raw.steer * 27.7 : 0,
						slipRatio: rawRatio,
						slipAngle: raw.slipAngle[key],
						suspensionMeters: raw.suspensionMeters[key],
						loadScore: raw.suspensionMeters[key],
						ratioPercent: ratioMag > 1.0 ? 140 : ratioMag * 100,
						anglePercent: rawAngle > 1.0 ? 140 : rawAngle * 100,
						isRatioOut: ratioMag > 1.0,
						isAngleOut: rawAngle > 1.0,
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
	const autoStartRef = useRef(false);

	useEffect(() => {
		if (autoStartRef.current) return;
		autoStartRef.current = true;

		if (typeof globalThis === "undefined" || !("WebSocket" in globalThis)) {
			return;
		}

		const isCapacitor = (globalThis as any).Capacitor !== undefined;
		if (store.connected || useTelemetryStore.getState().connected) {
			return;
		}

		const timer = setTimeout(() => {
			if (isCapacitor) {
				store.startMdnsDiscovery();
			} else {
				store.initWebSocket();
			}
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, [store]);
	return store;
}
