class Keyboard {
	public currentPressedKey: number | null = null;
	public latestKeyPressed: number | null = null;

	constructor() {
		document.addEventListener("keydown", (event) => {
			this.currentPressedKey = this.keyMap[event.code];
		});
		document.addEventListener("keyup", (event) => {
			this.currentPressedKey = null;
			this.latestKeyPressed = this.keyMap[event.code];
		});
	}

	private keyMap: any = {
		Digit1: 0x1,
		Digit2: 0x2,
		Digit3: 0x3,
		Digit4: 0xc,
		KeyQ: 0x4,
		KeyW: 0x5,
		KeyE: 0x6,
		KeyR: 0xd,

		KeyA: 0x7,
		KeyS: 0x8,
		KeyD: 0x9,
		KeyF: 0xe,

		KeyZ: 0xa,
		KeyX: 0x0,
		KeyC: 0xb,
		KeyV: 0xf,
	};
}

export default Keyboard;
