import { getConfig, getDisplay } from './config';
import { RemoteHandler } from './RemoteHandler';

export class ContainerHandler extends RemoteHandler {
    public get enabled(): boolean {
        return getConfig('container.enable', true);
    }

    public get displaySettings(): string[] {
        return ['remoteX11.container.enable', 'remoteX11.display', 'remoteX11.screen'];
    }

    public getDisplay(): Promise<string> {
        return Promise.resolve(getDisplay('host.docker.internal'));
    }
}
