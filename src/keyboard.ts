class Keyboard {
	private currentKey: string | null = null;

	constructor() {
		document.addEventListener("keydown", (event) => {
			this.currentKey = this.keyMap[event.code];
		});
		document.addEventListener("keyup", (event) => {
			this.currentKey = null;
		});
	}

	private keyMap: any = {
		Digit1: "1",
		Digit2: "2",
		Digit3: "3",
		Digit4: "4",
		KeyQ: "Q",
		KeyW: "W",
		KeyE: "E",
		KeyR: "R",

		KeyA: "A",
		KeyS: "S",
		KeyD: "D",
		KeyF: "F",

		KeyZ: "Z",
		KeyX: "X",
		KeyC: "C",
		KeyV: "V",
	};
}

export default Keyboard;
