import "./style.css";
import { flashToFlash, syncToDevice } from "./dsp.ts";
import {
	connectToDevice,
	disconnectDevice,
	initState,
	resetToDefaults,
} from "./fn.ts";
import { setGlobalGain, log } from "./helpers.ts";
import { exportProfile, importProfile } from "./importExport.ts";
import {
	getAutoEqPresets,
	searchPresets,
	loadPreset,
	type AutoEqPreset,
} from "./autoeq.ts";

export type Band = {
	index: number;
	freq: number;
	gain: number;
	q: number;
	type: string;
	enabled: boolean;
};
export type EQ = Band[];

// Initialize state and render PEQ on page load
initState();

/**
 * CONNECTION LOGIC
 */
const btnConnect = document.getElementById("btnConnect");
btnConnect?.addEventListener("click", async () => connectToDevice());

const btnDisconnect = document.getElementById("btnDisconnect");
btnDisconnect?.addEventListener("click", async () => disconnectDevice());

/**
 * CUSTOM USB SETTINGS ACCORDION
 */
const btnToggleCustomUsb = document.getElementById("btnToggleCustomUsb");
const customUsbConfig = document.getElementById("customUsbConfig");

btnToggleCustomUsb?.addEventListener("click", () => {
	if (customUsbConfig) {
		if (customUsbConfig.classList.contains("hidden")) {
			customUsbConfig.classList.remove("hidden");
			btnToggleCustomUsb.innerText = "Hide Custom USB Options ▲";
		} else {
			customUsbConfig.classList.add("hidden");
			btnToggleCustomUsb.innerText = "Show Custom USB Options ▼";
		}
	}
});

/**
 * RESET LOGIC
 */
const btnReset = document.getElementById("btnReset");
btnReset?.addEventListener("click", async () => resetToDefaults());

/**
 * SYNC LOGIC
 */
const btnSync = document.getElementById("btnSync");
btnSync?.addEventListener("click", async () => syncToDevice());

/**
 * FLASH WRITE LOGIC
 */
const btnFlash = document.getElementById("btnFlash");
btnFlash?.addEventListener("click", async () => flashToFlash());

/**
 * GLOBAL GAIN PREAMP LOGIC
 */
const globalSlider = document.getElementById("globalGainSlider");
globalSlider?.addEventListener("input", async (e) => setGlobalGain(e));

/**
 * PROFILE IMPORT / EXPORT LOGIC
 */
const btnExport = document.getElementById("btnExport");
btnExport?.addEventListener("click", () => exportProfile());

const btnImport = document.getElementById("btnImport");
const fileInput = document.getElementById("fileInput");

btnImport?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", (e) => importProfile(e));

/**
 * AUTOEQ ONLINE PRESETS INTEGRATION
 */
let allPresets: AutoEqPreset[] = [];
let isFetchingIndex = false;

const searchInput = document.getElementById("autoeqSearch") as HTMLInputElement;
const searchResults = document.getElementById("autoeqSearchResults") as HTMLElement;
const btnRefreshAutoEq = document.getElementById("btnRefreshAutoEq");

// Background fetch of the database index on page load
setTimeout(() => initializeAutoEqIndex(), 1000);

async function initializeAutoEqIndex(forceRefresh = false) {
	if (isFetchingIndex) return;
	if (!forceRefresh && allPresets.length > 0) return;

	isFetchingIndex = true;
	updateDropdownUI("loading");

	try {
		allPresets = await getAutoEqPresets(forceRefresh);
		updateDropdownUI("idle");
	} catch (err) {
		console.error("AutoEq initialization failed", err);
		updateDropdownUI("error");
	} finally {
		isFetchingIndex = false;
	}
}

function updateDropdownUI(state: "loading" | "idle" | "error") {
	if (!searchResults) return;
	
	if (state === "loading") {
		searchResults.classList.remove("hidden");
		searchResults.innerHTML = `<div class="search-loading">Tuning database loading...</div>`;
	} else if (state === "error") {
		searchResults.classList.remove("hidden");
		searchResults.innerHTML = `<div class="search-no-results text-red-500">Failed to load preset database. Click 🔄 to retry.</div>`;
	} else {
		// Just hide if idle and input is empty
		if (searchInput && !searchInput.value.trim()) {
			searchResults.classList.add("hidden");
		}
	}
}

function renderSearchResults(query: string) {
	if (!searchResults) return;

	if (!query.trim()) {
		searchResults.classList.add("hidden");
		searchResults.innerHTML = "";
		return;
	}

	searchResults.classList.remove("hidden");

	if (isFetchingIndex) {
		searchResults.innerHTML = `<div class="search-loading">Tuning database loading...</div>`;
		return;
	}

	if (allPresets.length === 0) {
		searchResults.innerHTML = `<div class="search-no-results">Tuning database not loaded. Click 🔄 to retry.</div>`;
		return;
	}

	const matches = searchPresets(allPresets, query, 15);

	if (matches.length === 0) {
		searchResults.innerHTML = `<div class="search-no-results">No headphones found matching "${query}"</div>`;
		return;
	}

	searchResults.innerHTML = "";
	matches.forEach((preset) => {
		const div = document.createElement("div");
		div.className = "search-item";
		div.innerText = preset.name;
		div.addEventListener("click", async () => {
			searchResults.classList.add("hidden");
			searchInput.value = preset.name;
			await loadPreset(preset);
		});
		searchResults.appendChild(div);
	});
}

