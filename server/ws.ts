// server/websocket-server.ts
import { WebSocketServer, WebSocket } from "ws";
import dgram from "dgram";
import { decodeFh6Packet } from "./decoder";

const WS_PORT = 3001;
const UDP_PORT = 5300; // Forza 預設發送 Port

const wss = new WebSocketServer({ port: WS_PORT });
const udpSocket = dgram.createSocket("udp4");

udpSocket.bind(UDP_PORT);

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`Listening FH6 UDP on ${address.address}:${address.port}`);
});

// 拆解 UDP 封包
udpSocket.on("message", (buf) => {
  const telemetry = decodeFh6Packet(buf);
  if (!telemetry) return;

  // 120Hz 高速無腦分發給所有前端客戶端
  const payload = JSON.stringify({ type: "telemetry", data: telemetry });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

console.log(`WebSocket send to localhost:${WS_PORT}`);
