class Rendering {
	startTime: number | undefined;
	lastFrameTime: number | undefined;
	private canvas: HTMLCanvasElement = document.getElementById(
		`GLCanvas`,
	) as HTMLCanvasElement;
	// @ts-expect-error
	private adapter: GPUAdapter | null;
	private device: any;
	private context: any;
	private devicePixelRatio: number = window.devicePixelRatio;
	// @ts-expect-error
	private presentationFormat: GPUTextureFormat;
	private WIDTH = 64;
	private HEIGHT = 32;
	// @ts-expect-error
	private vertexShader: GPUShaderModule;
	// @ts-expect-error
	private fragmentShader: GPUShaderModule;
	private texture: any;
	private data: Uint8Array<ArrayBuffer> = new Uint8Array(
		this.WIDTH * this.HEIGHT,
	);
	private bindGroupLayout: any;
	private bindGroup: any;
	private pipelineLayout: any;
	private pipeline: any;
	private frameCount = 0;

	constructor() {}

	async loadWGSL(path: string) {
		const response = await fetch(path, { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Failed to load shader: ${path}`);
		}
		return response.text();
	}

	setPixels(displayBuffer: Uint8Array) {
		for (let j = 0; j < this.HEIGHT; j++) {
			for (let i = 0; i < this.WIDTH; i++) {
				this.data[i + j * this.WIDTH] = displayBuffer[
					i + j * this.WIDTH
				] as number;
			}
		}
	}

	async setup() {
		this.adapter = await navigator.gpu?.requestAdapter();
		this.device = await this.adapter?.requestDevice();

		if (!this.device) {
			throw Error("No GPU detected");
		}

		this.context = this.canvas.getContext("webgpu");
		if (!this.context) {
			throw Error("Error getting context");
		}

		this.canvas.width = this.canvas.clientWidth * this.devicePixelRatio;
		this.canvas.height = this.canvas.clientHeight * this.devicePixelRatio;

		this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		(this.context as GPUCanvasContext).configure({
			device: this.device,
			format: this.presentationFormat,
		});

		// LOAD SHADERS
		const loadShaderModule = async (path: string): Promise<GPUShaderModule> => {
			const code = await this.loadWGSL(path);
			const module = this.device.createShaderModule({ code, label: path });

			const info = await module.getCompilationInfo();
			const errors = info.messages.filter((m: any) => m.type === "error");
			if (errors.length > 0) {
				for (const m of errors) {
					console.error(
						`%c${path}:${m.lineNum}:${m.linePos} ${m.message}`,
						"color:#ff5555",
					);
				}
				throw new Error(
					`Shader compilation failed in ${path}:\n` +
						errors
							.map((m: any) => `  ${m.lineNum}:${m.linePos} ${m.message}`)
							.join("\n"),
				);
			}
			return module;
		};

		this.vertexShader = await loadShaderModule("shaders/vertex.wgsl");
		this.fragmentShader = await loadShaderModule("shaders/fragment.wgsl");
		// END LOAD SHADERS

		this.texture = this.device.createTexture({
			size: [this.WIDTH, this.HEIGHT],
			format: "r8uint",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});

		this.device.queue.writeTexture(
			{ texture: this.texture },
			this.data,
			{ bytesPerRow: this.WIDTH },
			{ width: this.WIDTH, height: this.HEIGHT },
		);

		this.bindGroupLayout = this.device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.FRAGMENT,
					texture: { sampleType: "uint" },
				},
			],
		});

		this.bindGroup = this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [{ binding: 0, resource: this.texture.createView() }],
		});

		this.pipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [this.bindGroupLayout],
		});

		this.pipeline = this.device.createRenderPipeline({
			layout: this.pipelineLayout,
			primitive: {
				topology: "triangle-list",
			},
			vertex: {
				module: this.vertexShader,
			},
			fragment: {
				module: this.fragmentShader,
				targets: [
					{
						format: this.presentationFormat,
					},
				],
			},
		});

		requestAnimationFrame(this.renderLoop);
	}

	render = (deltaTime: number, elapsedTime: number, frameCount: number) => {
		this.device.queue.writeTexture(
			{ texture: this.texture },
			this.data,
			{ bytesPerRow: this.WIDTH },
			{ width: this.WIDTH, height: this.HEIGHT },
		);

		const encoder = this.device.createCommandEncoder({
			label: "command encoder",
		});

		const renderPass = encoder.beginRenderPass({
			colorAttachments: [
				{
					view: this.context.getCurrentTexture().createView(),
					clearValue: [0, 0, 0, 1],
					loadOp: "clear",
					storeOp: "store",
				},
			],
		});
		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(0, this.bindGroup);
		renderPass.draw(3);
		renderPass.end();

		this.device.queue.submit([encoder.finish()]);
	};

	renderLoop = (timestamp: number) => {
		if (this.startTime === undefined) {
			this.startTime = timestamp;
			this.lastFrameTime = timestamp;
		}
		const elapsedTime = timestamp - this.startTime;
		const deltaTime = timestamp - this.lastFrameTime!;

		this.render(deltaTime, elapsedTime, this.frameCount);

		this.lastFrameTime = timestamp;
		this.frameCount += 1;
		requestAnimationFrame(this.renderLoop);
	};
}

export default Rendering;
