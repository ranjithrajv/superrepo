# Safari support

SuperRepo is a standard WebExtension. Safari support is delivered as a native macOS
wrapper generated from the same `dist/chrome` bundle, using Apple's
`safari-web-extension-converter`.

## Build it (on a Mac)

```sh
npm run build
npm run safari
```

The second command prints the `xcrun` invocation when Xcode is not available, and
runs it when it is. It writes the Xcode project into `safari/SuperRepo.xcodeproj`.

## Run it

Open `safari/SuperRepo.xcodeproj` in Xcode, pick the `SuperRepo` scheme, and run.
The companion app enables the extension in Safari's settings under Extensions.

## Notes

- Safari does not load unpacked Manifest V3 extensions from a folder, so this
  companion app is required for distribution even for local development.
- The extension core is unchanged: `dist/safari` is just `dist/chrome` repackaged.
- Host permissions work the same way — Safari will prompt for github.com (and
  gitlab.com when enabled) the first time the page is loaded.
