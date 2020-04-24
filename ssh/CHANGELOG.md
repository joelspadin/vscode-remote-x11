# Change Log

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