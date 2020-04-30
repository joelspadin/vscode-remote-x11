# Change Log

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