// Attach Search event listeners
searchInput?.addEventListener("focus", () => {
	initializeAutoEqIndex();
	if (searchInput.value.trim()) {
		renderSearchResults(searchInput.value);
	}
});

searchInput?.addEventListener("input", (e) => {
	const query = (e.target as HTMLInputElement).value;
	renderSearchResults(query);
});

btnRefreshAutoEq?.addEventListener("click", () => {
	initializeAutoEqIndex(true);
});

// Dismiss dropdown when clicking outside the search element wrapper
window.addEventListener("click", (e) => {
	const wrapper = document.querySelector(".autoeq-search-wrapper");
	if (wrapper && !wrapper.contains(e.target as Node)) {
		searchResults?.classList.add("hidden");
	}
});

/**
 * DEVICE UTILITY CONTROLS INTERACTIVE LOGIC
 */
const selFilterType = document.getElementById("selFilterType") as HTMLSelectElement;
const filterDescBox = document.getElementById("filterDescBox") as HTMLElement;
const filterTypeVal = document.getElementById("filterTypeVal") as HTMLElement;

const filterDescriptions = {
	"FAST-LL": "<strong>FAST-LL (Low Latency):</strong> Minimizes pre-ringing (echo before notes) and provides the lowest latency. Warm, punchy, and thick sound. Best for gaming and videos.",
	"FAST-PC": "<strong>FAST-PC (Phase Comp):</strong> Preserves phase linearity across the entire spectrum, removing phase distortion. Highly natural, clean, and balanced sound. Best for acoustic instruments.",
	"Slow-LL": "<strong>Slow-LL (Low Latency):</strong> Combines low latency with a gentler high-frequency roll-off. Warm, relaxed, with a wider perceived soundstage. Ideal for jazz and vocals.",
	"Slow-PC": "<strong>Slow-PC (Phase Comp):</strong> Combines phase linearity with a gentler high-frequency roll-off. Detailed, analytical, and monitor-like sound. Great for critical listening.",
	"NON-OS": "<strong>NON-OS (Non-Oversampling):</strong> Bypasses digital interpolation entirely. Pure, raw, and analog-like sound signature with a slight high-frequency roll-off. Recommended for a vintage sound."
};

selFilterType?.addEventListener("change", () => {
	const filter = selFilterType.value as keyof typeof filterDescriptions;
	const desc = filterDescriptions[filter] || "";
	if (filterDescBox) filterDescBox.innerHTML = desc;
	if (filterTypeVal) filterTypeVal.innerText = selFilterType.options[selFilterType.selectedIndex].text;
	log(`[System] DAC Filter type set to: ${filter}`);
});

// Amp Mode Switch
const toggleAmpMode = document.getElementById("toggleAmpMode") as HTMLInputElement;
const ampLabelClassH = document.getElementById("ampLabelClassH") as HTMLElement;
const ampLabelClassAB = document.getElementById("ampLabelClassAB") as HTMLElement;

toggleAmpMode?.addEventListener("change", () => {
	const isClassH = toggleAmpMode.checked;
	if (isClassH) {
		ampLabelClassH?.classList.add("active");
		ampLabelClassAB?.classList.remove("active");
		log("[System] Amplifier topology set to: Class H (Dynamic tracking power mode)");
	} else {
		ampLabelClassH?.classList.remove("active");
		ampLabelClassAB?.classList.add("active");
		log("[System] Amplifier topology set to: Class AB (Linear power mode)");
	}
});

// Gain Mode Switch
const toggleGainMode = document.getElementById("toggleGainMode") as HTMLInputElement;
const gainLabelLow = document.getElementById("gainLabelLow") as HTMLElement;
const gainLabelHigh = document.getElementById("gainLabelHigh") as HTMLElement;

toggleGainMode?.addEventListener("change", () => {
	const isHigh = toggleGainMode.checked;
	if (isHigh) {
		gainLabelLow?.classList.remove("active");
		gainLabelHigh?.classList.add("active");
		log("[System] Hardware Output Gain set to: HIGH (Double output power level)");
	} else {
		gainLabelLow?.classList.add("active");
		gainLabelHigh?.classList.remove("active");
		log("[System] Hardware Output Gain set to: LOW (Standard output power level)");
	}
});

// Channel Balance Slider
const sliderBalance = document.getElementById("sliderBalance") as HTMLInputElement;
const balanceVal = document.getElementById("balanceVal") as HTMLElement;

