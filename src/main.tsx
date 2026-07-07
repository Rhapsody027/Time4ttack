import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useTelemetry } from "./useTelemetry";
import { Fh6Dashboard } from "./components/Fh6Dashboard";

function App() {
	// 🚀 掛載時，useTelemetry 內部的 Zustand Store 會全自動連上 ws://localhost:3001
	const telemetry = useTelemetry();

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
