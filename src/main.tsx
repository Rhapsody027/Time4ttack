import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useTelemetryStore, useTelemetry } from "./useTelemetry";
import { Fh6Dashboard } from "./components/Fh6Dashboard";

const getCapacitor = () => {
    return (window as any).Capacitor;
};

function App() {
    const telemetry = useTelemetry();

    useEffect(() => {
        const capacitor = getCapacitor();
        if (!capacitor) {
            console.log("[SaaS Mode] 偵測為標準網頁環境，全自動連接後端 WebSocket...");
            return;
        }

        console.log("[SaaS Mode] 偵測為手機 App 環境！啟動底盤原生 5300 埠 UDP 直接監聽...");

        const initNativeUdp = async () => {
            try {
                // 🚀 載入 gee1k 原生插件
                const { UdpSocket } = (window as any).Capacitor.Plugins;
                
                if (!UdpSocket) {
                    console.error("Capacitor UDP 插件未成功載入，請確認是否執行 bunx cap sync ios");
                    return;
                }

                // 🚀 根據 README 修正：create 的 properties 結構
                const { socketId } = await UdpSocket.create({ 
                    properties: { name: "fh6-receiver", bufferSize: 2048 } 
                });
                
                // 2. 綁定 5300 埠 (監聽所有網卡)
                await UdpSocket.bind({ socketId, address: "0.0.0.0", port: 5300 });

                console.log(`[SaaS Mode] 手機原生 UDP Socket (ID: ${socketId}) 5300 埠綁定成功，開始接收資料！`);

                // 3. 🚀 根據 README 修正：監聽事件名為 "receive"，其回傳結構包含 data (Base64)
                UdpSocket.addListener("receive", (event: { socketId: number; data: string }) => {
                    if (event.socketId !== socketId) return;

                    // 將 Base64 字串還原為 ArrayBuffer
                    const binaryString = window.atob(event.data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // 🚀 0延遲的 120Hz 畫面刷新！
                    useTelemetryStore.getState().updateFromRawPacket(bytes.buffer);
                });

            } catch (err) {
                console.error("啟動原生 UDP 5300 埠失敗: ", err);
            }
        };

        initNativeUdp();
    }, []);

    return (
        <main>
            <Fh6Dashboard />
        </main>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
