# fh6-hub/udp_receiver.py
import asyncio
from typing import Callable, Optional


class FH6UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, on_packet_received: Callable[[bytes], None]):
        self.on_packet_received = on_packet_received
        self.transport: Optional[asyncio.DatagramTransport] = None

    def connection_made(self, transport: asyncio.DatagramTransport):
        self.transport = transport
        print("[UDP] 成功綁定 Port 5300，等待 Forza Horizon 6 遙測數據...")

    def datagram_received(self, data: bytes, addr):
        self.on_packet_received(data)

    def error_received(self, exc):
        print(f"[UDP] 錯誤: {exc}")
