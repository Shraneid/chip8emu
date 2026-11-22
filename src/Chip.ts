import Rendering from "./rendering.ts";

class Chip {
	private RAM = new Uint16Array(4096);
	private stack = new Uint16Array(16);
	private programCounterRegister = 0x200;
	private indexRegister = 0;
	private delayRegister = 0;
	private soundRegister = 0;
	private generalRegisters = new Uint8Array(16);
	private displayBuffer = new Uint8Array(64 * 32);

	private rendering: Rendering;

	constructor(ROM_Filename: string, rendering: Rendering) {
		// load the ROM in RAM starting at index 0x200

		this.rendering = rendering;
	}

	private render() {
		this.rendering.setPixels(this.displayBuffer);
	}

	// This function should run at 60Hz
	private update() {
		this.delayRegister -= 1;
		this.soundRegister -= 1;

		this.render();
	}

	static async setup(ROM_Filename: string) {
		const rendering = new Rendering();
		await rendering.setup();

		return new Chip(ROM_Filename, rendering);
	}
}

export default Chip;
