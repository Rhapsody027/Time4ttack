// server/decoder.ts (雙棲通用極速版)
import type { Quad, BackendTelemetryData } from "../src/useTelemetry";

export const HORIZON_CAR_DASH_BYTES = 324;
const HORIZON_DASH_BASE = 244;

const msToKmh = (ms: number): number => ms * 3.6;

/**
 * 🚀 雙棲通用解包器：支援 Node.js (Buffer) 與手機前端 (ArrayBuffer / Uint8Array)
 * 使用瀏覽器與原生底層效能極高的 DataView，消滅任何平台相容性與記憶體複製開銷
 */
export function decodeFh6Packet(
	arrayBuffer: ArrayBuffer | Uint8Array,
): BackendTelemetryData | null {
	// 統一轉換為 ArrayBuffer
	const buf =
		arrayBuffer instanceof Uint8Array ? arrayBuffer.buffer : arrayBuffer;

	if (buf.byteLength !== HORIZON_CAR_DASH_BYTES) return null;

	const view = new DataView(buf);

	// 使用 DataView 進行極速小端序（Little-Endian, LE）二進位直讀
	const f32 = (o: number) => view.getFloat32(o, true);
	const u8 = (o: number) => view.getUint8(o);
	const s8 = (o: number) => view.getInt8(o);
	const s32 = (o: number) => view.getInt32(o, true);
	const u16 = (o: number) => view.getUint16(o, true);

	const readQuad = (o: number): Quad => ({
		fl: f32(o),
		fr: f32(o + 4),
		rl: f32(o + 8),
		rr: f32(o + 12),
	});

	const d = HORIZON_DASH_BASE;

	const latAccel = f32(20);
	const longAccel = f32(28);

	return {
		rpm: f32(16),
		rpmMax: f32(8),
		gear: u8(d + 75),
		speedKmh: msToKmh(f32(d + 12)),

		throttle: u8(d + 71) / 255,
		brake: u8(d + 72) / 255,
		steer: s8(d + 76) / 127,

		acceleration: {
			x: latAccel,
			y: f32(24),
			z: longAccel,
		},

		gForce: {
			lateral: latAccel / 9.80665,
			longitudinal: longAccel / 9.80665,
		},

		car: { drivetrain: s32(224) },
		slipRatio: readQuad(84),
		slipAngle: readQuad(164),
		suspensionMeters: readQuad(196),
		lap: { number: u16(d + 68), racePosition: u8(d + 70) },
	};
}
