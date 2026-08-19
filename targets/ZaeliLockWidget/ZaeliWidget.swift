// ═══════════════════════════════════════════════════════════════════════
// ZaeliWidget.swift · Build 61 · First widget for the Zaeli app.
//
// A single Lock Screen circular widget that renders the Zaeli wordmark.
// Tap → opens the parent app via the zaeli:// URL scheme (already
// registered in app.json).
//
// DESIGN NOTES:
//
//   Lock Screen circular widgets on iOS render with system vibrancy —
//   colors are largely ignored, content ends up white/grey on a subtle
//   dark backdrop. That means the sky-blue `a` in our normal wordmark
//   won't show as sky-blue here (only in the app itself + on Home
//   Screen widgets later). Accept the constraint: on Lock Screen the
//   wordmark reads as monochrome white "za", which is still on-brand
//   as a familiar shape.
//
//   AccessoryWidgetBackground() gives us the subtle darkened backdrop
//   iOS uses for widget contrast on Lock Screens with a photo behind.
//   Without it the widget floats invisibly on some wallpapers.
//
//   Kept intentionally light on WidgetKit machinery:
//     - StaticConfiguration (no user config UI)
//     - TimelineProvider serves one entry with .never policy — content
//       never changes, no refresh needed
//     - widgetURL sends tap → root of the app; RN handles what to show
//       (currently just opens Home)
//
// FUTURE:
//   When we add widget #4 (Lock Screen inline text with today's events)
//   we'll extend this bundle with another Widget and share a data
//   source read from a Shared App Group UserDefaults. For now, static
//   is enough.
//
// ═══════════════════════════════════════════════════════════════════════

import WidgetKit
import SwiftUI

// MARK: - Timeline

struct ZaeliEntry: TimelineEntry {
  let date: Date
}

struct ZaeliProvider: TimelineProvider {
  func placeholder(in context: Context) -> ZaeliEntry {
    ZaeliEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (ZaeliEntry) -> Void) {
    completion(ZaeliEntry(date: Date()))
  }

  // Static widget — one entry, never refresh. iOS won't ask us again
  // until the user reboots or reinstalls the app.
  func getTimeline(in context: Context, completion: @escaping (Timeline<ZaeliEntry>) -> Void) {
    let timeline = Timeline(entries: [ZaeliEntry(date: Date())], policy: .never)
    completion(timeline)
  }
}

// MARK: - View

struct ZaeliLockView: View {
  var body: some View {
    ZStack {
      // Vibrant backdrop iOS renders as ~15% dark overlay on Lock Screen —
      // gives us visual contrast without competing with the user's
      // wallpaper. Available iOS 16+, matches deploymentTarget in
      // expo-target.config.js.
      AccessoryWidgetBackground()

      // Wordmark. Text with kerning approximates the Poppins-800
      // "za" shape used in the app wordmark. System bold rounded is
      // the closest system-native font to Poppins for widget contexts
      // (widgets can't easily embed custom fonts without extra work).
      Text("za")
        .font(.system(size: 22, weight: .heavy, design: .rounded))
        .kerning(-1.2)
        .foregroundColor(.primary)
    }
    // widgetURL — tap the widget → iOS opens this URL. Our RN app's
    // scheme is `zaeli`, registered in app.json. The bare scheme opens
    // the app to its root (Home). If we want deep-linking to Chat or
    // a specific sheet later, we add a path (e.g. zaeli://chat).
    .widgetURL(URL(string: "zaeli://"))
  }
}

// MARK: - Widget definition

struct ZaeliLockWidget: Widget {
  let kind: String = "ZaeliLockWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ZaeliProvider()) { _ in
      ZaeliLockView()
    }
    .configurationDisplayName("Zaeli")
    .description("Tap to open Zaeli.")
    .supportedFamilies([.accessoryCircular])
  }
}

// MARK: - Mic widget REMOVED (Build 73, Session 38)
//
// The mic widget (widgetURL "zaeli://chat?mic=1") consistently failed on
// WARM-start with the iOS error "Only one Recording object can be prepared
// at a given time." Root cause: expo-av's stopAndUnloadAsync + setIsEnabled
// Async(false) don't fully release iOS's underlying AVAudioRecorder after
// app backgrounding. Multiple JS-level fixes attempted (Builds 66-72,
// including nuclear audio system reset + retry-once) all failed the same
// way. A working fix would require ~5 seconds of retry delay (unacceptable
// UX for a "tap to talk" widget) OR native Swift changes to force-tear-down
// AVAudioSession.
//
// Rich's call: better to remove the mic widget entirely than ship it with
// broken warm-start behaviour. Users who added the mic widget to their
// Lock Screen will see a "no longer available" placeholder — safe to
// manually remove. The branded ZaeliLockWidget stays (works fine — just
// opens the app).
//
// Related dead code kept intact for future revival if we tackle the
// native-side fix:
//   * app/chat.tsx — redirect route for zaeli://chat?mic=1
//   * app/(tabs)/index.tsx — startRecording's audio session reset + retry
//   * lib/navigation-store.ts — persistWidgetChatIntent + poll
// All harmless with no widget calling them.

// MARK: - Bundle

// A WidgetBundle groups all widgets exposed by this extension. Adding
// more widgets later (Lock Screen inline text, Home Screen mic, Home
// medium) means adding them to `body` here alongside the existing ones.
@main
struct ZaeliWidgetBundle: WidgetBundle {
  var body: some Widget {
    ZaeliLockWidget()
  }
}
