import { getConfig, getDisplay } from './config';
import { RemoteHandler } from './RemoteHandler';

export class WslHandler extends RemoteHandler {
	public get enabled() {
		return getConfig('WSL.enable', true);
	}

	public get displaySettings() {
		return ['remoteX11.WSL.enable', 'remoteX11.display', 'remoteX11.screen'];
	}

	public getDisplay() {
		return Promise.resolve(getDisplay('localhost'));
	}
}
