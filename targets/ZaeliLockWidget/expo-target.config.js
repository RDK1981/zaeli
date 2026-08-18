/**
 * @bacons/apple-targets config for the Zaeli Lock Screen widget.
 *
 * This is Build 61 — first native iOS widget target for the project.
 * Kept intentionally minimal:
 *   - Static content only (no data pipeline, no App Group needed yet)
 *   - Lock Screen circular family only (iOS 16+)
 *   - Widget URL routes to the app root via the zaeli:// custom scheme
 *
 * The @bacons/apple-targets plugin discovers this folder during
 * `expo prebuild` (which EAS runs before every iOS build) and:
 *   1. Creates a new WidgetKit extension target in the Xcode project
 *   2. Assigns it the bundleIdentifier below (parent + .widget suffix)
 *   3. Compiles the Swift files that sit alongside this config
 *   4. Wires the Info.plist as the extension bundle's info.plist
 *
 * If we later want to display live data (today's events, next reminder),
 * we add `appleTeamId` + `entitlements` here with an App Group so the
 * widget can read from Shared UserDefaults written by the RN app.
 */

/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/images/icon.png',
  // Widget uses the parent app's team + a bundleId that MUST start with
  // the parent app's bundle ID. Convention: parent + '.widget'.
  // The plugin auto-derives from the parent app config so we don't
  // hardcode the team ID here.
  deploymentTarget: '16.1',
  // No entitlements block yet — no App Group needed for a static widget.
  // Add later when we wire a data pipeline for widgets #4 / #1 / #2.
};
