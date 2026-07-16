import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useTelemetry } from "./useTelemetry";
import { Fh6Dashboard } from "./components/Fh6Dashboard";

function App() {
	// 自動讀取 localStorage 中的記憶 IP 並進行 WebSocket 連線
	useTelemetry();

	return (
		<main className="relative w-full h-full">
			<Fh6Dashboard />
		</main>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
