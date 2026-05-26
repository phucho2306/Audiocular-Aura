import {
	DEFAULT_FREQS,
	VID_COMTRUE,
	VID_FIIO,
	VID_SAVITECH,
	VID_SAVITECH_OFFICIAL,
	VID_AUDIOCULAR,
} from "./constants.ts";
import { readDeviceParams, setupListener, syncToDevice } from "./dsp.ts";
import { enableControls, log, updateGlobalGainUI } from "./helpers.ts";
import type { Band, EQ } from "./main.ts";
import { renderPEQ, resizeCanvas } from "./peq.ts";

/**
 * STATE
 */
let device: HIDDevice | null = null;
let globalGainState: number = 0;
let eqState: EQ = defaultEqState();

/**
 * INITIALIZATION
 */
export function initState() {
	renderUI(eqState);
	resizeCanvas();
}

/**
 * Update global gain state and refresh UI
 * @param gain The new gain value (in dB)
 */
export function setGlobalGain(gain: number) {
	globalGainState = gain;
	updateGlobalGainUI(gain);
}

export function getDevice() {
	return device;
}

export function getEqState() {
	return eqState;
}

export function setEqState(eq: EQ) {
	eqState = eq;
}

export function setEQ(
	index: number,
	key: keyof Band,
	value: number | boolean | string,
) {
	// @ts-expect-error - Dynamic key assignment
	eqState[index][key] = value;
}

export function getGlobalGainState() {
	return globalGainState;
}

export function setGlobalGainState(gainState: number) {
	globalGainState = gainState;
}

/**
 * Generate default flat 8-band EQ state
 */
export function defaultEqState(): EQ {
	return DEFAULT_FREQS.map((freq, i) => ({
		index: i,
		freq: freq,
		gain: 0,
		q: 0.75, // Default Q
		type: "PK",
		enabled: true,
	})) as EQ;
}

/**
 * Trigger UI updates and EQ graph re-render
 */
export function renderUI(eqState: EQ) {
	const container = document.getElementById("eqContainer");
	if (!container) {
		console.error("EQ Container element not found!");
		return;
	}

	renderPEQ(container, eqState, (index, key, value) => {
		updateState(index, key, value);
	});
}

/**
 * Connect to audio DAC via WebHID
 */
export async function connectToDevice() {
	try {
		// Basic automatic filters
		const filters: any[] = [
			{ vendorId: VID_AUDIOCULAR },        // TTGK / Audiocular Aura (CB5100)
			{ vendorId: VID_SAVITECH_OFFICIAL }, // Fosi, iBasso, Savitech Official
			{ vendorId: VID_SAVITECH },          // JCally, Savitech Generic
			{ vendorId: VID_COMTRUE },           // Moondrop, Tanchjim
			{ vendorId: VID_FIIO },              // FiiO
		];

		// Check for custom VID/PID overrides in the UI
		const customVidEl = document.getElementById("customVid") as HTMLInputElement;
		const customPidEl = document.getElementById("customPid") as HTMLInputElement;
		
		if (customVidEl && customVidEl.value.trim() !== "") {
			const rawVid = customVidEl.value.trim();
			const vid = parseInt(rawVid.startsWith("0x") ? rawVid : "0x" + rawVid, 16);
			
			if (!isNaN(vid)) {
				const customFilter: any = { vendorId: vid };
				
				if (customPidEl && customPidEl.value.trim() !== "") {
					const rawPid = customPidEl.value.trim();
					const pid = parseInt(rawPid.startsWith("0x") ? rawPid : "0x" + rawPid, 16);
					if (!isNaN(pid)) {
						customFilter.productId = pid;
					}
				}
				
				// Place custom filter at the front
				filters.unshift(customFilter);
				log(`Attempting connection with custom filter: VID 0x${vid.toString(16).toUpperCase()}${customFilter.productId ? `, PID 0x${customFilter.productId.toString(16).toUpperCase()}` : ""}`);
			} else {
				log("Warning: Invalid Hex Vendor ID entered. Falling back to default list.");
			}
		}

		log("Opening connection window. Please select your audio DAC...");
		const devices = await navigator.hid.requestDevice({ filters });
		
		if (devices.length === 0) {
			log("Connection cancelled: No device selected.");
			return;
		}

		device = devices[0];
		await device.open();

		log(
			`Successfully connected to: ${device.productName || "Unknown DAC"} (VID: 0x${device.vendorId.toString(16).toUpperCase()}, PID: 0x${device.productId.toString(16).toUpperCase()})`,
		);

		// Update UI elements for connection state
		const statusBadge = document.getElementById("statusBadge");
		if (statusBadge) {
			statusBadge.innerText = "ONLINE";
			statusBadge.classList.remove("offline");
			statusBadge.classList.add("online");
		}
		
		const btnConnect = document.getElementById("btnConnect");
		if (btnConnect) btnConnect.style.display = "none";
		
		const disconnectSection = document.getElementById("disconnectSection");
		if (disconnectSection) disconnectSection.style.display = "flex";

		enableControls(true);

		// Support parameter reading for Savitech-based DACs
		if (
			device.vendorId === VID_SAVITECH ||
			device.vendorId === VID_SAVITECH_OFFICIAL ||
			device.vendorId === VID_AUDIOCULAR ||
			(customVidEl && customVidEl.value.trim() !== "") // Allow reading for custom-defined Savitech variants
		) {
			setupListener(device);
			await readDeviceParams(device);
		} else {
			log("Note: Parameter reading is only supported for Savitech-based devices. Starting with a flat profile.");
		}
	} catch (err) {
		log(`Connection Error: ${(err as Error).message}`);
	}
}

/**
 * Disconnect current device
 */
export async function disconnectDevice() {
	if (!device) return;
	try {
		log(`Disconnecting from: ${device.productName || "DAC"}`);
		await device.close();
		device = null;
		
		const statusBadge = document.getElementById("statusBadge");
		if (statusBadge) {
			statusBadge.innerText = "OFFLINE";
			statusBadge.classList.remove("online");
			statusBadge.classList.add("offline");
		}
		
		const btnConnect = document.getElementById("btnConnect");
		if (btnConnect) btnConnect.style.display = "inline-block";
		
		const disconnectSection = document.getElementById("disconnectSection");
		if (disconnectSection) disconnectSection.style.display = "none";

		const versionEl = document.getElementById("fwVersion");
		if (versionEl) versionEl.innerText = "";

		enableControls(false);
		log("Disconnected.");
	} catch (err) {
		log(`Disconnection Error: ${(err as Error).message}`);
	}
}

/**
 * Reset all bands and gain to flat values and sync
 */
export async function resetToDefaults() {
	if (
		!confirm(
			"Reset all bands to flat Defaults (0dB, Q=0.75) and optimal frequencies?",
		)
	)
		return;

	log("Resetting to factory defaults...");

	eqState = defaultEqState();
	setGlobalGain(0);
	renderUI(eqState);

	await syncToDevice();
	log("Defaults applied and synced.");
}

/**
 * Update band properties from user inputs
 */
export function updateState(
	index: number,
	key: string,
	value: string | number | boolean,
) {
	if (key === "freq" || key === "gain" || key === "q")
		value = parseFloat(value as string);
	else if (key === "enabled") value = Boolean(value);

	setEQ(index, key as keyof Band, value);
	renderUI(eqState);
}

// Expose handlers for window scope trigger events
(window as any).updateState = updateState;
