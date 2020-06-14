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
must change the `remoteX11.SSH.displayCommand` setting and provide a command
that prints the value of the `DISPLAY` variable. If you are using port
forwarding, you may also need to change the `remoteX11.SSH.port` setting. See
below for more details.

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

**This extension currently only supports public key authentication.** See below
for more details on authentication settings.

## Extension Settings

You must reload the window (F1 > Developer: Reload Window) for setting changes
to apply.

* `remoteX11.display` - Display number to connect to. Change this if your X server
	is using a display other than 0.
* `remoteX11.screen` - Screen number to connect to.
* `remoteX11.container.enable` - Set `DISPLAY` for containers?
* `remoteX11.SSH.enable` - Enable X11 forwarding and set `DISPLAY` for SSH targets?
* `remoteX11.SSH.authenticationMethod`:
	* `keyFile` - Authenticate with the private key file specified by `remoteX11.SSH.privateKey`.
		Passphrase-protected keys are not supported.
	* `agent` - Use `ssh-agent` to get keys. This method does support passphrase-protected keys.
* `remoteX11.SSH.agent` - Name of a Unix socket or Windows named pipe for ssh-agent.
	Set to `pageant` to use Pageant on Windows. If left empty, defaults to Windows 10's OpenSSH
	agent (`\\.\pipe\openssh-ssh-agent`) or the `SSH_AUTH_SOCK` environment variable on other platforms.
	Only used if `remoteX11.SSH.authenticationMethod` is `agent`.
* `remoteX11.SSH.privateKey` - Absolute path to your SSH private key file.
	Only used if `remoteX11.SSH.authenticationMethod` is `publicKey`.
* `remoteX11.SSH.displayCommand` - A command which prints `DISPLAY=<DISPLAY>` followed by a newline,
	where `<DISPLAY>` is the value of the `DISPLAY` variable. Note that there must not be any spaces
	in this text. Change this when connecting to a machine that doesn't support the default command.
* `remoteX11.SSH.timeout` - Number of seconds to wait for the SSH shell to respond to the above command.
	Use `0` to wait forever.
* `remoteX11.SSH.host` - Sets the hostname or IP address used to connect to the SSH server.
	Use this if Remote X11 tries to connect to the wrong address.
* `remoteX11.SSH.port` - Sets the port used to connect to the SSH server. Use this if
	Remote X11 tries to connect to the wrong port.
* `remoteX11.WSL.enable` - Set `DISPLAY` for WSL targets?

### Authentication Settings

Remote X11 currently only supports public key authentication. You must use
`ssh-keygen` to generate a public/private key pair and add your public key to
your server's `~/.ssh/authorized_keys` file.

There are two ways RemoteX11 can be configured to get keys:

#### Private Key File

If the `remoteX11.SSH.authenticationMethod` setting is `keyFile`, Remote X11 will
read the file given by the `remoteX11.SSH.privateKey` file as your private key.
This defaults to `~/.ssh/id_rsa`, so you must change it if your file is named
differently.

**This method does not support passphrase-protected private keys!** See below
for methods that do.

#### SSH Agent

If the `remoteX11.SSH.authenticationMethod` setting is `agent`, Remote X11 will
use `ssh-agent` to read keys added with `ssh-add`.
[See the VS Code documentation](https://code.visualstudio.com/docs/remote/troubleshooting#_setting-up-the-ssh-agent) for instructions on enabling the SSH Agent.

To add your key to the SSH agent, open a terminal on the **local** machine and run:

```sh
ssh-add <path/to/private/key>
```

If your key is passphrase-protected, you will be prompted to enter the passphrase.
You can then log in without re-entering the passphrase.

You can also use [Pageant](https://winscp.net/eng/docs/ui_pageant) on Windows by
changing the `remoteX11.SSH.agent` setting to `pageant`.

## Troubleshooting

### Is the extension installed?

When in a remote workspace, open the Extensions view (Ctrl+X) and check that
"Remote X11" is installed and enabled on the remote machine. If you are using an
SSH connection, also check that "Remote X11 (SSH)" is installed and enabled on
the local machine.

### Check the logs

When in a remote workspace, open the Output pane (Ctrl+Shift+U) and use the
drop-down list in the upper-right to check the logs from "Remote X11". If
everything is working correctly, the logs should show something similar to:

```
Setting up display for remote "ssh-remote".
Connecting to SSH user@address port 22
DISPLAY = localhost:11.0
```

If not, the error message may help you figure out the problem. Solutions to some
common errrors are listed below.

### Are the SSH address and port correct?

By default, Remote X11 uses the `SSH_CONNECTION` variable to determine the
address and port to the SSH server. This may be incorrect if you are using
features such as port forwarding.

Check the logs for the "connecting to SSH ..." message and check that the
address and port are correct. If not, fix them with the the `remoteX11.SSH.host`
and/or `remoteX11.SSH.port` settings. Note that these settings must be set on
the remote machine, so open a remote workspace and use the **Remote** tab of
settings to change them.

### Is your X server running?

If you see `DISPLAY = ...` in the Remote X11 logs but nothing shows up when you
run a GUI application, make sure your X server is running on your local machine.

Also make sure the `remoteX11.display` setting matches the display number your
X server is set to use.

### Is SSH able to find the display?

If you are using SSH and don't see `DISPLAY = ...` in the logs, check the logs
from "Remote X11 (SSH)" for errors as well. Near the end of the logs should be
a command to print out the `DISPLAY` variable. If this command is failing, try
changing it with the `remoteX11.SSH.displayCommand` setting in your user (not
remote) settings.

### Cannot parse privateKey: Encrypted OpenSSH private key detected, but no passphrase given

Passphrase-protected keys are not supported with the default authentication
method. You must use an SSH Agent instead. See **Authentication Settings** above
for more details.

### All configured authentication methods failed

Check your authentication settings. This usually means that either your public
key is not in the remote server's `authorized_keys` file, or you haven't added
your private key to your SSH agent. See **Authentication Settings** above for
more details.

### ENOENT: \\.\pipe\openssh-ssh-agent

Windows' SSH Agent is probably not running. From the Start menu, open "Services"
and make sure the OpenSSH Authentigation Agent service is running.

### Other issues

If you get any other errors and you can't figure out the cause, create an issue
at https://github.com/ChaosinaCan/vscode-remote-x11/issues and post your logs
and I'll try to help.

If you are using SSH, please enable the `remoteX11.SSH.verboseLogging` setting
to log technical details about the SSH connection to the "Remote X11 (SSH)" logs,
and include those in your issue report. This is useful for finding issues such
as the server not supporting the algorithm used by your private key.
