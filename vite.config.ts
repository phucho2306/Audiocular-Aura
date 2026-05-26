import { defineConfig } from "vite";

export default defineConfig({
	// Using relative paths makes the bundle portable to any subdirectory on GitHub Pages
	base: "./",
	build: {
		outDir: "dist",
	},
});
