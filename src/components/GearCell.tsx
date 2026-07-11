// src/components/GearCell.tsx
import { useEffect, useRef, useState } from "react";
import { useTelemetryStore, type TelemetryStoreState } from "../useTelemetry";

function formatNumber(value: number, fractionDigits = 0): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits,
	}).format(value);
}

export function GearCell() {
	const gearLabel = useTelemetryStore(
		(state: TelemetryStoreState) => state.gearLabel,
	);
	const rpmPercent = useTelemetryStore(
		(state: TelemetryStoreState) => state.rpmPercent,
	);
	const shiftOn = useTelemetryStore(
		(state: TelemetryStoreState) => state.shiftOn,
	);
	const speedDisplay = useTelemetryStore(
		(state: TelemetryStoreState) => state.speedDisplay,
	);
	const stale = useTelemetryStore((state: TelemetryStoreState) => state.stale);

	// 100ms 狀態保持濾波，徹底消滅過渡檔位與雜訊閃爍
	const [displayGear, setDisplayGear] = useState(gearLabel);
	const lastValidGearRef = useRef(gearLabel);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// 🚀 數字紅色鎖死狀態機
	const [isTextLockedRed, setIsTextLockedRed] = useState(false);

	useEffect(() => {
		const isInvalid =
			gearLabel === "15" || Number(gearLabel) > 10 || gearLabel === "";
		if (!isInvalid) {
			// 🚀 條件：只要檢測到真正的檔位變更（升檔/降檔），立刻解除數字紅鎖
			if (lastValidGearRef.current !== gearLabel) {
				setIsTextLockedRed(false);
			}
			lastValidGearRef.current = gearLabel;
			setDisplayGear(gearLabel);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		} else {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			timeoutRef.current = setTimeout(() => {
				setDisplayGear("N");
			}, 100);
		}
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [gearLabel]);

	// 🚀 核心控制：根據當前轉速百分比與 shiftOn 狀態觸發鎖定或解鎖
	useEffect(() => {
		if (shiftOn) {
			// 只要轉速條一觸發超轉紅色，立即鎖死紅色
			setIsTextLockedRed(true);
		} else if (rpmPercent < 75) {
			// 除非轉速完全跌回灰色巡航區（低於 75%），才允許解鎖
			setIsTextLockedRed(false);
		}
		// 黃色區間（75% ~ 95%）不作任何處理，維持上一次的鎖定狀態
	}, [shiftOn, rpmPercent]);

	return (
		<div
			className={`relative flex h-full w-full flex-col items-center justify-center px-2 ${stale ? "opacity-45" : ""}`}
		>
			{/* 轉速條外殼 */}
			<div className="absolute top-0 h-2 w-full overflow-hidden rounded-full bg-gray-950">
				<div
					className={`h-full rounded-full ${
						shiftOn
							? "bg-[#FF0055]"
							: rpmPercent >= 85
								? "bg-yellow-400"
								: "bg-zinc-700"
					}`}
					style={{ width: `${rpmPercent}%` }}
				/>
			</div>

			{/* 檔位與車速文字 */}
			<div className="pt-4 text-center">
				<span className="block text-[9px] font-bold tracking-widest text-gray-600">
					GEAR
				</span>
				<div
					// 🚀 核心優化：鎖死狀態下直接強制 text-red-500，絕不閃爍，無螢光背景
					className={`my-1 font-mono text-7xl font-black leading-none transition-colors duration-75 ${
						isTextLockedRed ? "text-red-500" : "text-white"
					}`}
				>
					{displayGear}
				</div>
				<div className="font-mono text-2xl font-bold tracking-tight text-white">
					{formatNumber(speedDisplay, 0)}
				</div>
				<span className="block -mt-1 text-[9px] font-bold tracking-wider text-gray-500">
					km/h
				</span>
			</div>
		</div>
	);
}
