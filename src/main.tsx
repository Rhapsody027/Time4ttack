import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Fh6Dashboard } from "./components/Fh6Dashboard";
import { ScaleStage } from "./components/ScaleStage";

function App() {
    return (
        <ScaleStage referenceWidth={460} referenceHeight={920}>
            <Fh6Dashboard />
        </ScaleStage>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);