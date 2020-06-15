# Change Log

## 1.4.0

- The SSH connection can now be restarted with new settings without reloading VS Code.

## 1.3.3

- Fixed a timeout function that never actually timed out.
- Moved several SSH settings back to this extension, since it does see remote settings.

## 1.3.2

- Added a `remoteX11.SSH.verboseLogging` setting to log more information about the SSH connection to the output panel.

## 1.3.1

- Fixed possible "DISPLAY variable is missing" errors when SSH servers send data in small chunks.

## 1.3.0

- Added support for authentication using ssh-agent. This supports passphrase-protected keys.

## 1.2.0

- Improved setting descriptions.
- Moved the `remoteX11.SSH.displayCommand` setting to the main extension.

## 1.1.0

- All output from the SSH shell is now logged for easier troubleshooting.
- Changed the default command to print `DISPLAY` to run through Bash in case the user's shell is different.
- Added a setting to change the command to print `DISPLAY`.
- Added a setting to control the timeout while waiting for `DISPLAY` to be printed.

## 1.0.1

- Fixed rejected X11 connections.

## 1.0.0

- Initial release