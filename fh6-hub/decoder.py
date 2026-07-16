# fh6-hub/decoder.py
import struct
from typing import Dict, Any, Optional

HORIZON_CAR_DASH_BYTES = 324
HORIZON_DASH_BASE = 244

def ms_to_kmh(ms: float) -> float:
    return ms * 3.6

def decode_fh6_packet(data: bytes) -> Optional[Dict[str, Any]]:
    # 嚴格校驗：Forza Horizon 的 Dashboard 數據必須是 324 bytes
    if len(data) != HORIZON_CAR_DASH_BYTES:
        return None

    # f: 32位元浮點數 (float), B: 8位元無符號整數 (uint8), b: 8位元有符號整數 (int8), i: 32位元有符號整數 (int32), H: 16位元無符號整數 (uint16)
    def f32(offset: int) -> float:
        return struct.unpack_from('<f', data, offset)[0]
    
    def u8(offset: int) -> int:
        return struct.unpack_from('<B', data, offset)[0]
        
    def s8(offset: int) -> int:
        return struct.unpack_from('<b', data, offset)[0]
        
    def s32(offset: int) -> int:
        return struct.unpack_from('<i', data, offset)[0]
        
    def u16(offset: int) -> int:
        return struct.unpack_from('<H', data, offset)[0]

    def read_quad(offset: int) -> Dict[str, float]:
        return {
            "fl": f32(offset),
            "fr": f32(offset + 4),
            "rl": f32(offset + 8),
            "rr": f32(offset + 12),
        }

    d = HORIZON_DASH_BASE
    lat_accel = f32(20) # 橫向加速度
    long_accel = f32(28) # 縱向加速度

    return {
        "rpm": f32(16),
        "rpmMax": f32(8),
        "gear": u8(d + 75),
        "speedKmh": ms_to_kmh(f32(d + 12)),

        "throttle": u8(d + 71) / 255.0,
        "brake": u8(d + 72) / 255.0,
        "steer": s8(d + 76) / 127.0,

        "acceleration": {
            "x": lat_accel,
            "y": f32(24),
            "z": long_accel,
        },

        "gForce": {
            "lateral": lat_accel / 9.80665,
            "longitudinal": long_accel / 9.80665,
        },

        "car": { "drivetrain": s32(224) },
        "slipRatio": read_quad(84),
        "slipAngle": read_quad(164),
        "suspensionMeters": read_quad(196),
        "lap": { "number": u16(d + 68), "racePosition": u8(d + 70) },
    }
