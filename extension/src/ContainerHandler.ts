import { getConfig, getDisplay } from './config';
import { RemoteHandler } from './RemoteHandler';

export class ContainerHandler extends RemoteHandler {
	public get enabled() {
		return getConfig('container.enable', true);
	}

	public get displaySettings() {
		return ['remoteX11.container.enable', 'remoteX11.display', 'remoteX11.screen'];
	}

	public getDisplay() {
		return Promise.resolve(getDisplay('host.docker.internal'));
	}
}
