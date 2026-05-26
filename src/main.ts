import "./style.css";
import { flashToFlash, syncToDevice } from "./dsp.ts";
import {
	connectToDevice,
	disconnectDevice,
	initState,
	resetToDefaults,
} from "./fn.ts";
import { setGlobalGain } from "./helpers.ts";
import { exportProfile, importProfile } from "./importExport.ts";

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
