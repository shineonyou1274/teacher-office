import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 등 하위 경로에 올릴 때만 바꾸세요 (예: "/teacher-office/")
  base: "./",
  server: { port: 5180, open: false },
});
