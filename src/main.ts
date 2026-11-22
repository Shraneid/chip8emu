import "./style.css";
import Chip from "./chip.ts";

const stepButton = document.getElementById("step");

const chip = await Chip.setup("assets/IBM Logo.ch8");
console.log("set up");

stepButton?.addEventListener("click", () => chip.step());
