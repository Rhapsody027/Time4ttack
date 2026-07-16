# fh6-hub/discovery.py
import socket
import uuid

from zeroconf import IPVersion, ServiceInfo
from zeroconf.asyncio import AsyncZeroconf


class HubDiscovery:
    def __init__(self, port: int = 8765):
        self.port = port
        self.aio_zeroconf = None
        self.service_info = None
        self.device_id = uuid.uuid4().hex[:8]

    def get_local_ip(self) -> str:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = "127.0.0.1"
        finally:
            s.close()
        return ip

    async def start(self):
        self.aio_zeroconf = AsyncZeroconf(ip_version=IPVersion.V4Only)

        local_ip = self.get_local_ip()
        hostname = socket.gethostname()

        desc = {
            "device_id": self.device_id,
            "name": "Time4ttack FH6 Hub",
            "version": "1.0.0",
            "websocket_port": str(self.port),
        }

        self.service_info = ServiceInfo(
            "_fh6hub._tcp.local.",
            f"Time4ttack-FH6-Hub-{self.device_id}._fh6hub._tcp.local.",
            addresses=[socket.inet_aton(local_ip)],
            port=self.port,
            properties=desc,
            server=f"{hostname}.local.",
        )

        print(f"[mDNS] 正在廣播服務: {self.service_info.name}")
        print(f"[mDNS] 廣播 IP: {local_ip}:{self.port}")

        await self.aio_zeroconf.async_register_service(self.service_info)

    async def stop(self):
        if self.aio_zeroconf and self.service_info:
            print("[mDNS] 正在註銷服務...")
            await self.aio_zeroconf.async_unregister_service(self.service_info)
            await self.aio_zeroconf.async_close()
