import ChipAudio from "./chipAudio.ts";
import Clock from "./clock.ts";
import { FONT_DATA, toHex } from "./helpers.ts";
import Rendering from "./rendering.ts";

class Chip {
	debugEl = document.getElementById("debug")!;

	private RAM = new Uint16Array(4096);
	private stack: number[] = [];
	private programCounterRegister = 0x200;
	private indexRegister = 0;
	private delayRegister = 0;
	private soundRegister = 0;
	private generalRegisters = new Uint8Array(16);
	private displayBuffer = new Uint8Array(64 * 32);

	private rendering: Rendering;
	private clock: Clock;
	private audio: ChipAudio;

	constructor(ROM: Uint8Array, rendering: Rendering) {
		// load font data
		for (let i = 0; i < FONT_DATA.length; i++) {
			this.RAM[0x050 + i] = FONT_DATA[i];
		}

		// load the ROM in RAM starting at index 0x200
		for (let i = 0; i < ROM.length; i++) {
			this.RAM[0x200 + i] = ROM[i];
		}

		this.rendering = rendering;
		this.clock = new Clock(this.update);
		this.audio = new ChipAudio();

		this.renderDebugInfo();
	}

	static async setup(ROM_Filename: string) {
		const rendering = new Rendering();
		await rendering.setup();

		const bytes = new Uint8Array(
			await (await fetch(ROM_Filename)).arrayBuffer(),
		);

		return new Chip(bytes, rendering);
	}

	public run() {
		while (true) {
			this.step();
		}
	}

	public step() {
		const instruction = this.fetchInstruction();
		this.decodeAndRunInstruction(instruction);

		this.renderDebugInfo();
	}

	fetchInstruction() {
		const instruction =
			(this.RAM[this.programCounterRegister] << 8) |
			this.RAM[this.programCounterRegister + 1];

		this.programCounterRegister += 2;

		return instruction;
	}

	private decodeAndRunInstruction(instruction: number) {
		console.log(instruction.toString(2).padStart(16, "0"));

		switch (instruction & 0xf000) {
			case 0x0000:
				if (instruction === 0x00e0) this.clearScreen();
				else if (instruction === 0x00ee) this.returnFromSubroutine();
				break;
			case 0x1000:
				this.jump(instruction);
				break;
			case 0x2000:
				this.jumpToSubroutine(instruction);
				break;
			case 0x6000:
				this.setRegister(instruction);
				break;
			case 0x7000:
				this.addToRegister(instruction);
				break;
			case 0xa000:
				this.setIndexRegister(instruction);
				break;
			case 0xd000:
				this.display(instruction);
				break;
		}
	}

	// OPCODE FUNCTIONS
	private clearScreen() {
		this.displayBuffer = new Uint8Array(64 * 32);
	}

	private jump(instruction: number) {
		this.programCounterRegister = instruction & 0x0fff;
	}

	private jumpToSubroutine(instruction: number) {
		this.stack.push(this.programCounterRegister);
		this.jump(instruction);
	}

	private returnFromSubroutine() {
		this.programCounterRegister = this.stack.pop()!;
	}

	private setRegister(instruction: number) {
		const register = (instruction >> 8) & 0x0f;
		const value = instruction & 0x00ff;

		this.generalRegisters[register] = value;
	}

	private addToRegister(instruction: number) {
		const register = (instruction >> 8) & 0x0f;
		const value = instruction & 0x00ff;

		this.generalRegisters[register] += value;
	}

	private setIndexRegister(instruction: number) {
		this.indexRegister = instruction & 0x0fff;
	}

	private display(instruction: number) {
		// DXYN
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;
		const n = instruction & 0x000f;

		const x = this.generalRegisters[xIndex];
		const y = this.generalRegisters[yIndex];
	}

	// EMULATOR FUNCTIONS
	// sends the displayBuffer to the webGPU texture buffer
	private render() {
		this.rendering.setPixels(this.displayBuffer);
	}

	// This function should run at 60Hz
	update = () => {
		if (this.delayRegister > 0) this.delayRegister -= 1;
		if (this.soundRegister > 0) this.soundRegister -= 1;

		this.render();

		if (this.soundRegister > 0) {
			this.audio.start();
		} else {
			this.audio.stop();
		}
	};

	private renderDebugInfo() {
		const registerValues = Array.from(
			this.generalRegisters,
			(v, i) => `V${toHex(i)}: ${toHex(v)}`,
		);

		const rows: string[] = [];
		for (let i = 0; i < registerValues.length; i += 4) {
			rows.push(registerValues.slice(i, i + 4).join("   "));
		}

		this.debugEl.textContent = [
			`Program Counter: ${toHex(this.programCounterRegister, 3)}   	Opcode: ${toHex(this.RAM[this.programCounterRegister], 4)}`,
			`Index:  ${toHex(this.indexRegister, 3)}   		Stack Pointer: ${toHex(this.stack.length > 0 ? this.stack[this.stack.length - 1] : 0)}`,
			`Delay: ${toHex(this.delayRegister)}   		Sound: ${toHex(this.soundRegister)}`,
			"",
			...rows,
		].join("\n");
	}
}

export default Chip;
