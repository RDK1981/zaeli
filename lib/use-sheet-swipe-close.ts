/**
 * lib/use-sheet-swipe-close.ts — Round B commit 5
 *
 * Adds swipe-down-to-close on 92% bottom sheets (Reminders, Shopping,
 * Calendar, Meals). RN's Modal isn't natively draggable, but our sheets
 * are actually a View-inside-Modal at bottom-of-screen — we can translate
 * that inner card via PanResponder + Animated.Value.
 *
 * Attach the returned `handleGrabProps` to the sheet's drag handle
 * (the small grey pill at the top). Wrap the sheet card in
 * <Animated.View style={[cardStyle, animatedStyle]}>. On visible=false
 * transition the translate resets so re-open animates from bottom
 * cleanly.
 *
 * Only the handle is draggable — not the whole card — to avoid
 * conflicts with scroll views inside the sheet body.
 *
 * Threshold: 100px OR fast downward velocity closes. Below that,
 * springs back to 0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

export interface SwipeDownHandlers {
  /** Spread onto the sheet's DRAG HANDLE view (the small grey pill at top). */
  handleGrabProps: any;
  /** Spread onto the sheet CARD (the bottom View that contains the content). */
  animatedStyle: any;
}

const CLOSE_THRESHOLD_PX = 100;
const CLOSE_VELOCITY = 0.6;

export function useSheetSwipeClose(visible: boolean, onClose: () => void): SwipeDownHandlers {
  const translateY = useRef(new Animated.Value(0)).current;

  // Reset when sheet becomes visible/hidden so re-open animates from bottom
  // cleanly (RN's Modal slide handles the entry; our translate is 0 by then).
  useEffect(() => {
    translateY.setValue(0);
  }, [visible, translateY]);

  const panHandlers = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      // Only allow downward drag; upward = clamp at 0 (no bounce)
      const y = Math.max(0, g.dy);
      translateY.setValue(y);
    },
    onPanResponderRelease: (_, g) => {
      const shouldClose = g.dy > CLOSE_THRESHOLD_PX || g.vy > CLOSE_VELOCITY;
      if (shouldClose) {
        // Slide down off-screen then invoke onClose. The Modal itself
        // handles the actual dismiss animation once onClose fires; this
        // just gives a natural fling-out feel.
        Animated.timing(translateY, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }).start(() => { onClose(); });
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 3,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
      }).start();
    },
  }).panHandlers, [translateY, onClose]);

  return {
    handleGrabProps: panHandlers,
    animatedStyle: { transform: [{ translateY }] },
  };
}
