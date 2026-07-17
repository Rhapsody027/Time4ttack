# fh6-hub/main.py
import asyncio
import sys
import threading

import pystray
import websockets
from decoder import decode_fh6_packet
from discovery import HubDiscovery
from pairing_qr import PairingQR
from tray import create_default_icon, is_autostart_enabled, set_autostart
from udp_receiver import FH6UDPProtocol
from ws import TelemetryWSServer

# 全域遙測與伺服器實例
ws_server = TelemetryWSServer()
discovery_service = HubDiscovery(port=8765)
pairing_qr = PairingQR()
packet_counter = 0

# 狀態變數
hub_running = False
main_loop = None
udp_transport = None

# 本地 WebSocket 伺服器控制
ws_server_instance = None


def handle_raw_packet(data: bytes):
    global packet_counter
    if not hub_running:
        return
    packet_counter += 1
    if packet_counter % 2 != 0:
        return
    decoded = decode_fh6_packet(data)
    if decoded and main_loop:
        main_loop.call_soon_threadsafe(
            lambda: asyncio.create_task(ws_server.broadcast(decoded))
        )


async def start_hub_services():
    global udp_transport, hub_running, ws_server_instance
    if hub_running:
        return

    print("[Hub] 正在啟動遙測服務...")
    # 1. 啟動 mDNS 廣播
    await discovery_service.start()

    # 2. 啟動 UDP 接收
    loop = asyncio.get_running_loop()
    udp_transport, protocol = await loop.create_datagram_endpoint(
        lambda: FH6UDPProtocol(handle_raw_packet), local_addr=("0.0.0.0", 5300)
    )

    hub_running = True
    print("[Hub] 服務啟動完成！持續監聽中...")


async def stop_hub_services():
    global udp_transport, hub_running
    if not hub_running:
        return

    print("[Hub] 正在停止遙測服務...")
    # 1. 關閉 UDP 接收
    if udp_transport:
        udp_transport.close()
        udp_transport = None

    # 2. 登出 mDNS
    await discovery_service.stop()

    hub_running = False
    print("[Hub] 服務已停止。")


def build_tray_icon(on_exit_callback):
    def show_pairing_qr():
        pair_url = discovery_service.get_pair_url()
        print(f"[QR] 顯示配對碼: {pair_url}")
        pairing_qr.show(pair_url)

    def toggle_hub_state(icon, item):
        global hub_running
        if hub_running:
            asyncio.run_coroutine_threadsafe(stop_hub_services(), main_loop)
            icon.notify("Telemetry 服務已停止", "Time4ttack FH6 Hub")
        else:
            asyncio.run_coroutine_threadsafe(start_hub_services(), main_loop)
            icon.notify("Telemetry 服務執行中", "Time4ttack FH6 Hub")

    def toggle_autostart(icon, item):
        new_state = not item.checked
        set_autostart(new_state)

    def get_hub_status_text(item):
        return "🔴 停止服務" if hub_running else "🟢 啟動服務"

    menu = pystray.Menu(
        pystray.MenuItem(get_hub_status_text, toggle_hub_state),
        pystray.MenuItem("顯示配對 QR", lambda icon, item: show_pairing_qr()),
        pystray.MenuItem(
            "開機自動啟動",
            toggle_autostart,
            checked=lambda item: is_autostart_enabled(),
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("關閉程式 (Exit)", lambda icon, item: on_exit_callback()),
    )

    icon = pystray.Icon(
        "Time4ttack FH6 Hub",
        create_default_icon(),
        "Time4ttack FH6 Telemetry Hub",
        menu,
    )
    return icon


async def main():
    global main_loop, ws_server_instance
    main_loop = asyncio.get_running_loop()

    # 預設啟動服務
    await start_hub_services()
    pairing_qr.show(discovery_service.get_pair_url())

    # 啟動 WebSocket 常駐監聽
    async with websockets.serve(ws_server.register, "0.0.0.0", 8765) as ws_inst:
        ws_server_instance = ws_inst
        stop_event = asyncio.Event()

        def handle_exit():
            asyncio.run_coroutine_threadsafe(stop_hub_services(), main_loop)
            main_loop.call_soon_threadsafe(stop_event.set)
            sys.exit(0)

        # 啟動 Windows 系統匣
        tray_icon = build_tray_icon(handle_exit)
        threading.Thread(target=tray_icon.run, daemon=True).start()

        await stop_event.wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Hub] 服務已手動關閉。")
