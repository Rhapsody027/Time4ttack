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
	isTireExploded: boolean;
	ratioPercent: number;
	anglePercent: number;
	ratioWarning: boolean;
	angleWarning: boolean;
	ratioInBand: boolean;
	angleInBand: boolean;
};

// 🚀 對齊後端 Bun 吐出來的全新無殼物理 JSON 資料模型
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
	lap: {
		number: number;
		racePosition: number;
	};
};

// 🚀 為了相容原本的 Fh6Dashboard UI，保留這個結構模型
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
	telemetry: LegacyNormalizedTelemetry | null; // 給 UI 讀取基礎 G 值與踏板
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

	// 🚀 動作（Actions）
	initWebSocket: () => void;
	updateTelemetry: (data: BackendTelemetryData) => void;
	setDisconnected: () => void;
};

const WS_URL = import.meta.env.VITE_FH6_WS_URL ?? "ws://localhost:3001";
const G_RANGE = 2;
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
		isTireExploded: false,
		ratioPercent: 0,
		anglePercent: 0,
		ratioWarning: false,
		angleWarning: false,
		ratioInBand: false,
		angleInBand: false,
	};
}

// 🚀 建立 Zustand 全域狀態大腦
export const useTelemetryStore = create<TelemetryStoreState>((set, get) => {
	let ws: WebSocket | null = null;

	return {
		connected: false,
		lastPacketAt: null,
		stale: true,
		telemetry: null,
		rpmPercent: 0,
		shiftOn: false,
		gearLabel: "--",
		speedDisplay: 0,
		gForceDot: { x: 50, y: 50 },
		pedalOverlap: false,
		freeRoam: true,
		drivingInsights: {
			modeLabel: "[ STANDBY / FREE ROAM MODE ]",
			statusLabel: "[ STANDBY / FREE ROAM MODE ]",
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

		initWebSocket: () => {
			if (ws) return; // 避免重複連線

			const connect = () => {
				ws = new WebSocket(WS_URL);

				ws.onopen = () => {
					set({ connected: true, stale: false });
				};

				ws.onmessage = (event) => {
					try {
						const parsed = JSON.parse(event.data);
						if (parsed.type === "telemetry" && parsed.data) {
							get().updateTelemetry(parsed.data);
						}
					} catch (e) {
						// 忽略解析錯誤
					}
				};

				ws.onclose = () => {
					get().setDisconnected();
					setTimeout(connect, 3000); // 3秒後自動重連
				};

				ws.onerror = () => {
					get().setDisconnected();
				};
			};

			connect();
		},

		setDisconnected: () => {
			set({
				connected: false,
				stale: true,
				gearLabel: "--",
				speedDisplay: 0,
				gForceDot: { x: 50, y: 50 },
				freeRoam: true,
				drivingInsights: {
					modeLabel: "[ DISCONNECTED / WAITING FOR FH6 GAME DATA ]",
					statusLabel: "[ DISCONNECTED / WAITING FOR FH6 GAME DATA ]",
					gripEfficiency: 100,
					trailBrakingSmoothness: 100,
					throttleCommit: "--",
					rank: "--",
				},
			});
		},

		// 🚀 核心衍生數據加工廠 (Derived Data)
		updateTelemetry: (raw) => {
			const now = Date.now();
			const rpmPercent =
				raw.rpmMax > 0 ? clamp((raw.rpm / raw.rpmMax) * 100, 0, 100) : 0;

			// G力圓盤幾何座標映射
			const gForceDot = {
				x: 50 - (raw.gForce.lateral / G_RANGE) * G_RIM_RADIUS,
				y: 50 + (raw.gForce.longitudinal / G_RANGE) * G_RIM_RADIUS,
			};

			const isFreeRoam = raw.lap.number === 0 && raw.lap.racePosition === 0;

			// 自適應多車型閥值切換 (利用轉速上限判斷廠車與街車)
			const isRaceCar = raw.rpmMax > 7800;
			const profile = isRaceCar
				? { ratioBlue: 0.15, ratioRed: 0.35, angleBlue: 0.12, angleRed: 0.25 } // 緊繃賽車熱熔胎
				: { ratioBlue: 0.3, ratioRed: 0.7, angleBlue: 0.2, angleRed: 0.45 }; // 高容忍度街胎

			// 四輪視圖數據直接加工
			const updatedWheels = (["fl", "fr", "rl", "rr"] as CornerKey[]).reduce(
				(acc, key) => {
					const slipRatio = raw.slipRatio[key];
					const slipAngle = raw.slipAngle[key];
					const suspensionMeters = raw.suspensionMeters[key];

					const cleanRatio = Math.abs(slipRatio) < 0.02 ? 0 : slipRatio;
					const ratioMagnitude = Math.abs(cleanRatio);
					const angleMagnitude = Math.abs(slipAngle);

					const ratioInBand =
						ratioMagnitude >= profile.ratioBlue &&
						ratioMagnitude <= profile.ratioRed;
					const angleInBand =
						angleMagnitude >= profile.angleBlue &&
						angleMagnitude <= profile.angleRed;

					const ratioWarning = ratioMagnitude > profile.ratioRed;
					const angleWarning = angleMagnitude > profile.angleRed;

					acc[key] = {
						label: key.toUpperCase(),
						cornerKey: key,
						steerDegrees: key === "fl" || key === "fr" ? raw.steer * 27.7 : 0,
						slipRatio: cleanRatio,
						slipAngle,
						suspensionMeters,
						loadScore: suspensionMeters, // 直接透傳數據由前端複合計算
						isTireExploded: ratioWarning || angleWarning,
						ratioPercent: ratioWarning
							? 140
							: Math.min(100, (ratioMagnitude / profile.ratioBlue) * 50),
						anglePercent: angleWarning
							? 140
							: Math.min(100, (angleMagnitude / profile.angleBlue) * 50),
						ratioWarning,
						angleWarning,
						ratioInBand,
						angleInBand,
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
					modeLabel: isFreeRoam
						? "[ STANDBY / FREE ROAM MODE ]"
						: `LAP ${raw.lap.number}`,
					statusLabel: isFreeRoam
						? "[ STANDBY / FREE ROAM MODE ]"
						: `LAP ${raw.lap.number} LIVE`,
					gripEfficiency: 100, // 診斷引擎留待下一步處理
					trailBrakingSmoothness: 100,
					throttleCommit: "MATURE",
					rank: "A",
				},
				wheels: updatedWheels,
			});
		},
	};
});

// 🚀 終極無痛針腳對齊：保留原本的 useTelemetry 導出，讓 Fh6Dashboard 完全不需修改程式碼
export function useTelemetry() {
	const store = useTelemetryStore();

	// 安全檢查執行環境，只有在瀏覽器端才初始化 WebSocket
	if (typeof globalThis !== "undefined" && "WebSocket" in globalThis) {
		if (!store.connected && !useTelemetryStore.getState().connected) {
			setTimeout(() => store.initWebSocket(), 0);
		}
	}

	return store;
}
