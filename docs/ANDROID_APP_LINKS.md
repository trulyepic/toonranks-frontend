# Android App Links

Toon Ranks Android is live on Google Play under:

- Package name: `com.toonranks.mobile`
- Canonical website origin: `https://www.toonranks.com`

Android App Links let supported website URLs open the installed Android app directly. The mobile app
claims the canonical `www.toonranks.com` routes in its Android intent filters. The frontend serves
Google's Digital Asset Links file so Android can verify that Toon Ranks owns those links.

## Required Website File

The frontend must serve:

- `public/.well-known/assetlinks.json`

Current production package:

- Package name: `com.toonranks.mobile`
- Play App Signing SHA-256:
  `ED:D9:AE:7D:0A:9B:AF:DB:B2:1A:65:0E:53:A2:BE:4C:6B:DE:F4:6E:79:1F:65:B3:B2:16:E2:7E:50:16:34:B6`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.toonranks.mobile",
      "sha256_cert_fingerprints": [
        "ED:D9:AE:7D:0A:9B:AF:DB:B2:1A:65:0E:53:A2:BE:4C:6B:DE:F4:6E:79:1F:65:B3:B2:16:E2:7E:50:16:34:B6"
      ]
    }
  }
]
```

## SHA-256 Source

Use the Play App Signing certificate, not the local upload key or debug key.

Preferred Google Play Console path, when visible:

1. Open Toon Ranks.
2. Open **Setup** or **App integrity** if available in the left navigation.
3. Find **App signing key certificate**.
4. Copy the **SHA-256 certificate fingerprint**.

Fallback method used for the current fingerprint:

1. Install the production Toon Ranks app from Google Play on a real Android device.
2. Connect the device with USB debugging enabled.
3. Find the installed APK path:

   ```powershell
   adb shell pm path com.toonranks.mobile
   ```

4. Pull the base APK:

   ```powershell
   adb pull <base.apk path> toonranks-play-base.apk
   ```

5. Print the signing certificate:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs .\toonranks-play-base.apk
   ```

6. Convert the SHA-256 digest to colon-separated uppercase form before placing it in
   `assetlinks.json`.

## Deployment Check

After this frontend branch is deployed, confirm:

- `https://www.toonranks.com/.well-known/assetlinks.json` returns JSON.
- The response is not the app shell HTML.
- The file contains `com.toonranks.mobile`.
- The file contains the Play App Signing SHA-256 fingerprint.

## Real Device Verification

After the frontend file is live and a new Android build containing the intent filters is installed,
tap these links from a real Android phone:

- `https://www.toonranks.com/series/1`
- `https://www.toonranks.com/forum/1`
- `https://www.toonranks.com/leaderboard`

Expected result: Android opens Toon Ranks directly instead of staying in the browser.

Expo Go cannot verify this behavior because Android App Links are native Android configuration.