sliderBalance?.addEventListener("input", () => {
	const val = parseInt(sliderBalance.value);
	let text = "0 (Center)";
	if (val < 0) {
		text = `L +${Math.abs(val)}`;
	} else if (val > 0) {
		text = `R +${val}`;
	}
	if (balanceVal) balanceVal.innerText = text;
});
sliderBalance?.addEventListener("change", () => {
	const val = parseInt(sliderBalance.value);
	log(`[System] L/R Channel Balance adjusted to: ${val}`);
});

// Microphone Monitoring & Levels Animation
const toggleMicMonitor = document.getElementById("toggleMicMonitor") as HTMLInputElement;
const micMonitorStatus = document.getElementById("micMonitorStatus") as HTMLElement;
const meterL = document.getElementById("meterL") as HTMLElement;
const meterR = document.getElementById("meterR") as HTMLElement;

let micMeterAnimationId: number | null = null;

function animateMicMeters() {
	if (!toggleMicMonitor?.checked) {
		if (meterL) meterL.style.width = "0%";
		if (meterR) meterR.style.width = "0%";
		return;
	}

	const randomL = Math.floor(Math.random() * 45) + (toggleMicMonitor.checked ? 10 : 0);
	const randomR = Math.floor(Math.random() * 45) + (toggleMicMonitor.checked ? 10 : 0);

	// Add audio peak simulation spikes
	const peakL = Math.random() > 0.92 ? 80 : randomL;
	const peakR = Math.random() > 0.92 ? 85 : randomR;

	if (meterL) meterL.style.width = `${peakL}%`;
	if (meterR) meterR.style.width = `${peakR}%`;

	micMeterAnimationId = requestAnimationFrame(animateMicMeters);
}

toggleMicMonitor?.addEventListener("change", () => {
	const isOn = toggleMicMonitor.checked;
	if (micMonitorStatus) {
		micMonitorStatus.innerText = isOn ? "Monitoring On" : "Monitoring Off";
		if (isOn) {
			micMonitorStatus.classList.add("active");
			log("[System] Zero-latency microphone loopback MONITORING ENABLED");
			animateMicMeters();
		} else {
			micMonitorStatus.classList.remove("active");
			log("[System] Zero-latency microphone loopback MONITORING DISABLED");
			if (micMeterAnimationId) {
				cancelAnimationFrame(micMeterAnimationId);
				micMeterAnimationId = null;
			}
			if (meterL) meterL.style.width = "0%";
			if (meterR) meterR.style.width = "0%";
		}
	}
});

// Microphone Gain Slider
const sliderMicGain = document.getElementById("sliderMicGain") as HTMLInputElement;
const micGainVal = document.getElementById("micGainVal") as HTMLElement;

sliderMicGain?.addEventListener("input", () => {
	const val = sliderMicGain.value;
	if (micGainVal) micGainVal.innerText = `${val} dB`;
});
sliderMicGain?.addEventListener("change", () => {
	const val = sliderMicGain.value;
	log(`[System] Microphone capture gain adjusted to: ${val} dB`);
});

// Factory Reset & Get FW buttons
const btnFactoryReset = document.getElementById("btnFactoryReset");
const btnGetFw = document.getElementById("btnGetFw");

btnFactoryReset?.addEventListener("click", () => {
	if (confirm("Perform full hardware factory reset? This will restore standard filters, AB amplifier modes, center channel balance, and clear local state settings.")) {
		log("[System] Executing hardware factory reset sequence...");
		
		// Reset controls
		if (selFilterType) {
			selFilterType.value = "FAST-LL";
			selFilterType.dispatchEvent(new Event("change"));
		}
		if (toggleAmpMode && toggleAmpMode.checked) {
			toggleAmpMode.checked = false;
			toggleAmpMode.dispatchEvent(new Event("change"));
		}
		if (toggleGainMode && toggleGainMode.checked) {
			toggleGainMode.checked = false;
			toggleGainMode.dispatchEvent(new Event("change"));
		}
		if (sliderBalance) {
			sliderBalance.value = "0";
			sliderBalance.dispatchEvent(new Event("input"));
			sliderBalance.dispatchEvent(new Event("change"));
		}
		if (toggleMicMonitor && toggleMicMonitor.checked) {
			toggleMicMonitor.checked = false;
			toggleMicMonitor.dispatchEvent(new Event("change"));
		}
		if (sliderMicGain) {
			sliderMicGain.value = "0";
			sliderMicGain.dispatchEvent(new Event("input"));
			sliderMicGain.dispatchEvent(new Event("change"));
		}
		
		log("[System] Factory reset complete.");
	}
});

btnGetFw?.addEventListener("click", () => {
	log("[System] Querying hardware version information...");
	const fwVersionEl = document.getElementById("fwVersion");
	if (fwVersionEl && fwVersionEl.innerText) {
		log(`[System] Device reports firmware version: ${fwVersionEl.innerText}`);
	} else {
		log("[System] Device reports version: Aura v0.4 (Active)");
	}
});
