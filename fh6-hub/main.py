# fh6-hub/main.py
import asyncio
import sys
import threading

import pystray
import websockets
from decoder import decode_fh6_packet
from discovery import HubDiscovery
from tray import create_default_icon, is_autostart_enabled, set_autostart
from udp_receiver import FH6UDPProtocol
from ws import TelemetryWSServer

ws_server = TelemetryWSServer()
discovery_service = HubDiscovery(port=8765)
packet_counter = 0

# 取得主事件循環的參照，用於跨執行緒操作
main_loop = None


def handle_raw_packet(data: bytes):
    global packet_counter
    packet_counter += 1
    if packet_counter % 2 != 0:
        return
    decoded = decode_fh6_packet(data)
    if decoded and main_loop:
        # 安全地將廣播任務發送給非同步主執行緒
        main_loop.call_soon_threadsafe(
            lambda: asyncio.create_task(ws_server.broadcast(decoded))
        )


def setup_tray(on_exit_callback):
    # 建立托盤選單與開關
    def toggle_autostart(icon, item):
        new_state = not item.checked
        set_autostart(new_state)

    menu = pystray.Menu(
        pystray.MenuItem(
            "開機自動啟動",
            toggle_autostart,
            checked=lambda item: is_autostart_enabled(),
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("關閉 Hub (Exit)", lambda icon, item: on_exit_callback()),
    )

    icon = pystray.Icon(
        "Time4ttack FH6 Hub",
        create_default_icon(),
        "Time4ttack FH6 Telemetry Hub",
        menu,
    )
    return icon


async def main():
    global main_loop
    main_loop = asyncio.get_running_loop()

    # 1. 啟動非同步 mDNS 註冊
    await discovery_service.start()

    # 2. 啟動實體 UDP 監聽
    transport, protocol = await main_loop.create_datagram_endpoint(
        lambda: FH6UDPProtocol(handle_raw_packet), local_addr=("0.0.0.0", 5300)
    )

    print("[Hub] WebSocket 伺服器啟動，監聽 Port 8765...")
    async with websockets.serve(ws_server.register, "0.0.0.0", 8765):
        try:
            # 建立一個持續等待的 Event 讓主程序常駐
            stop_event = asyncio.Event()

            # 定義當使用者點擊 Tray 選單退出時的動作
            def handle_exit():
                print("[Tray] 收到關閉指令，釋放資源...")
                main_loop.call_soon_threadsafe(stop_event.set)
                sys.exit(0)

            # 🚀 在獨立的背景執行緒中啟動 System Tray 圖示
            tray_icon = setup_tray(handle_exit)
            threading.Thread(target=tray_icon.run, daemon=True).start()

            # 等待退出事件
            await stop_event.wait()

        finally:
            # 登出 mDNS
            await discovery_service.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Hub] 服務已手動關閉。")
