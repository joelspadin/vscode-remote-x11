import * as vscode from 'vscode';

export class Logger {
    private channel: vscode.OutputChannel;

    constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
    }

    public log(message: unknown, end = '\n'): void {
        this.channel.append(`${message}${end}`);
    }
}
