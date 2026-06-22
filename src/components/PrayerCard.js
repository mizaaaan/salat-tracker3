import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';

/**
 * PrayerCard — redesigned, stunning
 *
 * Props:
 *   name        — 'Fajr' | 'Dhuhr' | ... | 'Sunrise'
 *   meta        — { icon, arabic, color }
 *   time        — formatted string, e.g. '4:23 AM'
 *   isCompleted — boolean
 *   isTrackable — boolean (Sunrise is display-only)
 *   onToggle    — () => void
 */
export default function PrayerCard({
  name, meta, time, isCompleted, isTrackable, onToggle,
}) {
  const { colors: Colors } = useTheme();

  // ── Animations ────────────────────────────────────────────────────────────
  const pressScale  = useRef(new Animated.Value(1)).current;
  const doneAnim    = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkScale  = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkOpacity= useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(doneAnim,     { toValue: isCompleted ? 1 : 0, tension: 80, friction: 8, useNativeDriver: false }),
      Animated.spring(checkScale,   { toValue: isCompleted ? 1 : 0, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: isCompleted ? 1 : 0, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [isCompleted]);

  const handlePress = () => {
    if (!isTrackable) return;
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(pressScale,  { toValue: 1,   tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  // Animated colours (useNativeDriver: false required for colour interpolation)
  const leftBarColor = doneAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [meta.color, Colors.primary],
  });
  const overlayOpacity = doneAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.10],
  });
  const timeColor = doneAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.textSecondary, Colors.primary],
  });
  const ringBorderColor = doneAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });
  const ringBg = doneAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(0,0,0,0)', Colors.primary],
  });

  return (
    <Animated.View style={[{ transform: [{ scale: pressScale }] }, !isTrackable && styles.sunriseWrap]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={isTrackable ? 1 : 1}
        style={[styles.card, { backgroundColor: Colors.card }]}
      >
        {/* ── Layer 1: subtle prayer-colour wash left→right ── */}
        <View style={[styles.wash, { backgroundColor: meta.color + '0D' }]} />

        {/* ── Layer 2: animated gold overlay on completion ── */}
        <Animated.View style={[
          styles.wash,
          { backgroundColor: Colors.primary, opacity: overlayOpacity },
        ]} />

        {/* ── Layer 3: left glow bar ── */}
        <Animated.View style={[
          styles.leftBar,
          {
            backgroundColor: leftBarColor,
            shadowColor:      meta.color,
          },
        ]} />

        {/* ── Content row ── */}
        <View style={styles.row}>

          {/* Icon with layered glow */}
          <View style={styles.iconGlowOuter}>
            <View style={[styles.iconGlowMid, { backgroundColor: meta.color + '18' }]}>
              <View style={[styles.iconInner, { backgroundColor: meta.color + '28', borderColor: meta.color + '35' }]}>
                <Text style={styles.iconEmoji}>{meta.icon}</Text>
              </View>
            </View>
          </View>

          {/* Name + Arabic */}
          <View style={styles.nameCol}>
            <Text style={[styles.name, { color: Colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.arabic, { color: meta.color }]}>
              {meta.arabic}
            </Text>
          </View>

          {/* Time + status */}
          <View style={styles.rightCol}>
            <Animated.Text style={[styles.time, { color: timeColor }]}>
              {time}
            </Animated.Text>

            {isTrackable ? (
              /* Animated ring → filled circle on completion */
              <Animated.View style={[
                styles.ring,
                {
                  borderColor:     ringBorderColor,
                  backgroundColor: ringBg,
                },
              ]}>
                <Animated.Text style={[
                  styles.checkmark,
                  {
                    transform: [{ scale: checkScale }],
                    opacity:    checkOpacity,
                    color:      Colors.background,
                  },
                ]}>
                  ✓
                </Animated.Text>
              </Animated.View>
            ) : (
              /* Sunrise: no checkbox, show a small "marker" dot */
              <View style={[styles.markerDot, { backgroundColor: meta.color + '50' }]} />
            )}
          </View>

        </View>

        {/* ── Bottom border line in prayer colour (very subtle) ── */}
        <View style={[styles.bottomLine, { backgroundColor: meta.color + '18' }]} />

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  sunriseWrap: { opacity: 0.52 },

  card: {
    borderRadius:  20,
    marginBottom:  10,
    overflow:      'hidden',
    // Card shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation:     5,
  },

  // Absolute fill layers (rendered before content, so they appear behind)
  wash: {
    ...StyleSheet.absoluteFillObject,
  },

  // Left glow bar
  leftBar: {
    position:      'absolute',
    left:          0,
    top:           10,
    bottom:        10,
    width:         4,
    borderRadius:  4,
    // Glow effect (iOS only; Android gets elevation from card)
    shadowOffset:  { width: 3, height: 0 },
    shadowOpacity: 0.70,
    shadowRadius:  8,
  },

  // Main content row
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingLeft:    22,   // room for the bar + gap
    paddingRight:   16,
    paddingTop:     13,
    paddingBottom:  13,
    gap:            14,
  },

  // Icon layers: outer → mid → inner
  iconGlowOuter: {
    width:          56,
    height:         56,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor:'transparent',
  },
  iconGlowMid: {
    width:          50,
    height:         50,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconInner: {
    width:          44,
    height:         44,
    borderRadius:   13,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    // Subtle inset shadow on iOS via elevation-like trick
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius:  4,
    elevation:     2,
  },
  iconEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },

  // Text
  nameCol: {
    flex:    1,
    gap:     3,
  },
  name: {
    fontSize:      16,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },
  arabic: {
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 0.5,
  },

  // Right: time + ring
  rightCol: {
    alignItems: 'center',
    gap:        10,
  },
  time: {
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: 0.5,
    textAlign:     'right',
  },

  // Completion ring
  ring: {
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize:   14,
    fontWeight: '900',
    lineHeight: 16,
  },

  // Sunrise marker dot (no checkbox)
  markerDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },

  // Bottom line
  bottomLine: {
    height:           1,
    marginHorizontal: 22,
  },
});
