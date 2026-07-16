# fh6-hub/mock_replayer.py
import math
import socket
import struct
import time


# 構造與 Forza telemetry 100% 相同字節長度的假數據封包 (324 bytes)
# 這樣我們就不需要更動任何解包與前端邏輯！
def create_mock_packet(tick: int) -> bytes:
    # 建立一個 324 bytes 的空白 bytearray
    packet = bytearray(324)

    # 用正弦波模擬車輛數據
    rpm_max = 8000.0
    rpm = 2000.0 + (math.sin(tick * 0.05) + 1.0) * 2500.0  # 2000~7000rpm 循環
    speed_ms = 10.0 + (math.sin(tick * 0.02) + 1.0) * 30.0  # ~144 km/h
    gear = int((rpm / 1000.0)) % 6 + 1  # 模擬自動換檔 1~6 檔

    # 煞車與油門
    throttle = (math.sin(tick * 0.03) + 1.0) / 2.0
    brake = 1.0 - throttle if throttle > 0.7 else 0.0
    steer = math.sin(tick * 0.04)  # 模擬左右打方向盤

    # G 值
    lat_accel = math.sin(tick * 0.04) * 8.0  # 模擬橫向加速度
    long_accel = -5.0 if brake > 0.5 else 3.0

    # 模擬胎滑
    slip_ratio_fl = -1.2 if brake > 0.8 else 0.0  # 前輪模擬鎖死
    slip_ratio_fr = -1.2 if brake > 0.8 else 0.0
    slip_ratio_rl = 1.5 if throttle > 0.9 else 0.0  # 後輪模擬燒胎
    slip_ratio_rr = 1.5 if throttle > 0.9 else 0.0

    # 寫入二進位緩衝區（依照 decoder.ts 的偏移量打包）
    # offset 8: rpmMax (float32)
    struct.pack_into("<f", packet, 8, rpm_max)
    # offset 16: rpm (float32)
    struct.pack_into("<f", packet, 16, rpm)
    # offset 20: latAccel (float32)
    struct.pack_into("<f", packet, 20, lat_accel)
    # offset 28: longAccel (float32)
    struct.pack_into("<f", packet, 28, long_accel)

    # 輪胎 Slip Ratio (offset 84: fl, fr, rl, rr - 4個 float32)
    struct.pack_into(
        "<ffff", packet, 84, slip_ratio_fl, slip_ratio_fr, slip_ratio_rl, slip_ratio_rr
    )

    # Base offset d = 244
    d = 244
    # d + 12: Speed (float32)
    struct.pack_into("<f", packet, d + 12, speed_ms)
    # d + 71: Throttle (u8)
    struct.pack_into("<B", packet, d + 71, int(throttle * 255))
    # d + 72: Brake (u8)
    struct.pack_into("<B", packet, d + 72, int(brake * 255))
    # d + 75: Gear (u8)
    struct.pack_into("<B", packet, d + 75, gear)
    # d + 76: Steer (s8)
    struct.pack_into("<b", packet, d + 76, int(steer * 127))

    return bytes(packet)


def start_replayer():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target_address = ("127.0.0.1", 5300)

    print("[Replayer] 虛擬模擬器啟動！正在往 127.0.0.1:5300 噴射 60Hz 假數據...")
    print("[Replayer] 提示：開啟此程式後，請在另一個 terminal 啟動 main.py 接收它！")

    tick = 0
    try:
        while True:
            packet = create_mock_packet(tick)
            sock.sendto(packet, target_address)
            tick += 1
            # 60Hz 發送
            time.sleep(1 / 60.0)
    except KeyboardInterrupt:
        print("\n[Replayer] 模擬器已手動關閉。")


if __name__ == "__main__":
    start_replayer()
