import React, { useRef } from 'react';
import {
    Animated, PanResponder, StyleSheet, Text,
    TouchableOpacity, View, ViewStyle,
} from 'react-native';

interface SwipeToDeleteProps {
  onDelete: () => void;
  accentColour?: string;    // Colour of the delete reveal (defaults to red)
  deleteLabel?: string;     // Label shown on reveal (defaults to 'Delete')
  deleteEmoji?: string;     // Emoji on the reveal (defaults to 🗑️)
  children: React.ReactNode;
  style?: ViewStyle;
  enabled?: boolean;        // Can be disabled per-item
}

const SWIPE_THRESHOLD = 80;   // px to reveal action
const DELETE_THRESHOLD = 160; // px to auto-confirm delete
const DELETE_RED = '#FF3B3B';

export function SwipeToDelete({
  onDelete,
  accentColour = DELETE_RED,
  deleteLabel = 'Delete',
  deleteEmoji = '🗑️',
  children,
  style,
  enabled = true,
}: SwipeToDeleteProps) {
  const translateX   = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const isDeleting   = useRef(false);
  const rowHeight    = useRef(new Animated.Value(1)).current;  // used for collapse on delete
  const rowOpacity   = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        enabled && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        if (!enabled) return;
        // Only allow left swipe (negative dx)
        const x = Math.min(0, g.dx);
        translateX.setValue(x);
        // Fade in the delete action as we reveal it
        const progress = Math.min(1, Math.abs(x) / SWIPE_THRESHOLD);
        deleteOpacity.setValue(progress);
      },
      onPanResponderRelease: (_, g) => {
        if (!enabled) return;
        const x = g.dx;

        if (x < -DELETE_THRESHOLD && !isDeleting.current) {
          // Swiped far enough — confirm delete
          confirmDelete();
        } else if (x < -SWIPE_THRESHOLD) {
          // Partial reveal — snap to reveal state
          Animated.spring(translateX, {
            toValue: -SWIPE_THRESHOLD,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();
        } else {
          // Not far enough — spring back
          snapBack();
        }
      },
    })
  ).current;

  const snapBack = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
    Animated.timing(deleteOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const confirmDelete = () => {
    if (isDeleting.current) return;
    isDeleting.current = true;

    Animated.timing(translateX, {
      toValue: -400,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDelete());
    }, 180);
  };

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  const revealWidth = translateX.interpolate({
    inputRange: [-DELETE_THRESHOLD, -SWIPE_THRESHOLD, 0],
    outputRange: [DELETE_THRESHOLD, SWIPE_THRESHOLD, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[
      st.container,
      style,
      { overflow: 'hidden', opacity: rowOpacity },
    ]}>
      {/* Delete reveal — sits behind the row */}
      <View style={[st.deleteReveal, { backgroundColor: accentColour }]}>
        <TouchableOpacity style={st.deleteBtn} onPress={confirmDelete}>
          <Text style={st.deleteEmoji}>{deleteEmoji}</Text>
          <Text style={st.deleteLabel}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* The actual row — slides left */}
      <Animated.View
        style={[st.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteReveal: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: '100%',
    gap: 3,
  },
  deleteEmoji: {
    fontSize: 20,
  },
  deleteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },
  row: {
    backgroundColor: 'transparent',
  },
});