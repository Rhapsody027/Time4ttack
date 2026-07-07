// server/decoder.ts
import type { Quad, BackendTelemetryData } from "../src/useTelemetry";

export const HORIZON_CAR_DASH_BYTES = 324;
const HORIZON_DASH_BASE = 244;

const msToKmh = (ms: number): number => ms * 3.6;

export function decodeFh6Packet(buf: Buffer): BackendTelemetryData | null {
	if (buf.length !== HORIZON_CAR_DASH_BYTES) return null;

	const f32 = (o: number) => buf.readFloatLE(o);
	const u8 = (o: number) => buf.readUInt8(o);
	const s8 = (o: number) => buf.readInt8(o);
	const s32 = (o: number) => buf.readInt32LE(o);
	const u16 = (o: number) => buf.readUInt16LE(o);

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
