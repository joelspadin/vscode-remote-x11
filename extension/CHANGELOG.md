# Change Log

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