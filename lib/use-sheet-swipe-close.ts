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
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

export interface SwipeDownHandlers {
  /** Attach to <GestureDetector gesture={...}> around the drag handle */
  panGesture: ReturnType<typeof Gesture.Pan>;
  /** Spread on the sheet card (Animated.View) */
  animatedStyle: any;
}

const CLOSE_THRESHOLD_PX = 100;
const CLOSE_VELOCITY = 800;   // gesture-handler uses px/s (much larger than PanResponder)

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
          // Fire onClose immediately — Modal's native slide animation handles the
          // visual close from wherever the card is. No fight between our animation
          // and Modal's animation.
          runOnJS(onClose)();
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

  return { panGesture, animatedStyle };
}
