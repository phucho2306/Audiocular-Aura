import { loadProfileFromText } from "./importExport.ts";
import { log } from "./helpers.ts";

export interface AutoEqPreset {
	path: string;
	name: string;
}

let cachedPresets: AutoEqPreset[] = [];

/**
 * Fetch and index the AutoEq presets tree from jaakkopasanen/AutoEq on GitHub
 */
export async function getAutoEqPresets(forceRefresh = false): Promise<AutoEqPreset[]> {
	if (!forceRefresh && cachedPresets.length > 0) {
		return cachedPresets;
	}

	// 1. Check LocalStorage Cache
	const cachedData = localStorage.getItem("autoeq_presets");
	const cacheTime = localStorage.getItem("autoeq_presets_time");
	const cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 Days in milliseconds

	if (
		!forceRefresh &&
		cachedData &&
		cacheTime &&
		Date.now() - Number(cacheTime) < cacheDuration
	) {
		try {
			cachedPresets = JSON.parse(cachedData);
			return cachedPresets;
		} catch (err) {
			console.error("Failed to parse cached AutoEq presets", err);
		}
	}

	// 2. Fetch INDEX.md from Raw CDN
	log("Fetching AutoEq online database index...");
	
	try {
		const response = await fetch(
			"https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/INDEX.md"
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch database index: ${response.status} ${response.statusText}`);
		}

		const text = await response.text();
		const lines = text.split(/\r?\n/);
		const presets: AutoEqPreset[] = [];

		// Match pattern: - [Model Name](./relativePath)
		const regex = /^-\s+\[(.*?)\]\(\.\/(.*?)\)/;

		for (const line of lines) {
			const match = line.trim().match(regex);
			if (match) {
				const model = match[1];
				const relPathEscaped = match[2];
				const decodedPath = decodeURIComponent(relPathEscaped);
				
				const parts = decodedPath.split("/");
				if (parts.length >= 2) {
					const source = parts[0]; // e.g. "oratory1990", "crinacle"
					const folderName = parts[parts.length - 1]; // Last directory name
					
					// Reconstruct full path that jaakkopasanen repository uses
					const path = `results/${decodedPath}/${folderName} ParametricEQ.txt`;
					
					// Extract any targets or subfolders between the source and the model folder
					const subfolders = parts.slice(1, parts.length - 1).join(" / ");
					const name = `${model} (${source}${subfolders ? ` - ${subfolders}` : ""})`;

					presets.push({ path, name });
				}
			}
		}

		// 3. Sort alphabetically
		presets.sort((a, b) => a.name.localeCompare(b.name));

		// 4. Update local memory and cache
		cachedPresets = presets;
		localStorage.setItem("autoeq_presets", JSON.stringify(presets));
		localStorage.setItem("autoeq_presets_time", Date.now().toString());

		log(`Successfully loaded & cached ${presets.length} headphone presets from AutoEq.`);
		return presets;
	} catch (err) {
		log(`Failed to fetch online index: ${(err as Error).message}`);
		// Fallback to cache if offline/error
		if (cachedData) {
			log("Loading stale AutoEq cached index as fallback.");
			cachedPresets = JSON.parse(cachedData);
			return cachedPresets;
		}
		throw err;
	}
}

/**
 * Filter the presets array by a case-insensitive query string
 */
export function searchPresets(presets: AutoEqPreset[], query: string, limit = 15): AutoEqPreset[] {
	if (!query.trim()) return [];
	
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	
	return presets
		.filter((preset) => {
			const nameLower = preset.name.toLowerCase();
			return terms.every((term) => nameLower.includes(term));
		})
		.slice(0, limit);
}

/**
 * Download raw preset content from GitHub and load it into the EQ engine
 */
export async function loadPreset(preset: AutoEqPreset) {
	log(`Downloading preset: ${preset.name}...`);
	
	try {
		const encodedParts = preset.path.split("/").map(encodeURIComponent).join("/");
		const rawUrl = `https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/${encodedParts}`;
		const response = await fetch(rawUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
		}

		const text = await response.text();
		await loadProfileFromText(text, preset.name);
	} catch (err) {
		log(`Error downloading preset: ${(err as Error).message}`);
	}
}
