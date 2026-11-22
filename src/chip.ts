import ChipAudio from "./chipAudio.ts";
import Clock from "./clock.ts";
import { FONT_DATA, toHex } from "./helpers.ts";
import Keyboard from "./keyboard.ts";
import Rendering from "./rendering.ts";

class Chip {
	debugEl = document.getElementById("debug")!;

	private RAM = new Uint8Array(4096);
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
	private keyboard: Keyboard;

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
		this.keyboard = new Keyboard();

		this.renderDebugInfo();
	}

	static async setup(ROM_Filename: string) {
		const rendering = new Rendering();
		await rendering.setup();

		const res = await fetch(ROM_Filename);
		console.log(res.status, res.headers.get("content-type"));
		const bytes = new Uint8Array(await res.arrayBuffer());
		console.log(new TextDecoder().decode(bytes.slice(0, 20)));

		return new Chip(bytes, rendering);
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
			case 0x3000:
				this.skipIfEqual(instruction);
				break;
			case 0x4000:
				this.skipIfNotEqual(instruction);
				break;
			case 0x5000:
				this.skipIfValuesEqual(instruction);
				break;
			case 0x6000:
				this.setRegister(instruction);
				break;
			case 0x7000:
				this.addToRegister(instruction);
				break;
			case 0x8000:
				switch (instruction & 0x000f) {
					case 0x00:
						this.setXtoY(instruction);
						break;
					case 0x01:
						this.or(instruction);
						break;
					case 0x02:
						this.and(instruction);
						break;
					case 0x03:
						this.xor(instruction);
						break;
					case 0x04:
						this.add(instruction);
						break;
					case 0x05:
						this.subtractXY(instruction);
						break;
					case 0x06:
						this.shiftRight(instruction);
						break;
					case 0x07:
						this.subtractYX(instruction);
						break;
					case 0x0e:
						this.shiftLeft(instruction);
						break;
				}
				break;
			case 0x9000:
				this.skipIfValuesEqual(instruction);
				break;
			case 0xa000:
				this.setIndexRegister(instruction);
				break;
			case 0xb000:
				this.jumpWithOffset(instruction);
				break;
			case 0xc000:
				this.random(instruction);
				break;
			case 0xd000:
				this.display(instruction);
				break;
			case 0xe000:
				switch (instruction & 0xff) {
					case 0x9e:
						this.skipIfPressed(instruction);
						break;
					case 0xa1:
						this.skipIfPressed(instruction);
						break;
				}
				break;
			case 0xf000:
				switch (instruction & 0xff) {
					case 0x07:
						this.saveTimerToRegister(instruction);
						break;
					case 0x0a:
						this.getKey(instruction);
						break;
					case 0x15:
						this.setDelayTimer(instruction);
						break;
					case 0x18:
						this.setSoundTimer(instruction);
						break;
					case 0x1e:
						this.addToIndex(instruction);
						break;
				}
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

	private saveTimerToRegister(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;

		this.generalRegisters[xIndex] = this.delayRegister;
	}

	private setDelayTimer(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;

		this.delayRegister = this.generalRegisters[xIndex];
	}

	private setSoundTimer(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;

		this.soundRegister = this.generalRegisters[xIndex];
	}

	private addToIndex(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;

		const result = this.indexRegister + this.generalRegisters[xIndex];

		if (((result >> 3) & 0x1) === 0x1) this.generalRegisters[0xf] = 0x1; // overflow flag

		this.indexRegister = result;
	}

	private getKey(instruction: number) {
		if (this.keyboard.currentPressedKey === null) {
			this.programCounterRegister -= 2;
			return;
		}

		const xIndex = (instruction & 0x0f00) >> 8;
		this.generalRegisters[xIndex] = this.keyboard.currentPressedKey!;
	}

	private skipIfPressed(instruction: number) {
		const key = instruction & 0xff;
		if (this.keyboard.currentPressedKey === key)
			this.programCounterRegister += 2;
	}

	private skipIfNotPressed(instruction: number) {
		const key = instruction & 0xff;
		if (this.keyboard.currentPressedKey !== key)
			this.programCounterRegister += 2;
	}

	private random(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;

		const rand = Math.floor(Math.random() * 256);

		this.generalRegisters[xIndex] = instruction & (0x00ff + rand);
	}

	private skipIfEqual(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const value = instruction & 0x00ff;
		if (this.RAM[xIndex] === value) this.programCounterRegister += 2;
	}

	private skipIfNotEqual(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const value = instruction & 0x00ff;
		if (this.RAM[xIndex] !== value) this.programCounterRegister += 2;
	}

	private skipIfValuesEqual(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;
		if (this.RAM[xIndex] === this.RAM[yIndex]) this.programCounterRegister += 2;
	}

	private skipIfValuesNotEqual(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;
		if (this.RAM[xIndex] !== this.RAM[yIndex]) this.programCounterRegister += 2;
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

	private setXtoY(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] = this.generalRegisters[yIndex];
	}

	private or(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] =
			this.generalRegisters[xIndex] | this.generalRegisters[yIndex];
	}

	private and(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] =
			this.generalRegisters[xIndex] & this.generalRegisters[yIndex];
	}

	private xor(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] =
			this.generalRegisters[xIndex] ^ this.generalRegisters[yIndex];
	}

	private add(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		const result =
			this.generalRegisters[xIndex] + this.generalRegisters[yIndex];
		if (result > 255) this.generalRegisters[0xf] = 0x1;

		this.generalRegisters[xIndex] = result & 0xff;
	}

	private subtractXY(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		const result =
			this.generalRegisters[xIndex] - this.generalRegisters[yIndex];
		if (result < 0) this.generalRegisters[0xf] = 0x0;
		else this.generalRegisters[0xf] = 0x1;

		this.generalRegisters[xIndex] = result & 0xff;
	}

	private subtractYX(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		const result =
			this.generalRegisters[yIndex] - this.generalRegisters[xIndex];
		if (result < 0) this.generalRegisters[0xf] = 0x0;
		else this.generalRegisters[0xf] = 0x1;

		this.generalRegisters[xIndex] = result & 0xff;
	}

	private shiftRight(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] = this.generalRegisters[yIndex];

		this.generalRegisters[0xf] = this.generalRegisters[xIndex] & 0x01;
		this.generalRegisters[xIndex] = this.generalRegisters[xIndex] >> 1;
	}

	private shiftLeft(instruction: number) {
		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		this.generalRegisters[xIndex] = this.generalRegisters[yIndex];

		this.generalRegisters[0xf] = this.generalRegisters[xIndex] & 0x80;
		this.generalRegisters[xIndex] = this.generalRegisters[xIndex] << 1;
	}

	private jumpWithOffset(instruction: number) {
		const offset = this.generalRegisters[0x00];

		this.programCounterRegister = (offset + instruction) & 0x0fff;
	}

	private display(instruction: number) {
		const spriteRAMIndex = this.indexRegister;

		const xIndex = (instruction & 0x0f00) >> 8;
		const yIndex = (instruction & 0x00f0) >> 4;

		const n = instruction & 0x000f;

		const x = this.generalRegisters[xIndex] % 64;
		const y = this.generalRegisters[yIndex] % 32;

		this.generalRegisters[0xf] = 0;

		for (let j = 0; j < n; j++) {
			if (y + j >= 32) break; // outside of the display

			const sprite = this.RAM[spriteRAMIndex + j] & 0xff;
			for (let i = 0; i < 8; i++) {
				if (x + i >= 64) break; // outside of the display

				const displayIndex = x + i + (y + j) * 64;
				const spriteBit = (sprite >> (7 - i)) & 0x01;

				if (this.displayBuffer[displayIndex] === 1 && spriteBit === 1) {
					this.generalRegisters[0xf] = 1;
				}
				// XOR (^)
				this.displayBuffer[displayIndex] ^= spriteBit;
			}
		}
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
			`Program Counter: ${toHex(this.programCounterRegister, 3)}   	Opcode: ${toHex((this.RAM[this.programCounterRegister] << 8) | this.RAM[this.programCounterRegister + 1], 4)}`,
			`Index:  ${toHex(this.indexRegister, 3)}   		Stack Pointer: ${toHex(this.stack.length > 0 ? this.stack[this.stack.length - 1] : 0)}`,
			`Delay: ${toHex(this.delayRegister)}   		Sound: ${toHex(this.soundRegister)}`,
			"",
			...rows,
		].join("\n");
	}
}

export default Chip;
