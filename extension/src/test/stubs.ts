import * as fs from 'fs';
import * as vscode from 'vscode';
import sinon = require('sinon');

export function stubConfig(config: Record<string, any>): sinon.SinonStub {
    return sinon
        .stub(vscode.workspace, 'getConfiguration')
        .withArgs('remoteX11')
        .returns(new StubConfiguration(config));
}

export function stubRemoteName(name: string | undefined): sinon.SinonStub {
    return sinon.stub(vscode.env, 'remoteName').get(() => name);
}

export class StubConfiguration implements vscode.WorkspaceConfiguration {
    constructor(private config: Record<string, any>) {}

    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    get(section: string, defaultValue?: unknown): unknown {
        return this.config[section] ?? defaultValue;
    }
    has(section: string): boolean {
        return section in this.config;
    }
    inspect(_section: string): undefined {
        throw new Error('Method not implemented.');
    }
    update(
        _section: string,
        _value: unknown,
        _configurationTarget?: boolean | vscode.ConfigurationTarget | undefined,
        _overrideInLanguage?: boolean | undefined,
    ): Thenable<void> {
        throw new Error('Method not implemented.');
    }
}

export function stubWslVersion(version: 1 | 2): sinon.SinonStub {
    const stub = sinon.stub(fs.promises, 'access').withArgs('/run/WSL');
    if (version === 1) {
        stub.rejects();
    } else {
        stub.resolves();
    }
    return stub;
}

/**
 * Stubs fs.promises.readFile to return given text.
 */
export function stubFile(
    path: string,
    options: { encoding?: string | null; flag?: string | number } | string | null | undefined,
    text: string,
): sinon.SinonStub {
    return sinon.stub(fs.promises, 'readFile').withArgs(path, options).resolves(text);
}
