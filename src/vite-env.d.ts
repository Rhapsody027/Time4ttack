// src/vite-env.d.ts

// 🚀 讓 TypeScript 認識 Vite 的靜態資源導入（包含 CSS、圖片等）
/// <reference types="vite/client" />

declare module "*.css" {
	const content: Record<string, string>;
	export default content;
}
