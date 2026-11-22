class ChipAudio {
	private FREQUENCY = 440;

	private audioContext = new AudioContext();
	private oscillator: OscillatorNode | undefined;

	start() {
		if (this.oscillator) return;

		this.audioContext.resume();

		this.oscillator = this.audioContext.createOscillator();
		this.oscillator.frequency.value = this.FREQUENCY;

		this.oscillator.connect(this.audioContext.destination);
		this.oscillator.start();
	}

	stop() {
		this.oscillator?.stop();
		this.oscillator = undefined;
	}
}

export default ChipAudio;
