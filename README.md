**This extension is deprecated.** [WSL now natively supports graphical applications](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps). For SSH, please use the X11 support built into the official remote SSH extension. [See this issue](https://github.com/microsoft/vscode-remote-release/issues/4600) for discussions on setting it up.

# Remote X11 Extension for Visual Studio Code

Remote X11 is a Visual Studio Code extension that sets the `DISPLAY` environment
variable when working in a remote environment so that X windows applications
started from Visual Studio Code appear on the local machine.

The `extension` folder contains the main extension. See its [README](extension/README.md)
for more details.

The `ssh` folder contains a helper extension that lets the main extension work
when connected to a remote machine via SSH.
