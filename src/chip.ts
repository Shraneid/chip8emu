import Clock from "./Clock.ts";
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
	private clock: Clock;

	constructor(ROM: Uint8Array, rendering: Rendering) {
		// load font data
		const FONT_DATA = new Uint8Array([
			0xf0,
			0x90,
			0x90,
			0x90,
			0xf0, // 0
			0x20,
			0x60,
			0x20,
			0x20,
			0x70, // 1
			0xf0,
			0x10,
			0xf0,
			0x80,
			0xf0, // 2
			0xf0,
			0x10,
			0xf0,
			0x10,
			0xf0, // 3
			0x90,
			0x90,
			0xf0,
			0x10,
			0x10, // 4
			0xf0,
			0x80,
			0xf0,
			0x10,
			0xf0, // 5
			0xf0,
			0x80,
			0xf0,
			0x90,
			0xf0, // 6
			0xf0,
			0x10,
			0x20,
			0x40,
			0x40, // 7
			0xf0,
			0x90,
			0xf0,
			0x90,
			0xf0, // 8
			0xf0,
			0x90,
			0xf0,
			0x10,
			0xf0, // 9
			0xf0,
			0x90,
			0xf0,
			0x90,
			0x90, // A
			0xe0,
			0x90,
			0xe0,
			0x90,
			0xe0, // B
			0xf0,
			0x80,
			0x80,
			0x80,
			0xf0, // C
			0xe0,
			0x90,
			0x90,
			0x90,
			0xe0, // D
			0xf0,
			0x80,
			0xf0,
			0x80,
			0xf0, // E
			0xf0,
			0x80,
			0xf0,
			0x80,
			0x80, // F
		]);
		for (let i = 0; i < FONT_DATA.length; i++) {
			this.RAM[0x050 + i] = FONT_DATA[i];
		}

		// load the ROM in RAM starting at index 0x200
		for (let i = 0; i < ROM.length; i++) {
			this.RAM[0x200 + i] = ROM[i];
		}

		this.rendering = rendering;
		this.clock = new Clock(this.update);
	}

	static async setup(ROM_Filename: string) {
		const rendering = new Rendering();
		await rendering.setup();

		const bytes = new Uint8Array(
			await (await fetch(ROM_Filename)).arrayBuffer(),
		);

		return new Chip(bytes, rendering);
	}

	private render() {
		this.rendering.setPixels(this.displayBuffer);
	}

	// This function should run at 60Hz
	update = () => {
		this.delayRegister -= 1;
		this.soundRegister -= 1;

		this.render();
	};
}

export default Chip;
