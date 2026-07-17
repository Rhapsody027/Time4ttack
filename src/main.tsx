import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Fh6Dashboard } from "./components/Fh6Dashboard";

function App() {
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
