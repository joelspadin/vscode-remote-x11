import * as fs from 'fs';
import { getConfig, getDisplay } from './config';
import { getLogger } from './logger';
import { RemoteHandler } from './RemoteHandler';

const CONFIG_FILE = '/etc/resolv.conf';

export class WslHandler extends RemoteHandler {
    public get enabled(): boolean {
        return getConfig('WSL.enable', true);
    }

    public get displaySettings(): string[] {
        return ['remoteX11.WSL.enable', 'remoteX11.display', 'remoteX11.screen'];
    }

    public async getDisplay(): Promise<string> {
        return getDisplay(await this.getHost());
    }

    private async getHost() {
        if (await this.isWsl2()) {
            getLogger().log('Detected WSL 2');
            const configFile = await fs.promises.readFile(CONFIG_FILE, { encoding: 'utf-8' });
            return this.getNameServer(configFile);
        } else {
            getLogger().log('Detected WSL 1');
            return 'localhost';
        }
    }

    private async isWsl2() {
        // https://github.com/microsoft/WSL/issues/4555#issuecomment-609908080
        try {
            await fs.promises.access('/run/WSL');
            return true;
        } catch (ex) {
            return false;
        }
    }

    private getNameServer(text: string) {
        for (const line of text.split('\n')) {
            const match = line.match(/^nameserver\s+(.+)\s*/);
            if (match) {
                return match[1];
            }
        }

        throw new Error(`Could not find nameserver in ${CONFIG_FILE}`);
    }
}
