class Clock {
	private readonly step = 1000 / 60;
	private readonly updateFunction;

	private next = 0;

	constructor(functionToRunAt60Hz: () => void) {
		this.updateFunction = functionToRunAt60Hz;

		this.next = performance.now() + this.step;
		this.schedule();
	}

	private schedule() {
		setTimeout(
			() => {
				this.updateFunction();
				this.next += this.step;
				if (this.next < performance.now()) {
					this.next = performance.now() + this.step;
				}

				this.schedule();
			},
			Math.max(0, this.next - performance.now()),
		);
	}
}

export default Clock;
