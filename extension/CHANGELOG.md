# Change Log

See the [Remote X11 (SSH) Changelog](https://github.com/ChaosinaCan/vscode-remote-x11/blob/master/ssh/CHANGELOG.md#change-log)
for full changes to the SSH extension. Only new features and notable fixes are listed below.

## Unreleased

- Added support for WSL 2.
- Switched from modifying `process.env` to the new environment variable collection API.
- Changes to settings now apply without needing to reload the window.
- Added a `remoteX11.extraVariables` setting to add more environment variables for remote connections.
	- This defaults to `LIBGL_ALWAYS_INDIRECT=1`. You can delete this from your settings if that isn't needed.

## 1.3.4

- Strip the scope ID off IPv6 addresses from the `SSH_CONNECTION` variable to fix
	errors when connecting to certain SSH servers.

## 1.3.3

- Improved documentation.
- Fixed a timeout function that never actually timed out.

## 1.3.2

- SSH extension changes:
	- Added a `remoteX11.SSH.verboseLogging` setting to log more information about the SSH connection to the output panel.

## 1.3.0

- Errors when setting up `DISPLAY` are now shown in a notification as well as the logs.
- SSH extension changes:
	- Added support for authentication using ssh-agent. This supports passphrase-protected keys.

## 1.2.0

- Improved setting descriptions.
- Added settings to override the host and port used for SSH connections.
- Moved the `remoteX11.SSH.displayCommand` setting to the main extension.
	You can now set a different command in each remote machine's settings.

## 1.1.0

- Improved logging output.
- SSH extension changes:
	- All output from the SSH shell is now logged for easier troubleshooting.
	- Changed the default command to print `DISPLAY` to run through Bash in case the user's shell is different.
	- Added a setting to change the command to print `DISPLAY`.
	- Added a setting to control the timeout while waiting for `DISPLAY` to be printed.

## 1.0.0

- Initial release