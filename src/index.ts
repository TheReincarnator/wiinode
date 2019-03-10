import * as HID from "node-hid";

export class Remote {
	private hid: HID.HID;
	private listeners: { [button: string]: ((pressed: boolean) => void)[] } = {};
	private ledRumbleByte: number = 0;

	public buttonA: boolean = false;
	public buttonB: boolean = false;
	public button1: boolean = false;
	public button2: boolean = false;
	public buttonHome: boolean = false;
	public buttonPlus: boolean = false;
	public buttonMinus: boolean = false;

	public padLeft: boolean = false;
	public padRight: boolean = false;
	public padUp: boolean = false;
	public padDown: boolean = false;

	public accelerateX: number = 0;
	public accelerateY: number = 0;
	public accelerateZ: number = 0;

	public irx: number[] = [1023, 1023, 1023, 1023];
	public iry: number[] = [1023, 1023, 1023, 1023];

	constructor(path: string) {
		this.hid = new HID.HID(path);
		this.hid.write([0x12, 0x00, 0x37]);
		this.hid.on("data", data => this.processData(data));
	}

	public close(): void {
		if (!this.hid) {
			return;
		}

		this.hid.close();
		this.hid = undefined;
	}

	private notifyListeners(button: string, pressed: boolean): void {
		let buttonListeners = this.listeners[button];
		if (buttonListeners !== undefined) {
			buttonListeners.forEach(listener => {
				listener(pressed);
			});
		}
	}

	public on(button: string, listener: (pressed: boolean) => void): void {
		let buttonListeners = this.listeners[button];
		if (buttonListeners === undefined) {
			buttonListeners = [];
			this.listeners[button] = buttonListeners;
		}

		buttonListeners.push(listener);
	}

	private processData(data: Uint8Array): void {
		if (data.length < 17) {
			return;
		}

		// Buttons

		const b1: number = data[1];
		const b2: number = data[2];

		const buttonA: boolean = !!(b2 & 0x08);
		if (this.buttonA !== buttonA) this.notifyListeners("a", buttonA);
		this.buttonA = buttonA;

		const buttonB: boolean = !!(b2 & 0x04);
		if (this.buttonB !== buttonB) this.notifyListeners("b", buttonB);
		this.buttonB = buttonB;

		const button1: boolean = !!(b2 & 0x02);
		if (this.button1 !== button1) this.notifyListeners("1", button1);
		this.button1 = button1;

		const button2: boolean = !!(b2 & 0x01);
		if (this.button2 !== button2) this.notifyListeners("2", button2);
		this.button2 = button2;

		const buttonHome: boolean = !!(b2 & 0x80);
		if (this.buttonHome !== buttonHome)
			this.notifyListeners("home", buttonHome);
		this.buttonHome = buttonHome;

		const buttonPlus: boolean = !!(b1 & 0x10);
		if (this.buttonPlus !== buttonPlus)
			this.notifyListeners("plus", buttonPlus);
		this.buttonPlus = buttonPlus;

		const buttonMinus: boolean = !!(b2 & 0x10);
		if (this.buttonMinus !== buttonMinus)
			this.notifyListeners("minus", buttonMinus);
		this.buttonMinus = buttonMinus;

		const padLeft: boolean = !!(b1 & 0x01);
		if (this.padLeft !== padLeft) this.notifyListeners("left", padLeft);
		this.padLeft = padLeft;

		const padRight: boolean = !!(b1 & 0x02);
		if (this.padRight !== padRight) this.notifyListeners("right", padRight);
		this.padRight = padRight;

		const padUp: boolean = !!(b1 & 0x08);
		if (this.padUp !== padUp) this.notifyListeners("up", padUp);
		this.padUp = padUp;

		const padDown: boolean = !!(b1 & 0x04);
		if (this.padDown !== padDown) this.notifyListeners("down", padDown);
		this.padDown = padDown;

		// Accelerates

		this.accelerateX = ((data[3] - 0x80) << 2) + ((b1 & 0x60) >> 5);
		this.accelerateY = ((data[4] - 0x80) << 2) + ((b2 & 0x20) >> 4);
		this.accelerateZ = ((data[5] - 0x80) << 2) + ((b2 & 0x40) >> 5);

		// IR Camera

		this.irx[0] = data[6] + ((data[8] & 0x30) << 4);
		this.iry[0] = data[7] + ((data[8] & 0xc0) << 2);

		this.irx[1] = data[9] + ((data[8] & 0x03) << 8);
		this.iry[1] = data[10] + ((data[8] & 0x0c) << 6);

		this.irx[2] = data[11] + ((data[13] & 0x30) << 4);
		this.iry[2] = data[12] + ((data[13] & 0xc0) << 2);

		this.irx[3] = data[14] + ((data[13] & 0x03) << 8);
		this.iry[3] = data[15] + ((data[13] & 0x0c) << 6);

		// TODO: Camera
	}

	public rumble(msecs?: number): void {
		if (!msecs || msecs <= 0) msecs = 128;
		if (msecs > 1000) msecs = 1000;

		this.ledRumbleByte |= 0x01;
		this.hid.write([0x11, this.ledRumbleByte]);

		setTimeout(() => {
			this.ledRumbleByte &= 0xfe;
			this.hid.write([0x11, this.ledRumbleByte]);
		}, msecs);
	}

	public setLed(id: number): void {
		this.setLeds(id === 1, id === 2, id === 3, id === 4);
	}

	public setLeds(
		led1: boolean,
		led2: boolean,
		led3: boolean,
		led4: boolean
	): void {
		this.ledRumbleByte &= 0x0f;
		this.ledRumbleByte |= led1 ? 0x10 : 0x00;
		this.ledRumbleByte |= led2 ? 0x20 : 0x00;
		this.ledRumbleByte |= led3 ? 0x40 : 0x00;
		this.ledRumbleByte |= led4 ? 0x80 : 0x00;
		this.hid.write([0x11, this.ledRumbleByte]);
	}
}

let remotes: { [path: string]: Remote } = {};

export function findRemotes(): Remote[] {
	const devices = HID.devices().filter(device => {
		return (
			device.vendorId === 0x057e &&
			(device.productId === 0x0306 || device.productId === 0x0330)
		);
	});

	const newRemotes: { [path: string]: Remote } = {};
	const newRemotesArray: Remote[] = [];
	devices.forEach(device => {
		let remote = remotes[device.path];
		if (remote === undefined) {
			remote = new Remote(device.path);
		}

		newRemotes[device.path] = remote;
		newRemotesArray.push(remote);
	});

	Object.keys(remotes).forEach(path => {
		if (newRemotes[path] === undefined) {
			remotes[path].close();
		}
	});

	remotes = newRemotes;

	return newRemotesArray;
}
