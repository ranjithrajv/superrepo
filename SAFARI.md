# Safari support

SuperRepo is a standard WebExtension. Safari support is delivered as a native
companion app generated from the same `dist/chrome` bundle, using Apple's
`safari-web-extension-converter`. The one project builds for **macOS** and for
**iOS / iPadOS**.

## Build it (on a Mac)

```sh
npm run build
npm run safari
```

The second command prints the `xcrun` invocation when Xcode is not available, and
runs it when it is. It writes the Xcode project into `safari/SuperRepo.xcodeproj`.

## Run it

Open `safari/SuperRepo.xcodeproj` in Xcode, pick a scheme, and run.

**macOS** — the `SuperRepo` scheme. The companion app then enables the extension in
Safari → Settings → Extensions.

**iOS / iPadOS** — build and run the iOS app, then enable the extension in
Settings → Safari → Extensions. If the converted project has no iOS target, Apple's
packager adds one to the existing project:

```sh
xcrun safari-web-extension-packager --rebuild-project safari/SuperRepo.xcodeproj
```

One App Store submission covers both platforms.

## Notes

- Safari does not load unpacked Manifest V3 extensions from a folder, so the
  companion app is required for distribution on both macOS and iOS, even for local
  development.
- The extension core is unchanged: `dist/safari` is just `dist/chrome` repackaged.
- On iOS, and on GitHub's mobile layout generally, there is no stable repo header to
  anchor to, so the cluster renders in its floating bottom-right placement.
- Host permissions work the same way — Safari prompts for github.com (and gitlab.com
  when enabled) the first time the page is loaded.
