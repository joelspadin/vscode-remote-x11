import * as vscode from 'vscode';

export class Logger {
	private channel: vscode.OutputChannel;

	constructor(name: string) {
		this.channel = vscode.window.createOutputChannel(name);
	}

	public log(message: any, end = '\n') {
		this.channel.append(message.toString());
		this.channel.append(end);
	}
}
