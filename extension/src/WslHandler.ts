import { getConfig, getDisplay } from './config';
import { RemoteHandler } from './RemoteHandler';

export class WslHandler extends RemoteHandler {
	public get enabled(): boolean {
		return getConfig('WSL.enable', true);
	}

	public get displaySettings(): string[] {
		return ['remoteX11.WSL.enable', 'remoteX11.display', 'remoteX11.screen'];
	}

	public getDisplay(): Promise<string> {
		return Promise.resolve(getDisplay('localhost'));
	}
}
