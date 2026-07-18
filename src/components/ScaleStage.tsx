// src/components/ScaleStage.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";

type ScaleStageProps = {
    children: ReactNode;
    referenceWidth: number;
    referenceHeight: number;
};

export function ScaleStage({ children, referenceWidth, referenceHeight }: ScaleStageProps) {
    const outerRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const outer = outerRef.current;
        if (!outer) return;

        const recalc = () => {
            const { clientWidth, clientHeight } = outer;

            // 僅在直向模式下運作
            if (clientWidth > clientHeight) {
                // 橫向模式下顯示黑色背景，防止畫面顯示異常
                setScale(1);
                return;
            }

            const scaleX = clientWidth / referenceWidth;
            const scaleY = clientHeight / referenceHeight;
            setScale(Math.min(scaleX, scaleY));
        };

        recalc();
        const observer = new ResizeObserver(recalc);
        observer.observe(outer);
        window.addEventListener("orientationchange", recalc);
        return () => {
            observer.disconnect();
            window.removeEventListener("orientationchange", recalc);
        };
    }, [referenceWidth, referenceHeight]);

    return (
        <div
            ref={outerRef}
            style={{
                width: "100vw",
                height: "100dvh",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000000",
                boxSizing: "border-box",
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
            }}
        >
            <div
                style={{
                    width: referenceWidth,
                    height: referenceHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    flexShrink: 0,
                }}
            >
                {children}
            </div>
        </div>
    );
}