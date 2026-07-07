// server/udp-recorder.ts
import dgram from "node:dgram";
import fs from "node:fs";
import path from "node:path";

const UDP_PORT = 5300;
const RECORD_FILE = path.join(__dirname, "real-lap-data.bin");

const udpSocket = dgram.createSocket("udp4");
// 建立寫入串流 (Write Stream)，一邊收一邊直接物理性寫入硬碟
const writeStream = fs.createWriteStream(RECORD_FILE);

console.log(`🏎️  Time4ttack 實車遙測錄製器已就緒`);
console.log(`📡 正在監聽 UDP :${UDP_PORT} ... 進遊戲開車就會開始寫入`);
console.log(`💾 數據將儲存至: ${RECORD_FILE}`);

let packetCount = 0;
const startTime = Date.now();

udpSocket.on("message", (buf) => {
	packetCount++;
	const relativeTime = Date.now() - startTime;

	// 🚀 核心封裝：[2 bytes 封包長度] + [4 bytes 相對時間戳] + [原始二進位封包]
	const header = Buffer.alloc(6);
	header.writeUInt16LE(buf.length, 0);
	header.writeUInt32LE(relativeTime, 2);

	writeStream.write(header);
	writeStream.write(buf);

	if (packetCount % 60 === 0) {
		process.stdout.write(
			`\r已錄製 ${packetCount} 幀數據... (約 ${(relativeTime / 1000).toFixed(1)} 秒)`,
		);
	}
});

udpSocket.bind(UDP_PORT);

process.on("SIGINT", () => {
	console.log(`\n🛑 停止錄製。共擷取 ${packetCount} 幀硬核數據。`);
	udpSocket.close();
	writeStream.end();
	process.exit();
});
