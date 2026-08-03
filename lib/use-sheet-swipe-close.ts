/**
 * lib/use-sheet-swipe-close.ts — Round B commit 11 rewrite
 *
 * Uses react-native-gesture-handler's Gesture.Pan() (the modern Gesture API)
 * instead of RN's PanResponder. The rewrite was forced by Rich reporting
 * that PanResponder-based swipe-down didn't fire at all inside iOS Modal —
 * known-fragile combo where native modal presentation swallows JS-side
 * pan events.
 *
 * Gesture.Pan() uses native gesture recognisers that route cleanly through
 * Modal boundaries. Reliable in every sheet-in-modal scenario.
 *
 * The hook returns `panGesture` (composable Gesture) + `animatedStyle`
 * (translateY transform). Wrap the sheet card in Animated.View with the
 * style; wrap the drag handle View in GestureDetector with the gesture.
 *
 * ⚠ Root layout must have <GestureHandlerRootView style={{flex:1}}> at
 *   the very top of the tree for gestures to work. Expo Router usually
 *   wires this automatically via expo-router setup.
 */

import { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';

export interface SwipeDownHandlers {
  /** Attach to <GestureDetector gesture={...}> around the drag handle */
  panGesture: ReturnType<typeof Gesture.Pan>;
  /** Spread on the sheet card (Animated.View) */
  animatedStyle: any;
  /** Spread on the absolute-positioned backdrop (ReAnimated.View). Opacity
   *  tracks translateY so the backdrop fades cleanly as the sheet slides
   *  off — eliminates the "see-through black splash" that appeared when
   *  Modal dismissed a translated-away sheet with a fully opaque backdrop. */
  backdropStyle: any;
}

const CLOSE_THRESHOLD_PX = 100;
const CLOSE_VELOCITY = 800;   // gesture-handler uses px/s (much larger than PanResponder)
const SCREEN_H = Dimensions.get('window').height;
// How far to translate down before firing onClose. Slightly more than screen
// height so even the tallest sheet is fully off-screen before Modal unmounts.
const OFFSCREEN_Y = SCREEN_H + 120;

export function useSheetSwipeClose(visible: boolean, onClose: () => void): SwipeDownHandlers {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onUpdate((e) => {
        // Only allow downward drag
        translateY.value = Math.max(0, e.translationY);
      })
      .onEnd((e) => {
        const shouldClose = e.translationY > CLOSE_THRESHOLD_PX || e.velocityY > CLOSE_VELOCITY;
        if (shouldClose) {
          // Round B commit 12 — animate sheet OFF-SCREEN first, THEN close Modal.
          // Previously we called runOnJS(onClose)() immediately at threshold —
          // that left the card at its drag position (say translateY=140) while
          // Modal did its own slide-down. Result: visible "flash" where the
          // sheet is briefly frozen mid-drag before the Modal fade completes.
          //
          // Now: animate translateY to OFFSCREEN_Y with a fast timing curve
          // (matches the drag momentum), THEN call onClose via completion cb.
          // By the time Modal unmounts, our sheet is already invisible below
          // the fold — no visible flash, one continuous downward motion.
          //
          // Duration scales with remaining distance so a slow gentle release
          // doesn't slam offscreen, and a fast flick doesn't drag out.
          const remaining = OFFSCREEN_Y - translateY.value;
          const velocity = Math.max(600, Math.abs(e.velocityY));
          const duration = Math.min(320, Math.max(140, Math.round((remaining / velocity) * 1000)));
          translateY.value = withTiming(
            OFFSCREEN_Y,
            { duration, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(onClose)();
            }
          );
        } else {
          // Not enough to close — spring back to top
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      })
      .activeOffsetY([-10, 10])  // only activate on vertical movement, not accidental horizontal
      .failOffsetX([-20, 20])    // fail if user drags horizontally more than 20px (helps kids not accidentally trigger)
  , [translateY, onClose]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Backdrop opacity fades as the sheet moves away — from 1 (fully open) at
  // translateY=0, down to 0 when translateY exceeds ~85% of the screen. Using
  // clamped extrapolation so slight overshoots on the spring-back don't briefly
  // flash opacity>1. During normal drag translateY hits maybe 150-300px, so
  // backdrop stays mostly opaque — the fade dominates only on close.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_H * 0.85],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return { panGesture, animatedStyle, backdropStyle };
}
