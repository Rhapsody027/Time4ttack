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
	initWebSocket: () => void;
	updateTelemetry: (data: BackendTelemetryData) => void;
	setDisconnected: () => void;
};

const WS_URL = import.meta.env.VITE_FH6_WS_URL ?? "ws://localhost:3001";
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

		initWebSocket: () => {
			if (ws) return;
			const connect = () => {
				ws = new WebSocket(WS_URL);
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

		setDisconnected: () =>
			set({
				connected: false,
				stale: true,
				gearLabel: "--",
				speedDisplay: 0,
				gForceDot: { x: 50, y: 50 },
				freeRoam: true,
			}),

		updateTelemetry: (raw) => {
			const now = Date.now();
			const rpmPercent =
				raw.rpmMax > 0 ? clamp((raw.rpm / raw.rpmMax) * 100, 0, 100) : 0;

			// 🚀 最原始幾何映射：直接相加
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

					// 🚀 物理單向濾網：徹底抹平解除鎖死/鬆油門時的反彈二次雜訊
					if (isFront && rawRatio > 0 && raw.brake === 0) rawRatio = 0;
					if (!isFront && rawRatio < 0 && raw.throttle === 0) rawRatio = 0;

					const ratioMag = Math.abs(rawRatio);

					// 🚀 拔除 Peak 藍色臨界判定，只保留純粹的 1.0 破框失控紅色警告
					const isRatioOut = ratioMag > 1.0;
					const isAngleOut = rawAngle > 1.0;

					// 幾何百分比計算
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
						isRatioPeak: false, // 🚀 永久鎖死為 false
						isAnglePeak: false, // 🚀 永久鎖死為 false
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
		if (!store.connected && !useTelemetryStore.getState().connected) {
			setTimeout(() => store.initWebSocket(), 0);
		}
	}
	return store;
}
