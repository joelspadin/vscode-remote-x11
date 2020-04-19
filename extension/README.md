# Remote X11

When [working in a remote environment](https://code.visualstudio.com/docs/remote/remote-overview),
this extension sets the `DISPLAY` environment variable so that X windows
applications started from Visual Studio Code appear on the local machine.

For this extension to work, it must be installed on the remote machine, and you
must be running an X server on the local machine. For SSH connections, the
[Remote X11 (SSH)](https://marketplace.visualstudio.com/items?itemName=spadin.remote-x11-ssh)
extension must also be installed on the local machine (this should be installed
automatically when you install this extension).

For Windows, this extension has only been tested with [VcXsrv](https://sourceforge.net/projects/vcxsrv/),
but other servers such as [Cygwin/X](https://x.cygwin.com/), [Xming](http://www.straightrunning.com/XmingNotes/),
and [X410](https://token2shell.com/x410/) should also work.

For SSH connections, if the remote machine does not have Bash installed, you
must change the `remoteX11.SSH.displayCommand` setting (see below) and provide
a command that prints the value of the `DISPLAY` variable.

## Access Control

For containers, you will need to either [authorize the container](https://en.wikipedia.org/wiki/X_Window_authorization)
with your X server or disable access control.

For SSH and WSL targets, connections to the X server will come from the local
machine, so you should not need to configure anything for these to work.

## X11 Forwarding

The [Remote - SSH](https://code.visualstudio.com/docs/remote/ssh) extension does
not currently enable X11 forwarding ([see issue #267](https://github.com/microsoft/vscode-remote-release/issues/267)).
To work around this, the [Remote X11 (SSH)](https://marketplace.visualstudio.com/items?itemName=spadin.remote-x11-ssh)
extension creates an SSH connection to the remote machine with forwarding
enabled in the background.

**This extension currently only supports public key authentication.** By default,
your private key file is assumed to be `~/.ssh/id_rsa`, but this can be changed
with the `remoteX11.SSH.privateKey` setting. Keys with passphrases are currently
not supported.

## Extension Settings

* `remoteX11.display` - Display number to connect to. Change this if your X server
	is using a display other than 0.
* `remoteX11.screen` - Screen number to connect to.
* `remoteX11.container.enable` - Set `DISPLAY` for containers?
* `remoteX11.SSH.enable` - Enable X11 forwarding and set `DISPLAY` for SSH targets?
* `remoteX11.SSH.privateKey` - Absolute path to your SSH private key file.
* `remoteX11.SSH.displayCommand` - Override the command used to get the `DISPLAY` variable. Use either of:
	* A command which prints `DISPLAY=<DISPLAY>` followed by a newline, where `<DISPLAY>` is the
		value of the `DISPLAY` variable. Note that there must not be any spaces in this text.
	* A dictionary where keys are hostnames and values are the command to run when connected to that host.
		Note that the hostname used by this extension may not match the one you provided to VS Code.
		Check the logs for "Remote X11" in the Output pane (Ctrl+Shift+U) to get the correct hostname.
* `remoteX11.SSH.timeout` - Number of seconds to wait for the SSH shell to respond to the above command.
	Use `0` to wait forever.
* `remoteX11.WSL.enable` - Set `DISPLAY` for WSL targets?

## Troubleshooting

### Is the extension installed?

When in a remote workspace, open the Extensions view (Ctrl+X) and check that
"Remote X11" is installed and enabled on the remote machine. If you are using an
SSH connection, also check that "Remote X11 (SSH)" is installed and enabled on
the local machine.

### Check the logs for errors

When in a remote workspace, open the Output pane (Ctrl+Shift+U) and use the
drop-down list in the upper-right to check the logs from "Remote X11". If
everything is working correctly, the logs should show something similar to:

```
Setting up display for remote "ssh-remote".
Connecting to SSH user@host port 22
DISPLAY = localhost:11.0
```

If you are using SSH and don't see `DISPLAY = ...` in the logs, check the logs
from "Remote X11 (SSH)" for errors as well. Near the end of the logs should be
a command to print out the `DISPLAY` variable. If this command is failing, try
changing it with the `removeX11.SSH.displayCommand` setting in your user (not
remote) settings.

If you get any other errors and you can't figure out the cause, create an issue
at https://github.com/ChaosinaCan/vscode-remote-x11/issues and post your logs
and I'll try to help.

### Is your X server running?

If you see `DISPLAY = ...` in the Remote X11 logs but nothing shows up when you
run a GUI application, make sure your X server is running on your local machine.
