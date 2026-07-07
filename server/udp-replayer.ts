// server/udp-replayer.ts
import dgram from "node:dgram";
import fs from "node:fs";
import path from "node:path";

const TARGET_PORT = 5300;
const TARGET_HOST = "127.0.0.1";
const RECORD_FILE = path.join(__dirname, "real-lap-data.bin");

const client = dgram.createSocket("udp4");

if (!fs.existsSync(RECORD_FILE)) {
	console.error(`❌ 找不到錄製檔案: ${RECORD_FILE}，請先執行錄製器跑完單圈！`);
	process.exit(1);
}

const fileBuffer = fs.readFileSync(RECORD_FILE);
console.log(
	`🚀 成功載入實車數據庫，檔案大小: ${(fileBuffer.length / 1024).toFixed(1)} KB`,
);
console.log(`📡 正在完美還原真實 120Hz 賽道動態...`);

let offset = 0;
const frames: { time: number; packet: Buffer }[] = [];

// 一次性解析二進位流到記憶體
while (offset < fileBuffer.length) {
	const packetLen = fileBuffer.readUInt16LE(offset);
	const time = fileBuffer.readUInt32LE(offset + 2);
	const packet = fileBuffer.subarray(offset + 6, offset + 6 + packetLen);

	frames.push({ time, packet });
	offset += 6 + packetLen;
}

console.log(
	`📊 總計解析完成：${frames.length} 幀真實動態數據。開始無限循環重放...`,
);

async function play() {
	while (true) {
		const startTime = Date.now();

		for (let i = 0; i < frames.length; i++) {
			const currentFrame = frames[i]!;

			// 物理噴射往本地 5300 埠
			client.send(currentFrame.packet, TARGET_PORT, TARGET_HOST);

			// 🚀 關鍵：計算下一幀的延遲時間，完美對齊當年的原頻率
			if (i < frames.length - 1) {
				const nextFrame = frames[i + 1]!;
				const targetDelay = nextFrame.time - currentFrame.time;

				// 精確休眠控制
				const wallTimePassed = Date.now() - startTime;
				const sleepTime = targetDelay - (wallTimePassed - currentFrame.time);

				if (sleepTime > 0) {
					await new Promise((resolve) => setTimeout(resolve, sleepTime));
				}
			}
		}
		console.log("\n🏁 單圈重放結束，重頭開始...");
	}
}

play();
