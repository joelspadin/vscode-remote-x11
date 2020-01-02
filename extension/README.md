# Remote X11

When [working in a remote environment](https://code.visualstudio.com/docs/remote/remote-overview),
this extension sets the `DISPLAY` environment variable so that X windows
applications started from Visual Studio Code appear on the local machine.

You must be running an X server on the local machine. For Windows, this extension
has only been tested with [VcXsrv](https://sourceforge.net/projects/vcxsrv/),
but other servers such as [Cygwin/X](https://x.cygwin.com/), [Xming](http://www.straightrunning.com/XmingNotes/),
and [X410](https://token2shell.com/x410/) should also work.

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
with the `remoteX11.SSH.privateKey` setting.

## Extension Settings

* `remoteX11.display` - Display number to connect to. Change this if your X server
	is using a display other than 0.
* `remoteX11.screen` - Screen number to connect to.
* `remoteX11.container.enable` - Set `DISPLAY` for containers?
* `remoteX11.SSH.enable` - Enable X11 forwarding and set `DISPLAY` for SSH targets?
* `remoteX11.SSH.privateKey` - Absolute path to your SSH private key file.
* `remoteX11.WSL.enable` - Set `DISPLAY` for WSL targets?
