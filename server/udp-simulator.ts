// server/udp-simulator.ts
import dgram from "dgram";

const TARGET_PORT = 5300;
const TARGET_HOST = "127.0.0.1";
const client = dgram.createSocket("udp4");

console.log("🚀 Time4ttack 遙測模擬器已啟動");
console.log(`📡 正在向 ${TARGET_HOST}:${TARGET_PORT} 模擬高頻賽車數據流...`);

let frameCount = 0;

// 每 16.6 毫秒（約 60Hz）噴發一個虛擬封包
const interval = setInterval(() => {
	frameCount++;

	// 1. 建立一個符合 Forza Horizon 規範的 324 bytes 緩衝區
	const buf = Buffer.alloc(324);

	// 2. 模擬一條簡單的數學曲線，讓數值隨著時間動態變化（例如正弦波）
	const timeFactor = frameCount * 0.05;

	const fakeRpm = 2000 + Math.abs(Math.sin(timeFactor)) * 6000; // 轉速在 2000~8000 轉來回轟炸
	const fakeSpeed = 50 + Math.abs(Math.sin(timeFactor * 0.5)) * 150; // 時速在 50~200 km/h 來回變動
	const fakeSteer = Math.sin(timeFactor); // 方向盤左右瘋狂打（-1.0 ~ 1.0）

	// 模擬車子在大力左轉進彎
	const fakeLatG = Math.sin(timeFactor) * 1.5; // 側向 G 力在 -1.5G ~ +1.5G 來回跑
	const fakeLongG = Math.cos(timeFactor) * 0.8; // 縱向 G 力（減速與加速）

	// 寫入 Sled 區段固定 Offset（對齊 horizon-cardash.ts 的讀取點）
	buf.writeInt32LE(1, 0); // isRaceOn = true
	buf.writeUInt32LE(frameCount * 16, 4); // timestampMs
	buf.writeFloatLE(8000, 8); // rpmMax = 8000
	buf.writeFloatLE(1000, 12); // rpmIdle = 1000
	buf.writeFloatLE(fakeRpm, 16); // rpm

	// 寫入三軸加速度
	buf.writeFloatLE(fakeLatG * 9.80665, 20); // accelX
	buf.writeFloatLE(fakeLongG * 9.80665, 24); // accelY

	// 寫入四輪打滑率 (slipRatio 區段從 offset 84 開始，每 4 bytes 一顆輪胎)
	// 讓後輪（rl, rr）在加速時動態產生打滑效果
	const fakeSlipRatio = Math.max(0, fakeLongG) * 0.5;
	buf.writeFloatLE(0, 84); // fl
	buf.writeFloatLE(0, 88); // fr
	buf.writeFloatLE(fakeSlipRatio, 92); // rl
	buf.writeFloatLE(fakeSlipRatio, 96); // rr

	// 寫入四輪滑移角 (slipAngle 區段從 offset 164 開始)
	// 讓前輪（fl, fr）隨著轉向角度變大而增加打滑
	const fakeSlipAngle = fakeSteer * 0.4;
	buf.writeFloatLE(fakeSlipAngle, 164); // fl
	buf.writeFloatLE(fakeSlipAngle, 168); // fr
	buf.writeFloatLE(0, 172); // rl
	buf.writeFloatLE(0, 176); // rr

	// 寫入 Dash 區段 (Horizon Base = 244)
	const d = 244;
	buf.writeFloatLE(fakeSpeed / 3.6, d + 12); // speedKmh (後端解包會自動乘 3.6，所以這裡除回去)

	// 寫入踏板與轉向
	buf.writeUInt8(fakeLongG > 0 ? 255 : 0, d + 71); // throttle
	buf.writeUInt8(fakeLongG < 0 ? 255 : 0, d + 72); // brake
	buf.writeUInt8(3, d + 75); // gear = 3 檔
	buf.writeInt8(Math.round(fakeSteer * 127), d + 76); // steer

	// 3. 物理噴射往本地 5300 埠
	client.send(buf, TARGET_PORT, TARGET_HOST, (err) => {
		if (err) {
			console.error("模擬器發送失敗:", err);
		}
	});
}, 16); // ~60 FPS 的高頻轟炸

// 攔截結束訊號
process.on("SIGINT", () => {
	clearInterval(interval);
	client.close();
	console.log("\n🛑 模擬器已安全關閉");
	process.exit();
});
