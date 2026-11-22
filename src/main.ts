import "./style.css";
import Chip from "./chip.ts";

const stepButton = document.getElementById("step");
const runButton = document.getElementById("run");
const pauseButton = document.getElementById("pause");

const STEPS_PER_FRAME = Math.ceil(700 / 60);

let running = false;
let frameId: number | null = null;

// const chip = await Chip.setup("assets/ibm-logo.ch8");
// const chip = await Chip.setup("assets/3-corax+.ch8");
// const chip = await Chip.setup("assets/4-flags.ch8");
// const chip = await Chip.setup("assets/5-quirks.ch8");
// const chip = await Chip.setup("assets/6-keypad.ch8");
const chip = await Chip.setup("assets/7-beep.ch8");
console.log("set up");

function loop() {
	if (!running) return;
	for (let i = 0; i < STEPS_PER_FRAME; i++) {
		chip.step();
	}
	frameId = requestAnimationFrame(loop);
}

function run() {
	if (running) return;
	running = true;
	frameId = requestAnimationFrame(loop);
}

function pause() {
	running = false;
	if (frameId !== null) {
		cancelAnimationFrame(frameId);
		frameId = null;
	}
}

stepButton?.addEventListener("click", () => chip.step());
runButton?.addEventListener("click", run);
pauseButton?.addEventListener("click", pause);
