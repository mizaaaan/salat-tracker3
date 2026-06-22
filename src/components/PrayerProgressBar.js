import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../constants/ThemeContext';

/**
 * Today's prayer progress — styled like a tasbih (prayer beads) strand
 * instead of a plain progress bar.
 *
 * Props:
 *   prayers      — ordered array of trackable prayer names, e.g. TRACKABLE_PRAYERS
 *   completed    — array of completed prayer names
 *   nextPrayer   — name of the next upcoming prayer (gets a soft pulse)
 *   prayerMeta   — { [name]: { icon, color } }
 */
export default function PrayerProgressBar({ prayers, completed, nextPrayer, prayerMeta }) {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  const total = prayers.length;
  const doneCount = prayers.filter((p) => completed.includes(p)).length;
  const percent = total > 0 ? doneCount / total : 0;

  // ── Ring badge geometry ──
  const RING_SIZE = 52;
  const RING_STROKE = 5;
  const RING_R = (RING_SIZE - RING_STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RING_R;

  // ── Pulse animation for the next upcoming bead ──
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.wrap}>
      {/* ── Header: ring badge + label ── */}
      <View style={styles.headerRow}>
        <View style={styles.ringBadge}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={Colors.border}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={Colors.primary}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE * (1 - percent)}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringLabelWrap}>
            <Text style={styles.ringLabel}>{doneCount}/{total}</Text>
          </View>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Today's Prayers</Text>
          <Text style={styles.headerSub}>
            {doneCount === total
              ? 'All prayers completed 🤲'
              : `${total - doneCount} remaining`}
          </Text>
        </View>
      </View>

      {/* ── Beads strand ── */}
      <View style={styles.beadsRow}>
        <View style={styles.connector} pointerEvents="none" />
        {prayers.map((name) => {
          const isDone = completed.includes(name);
          const isNext = !isDone && name === nextPrayer;
          const meta = prayerMeta[name] || {};

          return (
            <View key={name} style={styles.beadColumn}>
              <View style={styles.beadCenter}>
                {isNext && (
                  <Animated.View
                    style={[
                      styles.beadPulse,
                      {
                        borderColor: meta.color || Colors.primary,
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.bead,
                    isDone
                      ? { backgroundColor: meta.color || Colors.primary, borderColor: meta.color || Colors.primary }
                      : styles.beadPending,
                    isNext && { borderColor: meta.color || Colors.primary, borderWidth: 2 },
                  ]}
                >
                  {isDone ? (
                    <Text style={styles.beadCheck}>✓</Text>
                  ) : (
                    <Text style={styles.beadIcon}>{meta.icon}</Text>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.beadLabel,
                  isDone && { color: Colors.text, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const BEAD = 38;

const getStyles = (Colors) => StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical:   10,
    backgroundColor:  Colors.card,
    borderRadius:     18,
    borderWidth:      1,
    borderColor:      Colors.border,
    paddingVertical:  16,
    paddingHorizontal: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           14,
    marginBottom:  18,
  },
  ringBadge: {
    width:      52,
    height:     52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    color:      Colors.text,
    fontSize:   12,
    fontWeight: '800',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color:      Colors.text,
    fontSize:   15,
    fontWeight: '700',
  },
  headerSub: {
    color:      Colors.textSecondary,
    fontSize:   12,
    marginTop:  2,
  },

  // Beads strand
  beadsRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    position:       'relative',
  },
  connector: {
    position:        'absolute',
    top:             BEAD / 2 - 1,
    left:            BEAD / 2,
    right:           BEAD / 2,
    height:          2,
    backgroundColor: Colors.border,
  },
  beadColumn: {
    alignItems: 'center',
    width:      BEAD + 10,
  },
  beadCenter: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  beadPulse: {
    position:     'absolute',
    width:        BEAD,
    height:       BEAD,
    borderRadius: BEAD / 2,
    borderWidth:  2,
  },
  bead: {
    width:          BEAD,
    height:         BEAD,
    borderRadius:   BEAD / 2,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  beadPending: {
    backgroundColor: Colors.cardLight,
    borderColor:     Colors.border,
  },
  beadIcon: {
    fontSize: 16,
    opacity:  0.8,
  },
  beadCheck: {
    color:      Colors.background,
    fontSize:   16,
    fontWeight: '800',
  },
  beadLabel: {
    color:     Colors.textMuted,
    fontSize:  10,
    marginTop: 6,
  },
});
