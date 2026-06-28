export interface CornerQuad {
  fl: number;
  fr: number;
  rl: number;
  rr: number;
}

export interface DecodedTelemetry {
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
  slipRatio: CornerQuad;
  slipAngle: CornerQuad;
  suspensionMeters: CornerQuad;
  lap: {
    number: number;
    racePosition: number;
  };
}

export function decodeFh6Packet(buf: Buffer): DecodedTelemetry | null {
  // Forza V2 Data Out 封包標準長度為 324 bytes
  if (buf.length < 311) return null;

  // 1. 基礎駕駛數據
  const rpm = buf.readFloatLE(16);
  const rpmMax = buf.readFloatLE(8);
  const gear = buf.readUInt8(307); // 0=R, 15=N, 1..6=Gears
  const speedMps = buf.readFloatLE(244); // 原始單位為每秒公尺
  const speedKmh = speedMps * 3.6;

  const throttle = buf.readUInt8(308) / 255;
  const brake = buf.readUInt8(309) / 255;
  const steer = buf.readInt8(320) / 127; // 歸一化到 -1.0 ~ 1.0

  // 2. 🚀 局部車體三軸加速度 (Offset: X=232, Y=236, Z=240)
  const accelX = buf.readFloatLE(232); // X
  const accelY = buf.readFloatLE(236); // Y
  const accelZ = buf.readFloatLE(240); // Z

  // 3. 四輪打滑生數據
  const slipRatio = {
    fl: buf.readFloatLE(112),
    fr: buf.readFloatLE(116),
    rl: buf.readFloatLE(120),
    rr: buf.readFloatLE(124),
  };

  const slipAngle = {
    fl: buf.readFloatLE(128),
    fr: buf.readFloatLE(132),
    rl: buf.readFloatLE(136),
    rr: buf.readFloatLE(140),
  };

  const suspensionMeters = {
    fl: buf.readFloatLE(64),
    fr: buf.readFloatLE(68),
    rl: buf.readFloatLE(72),
    rr: buf.readFloatLE(76),
  };

  // 4. 比賽單圈與傳動
  const lapNumber = buf.readUInt16LE(292);
  const racePosition = buf.readUInt8(306);
  const drivetrain = buf.readUInt32LE(212); // 0=FWD, 1=RWD, 2=AWD

  return {
    rpm,
    rpmMax,
    gear,
    speedKmh,
    throttle,
    brake,
    steer,
    acceleration: { x: accelX, y: accelY, z: accelZ },
    gForce: {
      lateral: accelX / 9.80665,
      longitudinal: accelY / 9.80665,
    },
    car: { drivetrain },
    slipRatio,
    slipAngle,
    suspensionMeters,
    lap: {
      number: lapNumber,
      racePosition,
    },
  };
}
