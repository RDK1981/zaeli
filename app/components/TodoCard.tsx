/**
 * TodoCard — shared component used in:
 *   • Home screen  (Today's Focus section)
 *   • More → To-Do screen
 *
 * Matches HTML .todo-item design exactly:
 *   [coloured left bar] [checkbox] [title + due label] [priority pill]
 *
 * Ticking the checkbox updates todos.status in Supabase instantly.
 */
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export type Todo = {
  id: string;
  title: string;
  priority: 'high' | 'med' | 'normal' | 'low';
  status: 'active' | 'done';
  due_label?: string;   // e.g. "Due today", "This week", "Today"
};

type Props = {
  todo: Todo;
  onToggle?: (id: string, newStatus: 'active' | 'done') => void;
};

// Priority → colours
const PRIORITY_COLOUR: Record<string, string> = {
  high:   '#E0007C',   // magenta  — urgent
  med:    '#FF8C00',   // orange   — today
  normal: '#FF8C00',   // orange   — soon
  low:    'rgba(0,0,0,0.18)',
};

const PRIORITY_LABEL: Record<string, string> = {
  high:   'urgent',
  med:    'today',
  normal: 'soon',
  low:    '',
};

const PRIORITY_BG: Record<string, string> = {
  high:   'rgba(224,0,124,0.10)',
  med:    'rgba(255,140,0,0.10)',
  normal: 'rgba(255,140,0,0.10)',   // orange tint
  low:    'transparent',
};

const PRIORITY_TEXT: Record<string, string> = {
  high:   '#E0007C',
  med:    '#FF8C00',
  normal: '#FF8C00',   // orange
  low:    'rgba(0,0,0,0.3)',
};

export default function TodoCard({ todo, onToggle }: Props) {
  const done     = todo.status === 'done';
  const colour   = PRIORITY_COLOUR[todo.priority] || PRIORITY_COLOUR.normal;
  const pillLabel = PRIORITY_LABEL[todo.priority] || '';
  const scale    = useRef(new Animated.Value(1)).current;

  const handleToggle = async () => {
    const newStatus = done ? 'active' : 'done';

    // Bounce animation
    Animated.sequence([
      Animated.timing(scale, { toValue:0.95, duration:80,  useNativeDriver:true }),
      Animated.timing(scale, { toValue:1,    duration:120, useNativeDriver:true }),
    ]).start();

    // Optimistic callback first (instant UI)
    onToggle?.(todo.id, newStatus);

    // Then sync to Supabase
    await supabase
      .from('todos')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', todo.id);
  };

  return (
    <Animated.View style={[tc.wrap, done && tc.wrapDone, { transform:[{ scale }] }]}>
      {/* Left colour bar */}
      <View style={[tc.bar, { backgroundColor: done ? 'rgba(0,0,0,0.12)' : colour }]} />

      {/* Checkbox */}
      <TouchableOpacity style={[tc.chk, done && tc.chkDone]} onPress={handleToggle} activeOpacity={0.7}>
        {done && <Text style={tc.tick}>✓</Text>}
      </TouchableOpacity>

      {/* Body */}
      <View style={tc.body}>
        <Text
          style={[tc.title, done && tc.titleDone]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        {todo.due_label ? (
          <Text style={tc.due}>{todo.due_label}</Text>
        ) : null}
      </View>

      {/* Priority pill */}
      {pillLabel ? (
        <View style={[tc.pill, { backgroundColor: done ? 'rgba(0,0,0,0.05)' : PRIORITY_BG[todo.priority] }]}>
          <Text style={[tc.pillTxt, { color: done ? 'rgba(0,0,0,0.3)' : PRIORITY_TEXT[todo.priority] }]}>
            {done ? 'done' : pillLabel}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const tc = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.07)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',          // clips the left bar to rounded corners
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width:0, height:2 },
    elevation: 1,
  },
  wrapDone: {
    opacity: 0.5,
  },

  // Coloured left accent bar — 4px wide, full height
  bar: {
    width: 4,
    alignSelf: 'stretch',        // fills full card height
  },

  // Checkbox — 22×22 rounded square, matches HTML .todo-chk
  chk: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.18)',
    marginLeft: 14,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chkDone: {
    backgroundColor: '#FFE500',
    borderColor: '#FFE500',
  },
  tick: {
    fontSize: 12,
    color: '#0A0A0A',
    fontFamily: 'Poppins_700Bold',
    lineHeight: 14,
  },

  // Text body
  body: {
    flex: 1,
    paddingVertical: 13,
    paddingLeft: 10,
    paddingRight: 4,
  },
  title: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#0A0A0A',
    lineHeight: 20,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(0,0,0,0.4)',
  },
  due: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(0,0,0,0.35)',
    marginTop: 2,
  },

  // Priority pill
  pill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginRight: 14,
    flexShrink: 0,
  },
  pillTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    fontWeight: '700',
  },
});