# fh6-hub/ws.py
import asyncio
import json
import websockets
from typing import Set

class TelemetryWSServer:
    def __init__(self):
        self.clients: Set[websockets.WebSocketServerProtocol] = set()

    async def register(self, websocket):
        self.clients.add(websocket)
        print(f"[WS] Client 連線成功: {websocket.remote_address} (目前連線數: {len(self.clients)})")
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)
            print(f"[WS] Client 斷開連線: {websocket.remote_address} (目前連線數: {len(self.clients)})")

    async def broadcast(self, data: dict):
        if not self.clients:
            return
        payload = json.dumps({
            "type": "telemetry",
            "data": data
        })
        await asyncio.gather(
            *[client.send(payload) for client in self.clients],
            return_exceptions=True
        )
