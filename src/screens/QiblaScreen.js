import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import Svg, { Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../constants/ThemeContext';
import { calculateQibla } from '../utils/prayerTimes';

const SIZE   = 280;
const CENTER = SIZE / 2;
const RADIUS = 126;

/** Build tick marks for the compass ring */
const Ticks = ({ Colors }) => {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const isMajor  = i % 9 === 0;
    const angle    = (i * 5 * Math.PI) / 180;
    const r1       = isMajor ? RADIUS - 14 : RADIUS - 8;
    const x1       = CENTER + r1   * Math.sin(angle);
    const y1       = CENTER - r1   * Math.cos(angle);
    const x2       = CENTER + RADIUS * Math.sin(angle);
    const y2       = CENTER - RADIUS * Math.cos(angle);
    ticks.push(
      <Line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isMajor ? Colors.primary : Colors.border}
        strokeWidth={isMajor ? 2 : 1}
      />
    );
  }
  return <>{ticks}</>;
};

export default function QiblaScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  const [heading,    setHeading]    = useState(0);
  const [qibla,      setQibla]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const animAngle = useRef(new Animated.Value(0)).current;
  const currentAngle = useRef(0);

  // ── Setup: location + compass heading ─────────────────────────────────────
  useEffect(() => {
    let headingSub;

    const init = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find Qibla direction.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const q   = calculateQibla(loc.coords.latitude, loc.coords.longitude);
      setQibla(q);
      setLoading(false);

      // Use the device's native compass heading (iOS Core Location) instead of
      // computing it by hand from raw magnetometer x/y — that math is
      // orientation/axis-convention dependent and was giving the wrong angle.
      // trueHeading is corrected for magnetic declination using GPS; it reads
      // -1 until that correction is ready, so fall back to magHeading then.
      headingSub = await Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
        const h = trueHeading >= 0 ? trueHeading : magHeading;
        setHeading(h);
      });
    };

    init();
    return () => headingSub?.remove();
  }, []);

  // ── Animate needle rotation smoothly ──────────────────────────────────────
  useEffect(() => {
    if (qibla === null) return;
    // Needle points toward Qibla relative to the device's current facing
    let target = (qibla - heading + 360) % 360;

    // Shortest-path rotation to avoid spinning 350° the wrong way
    let diff = target - currentAngle.current;
    if (diff > 180)  diff -= 360;
    if (diff < -180) diff += 360;
    const next = currentAngle.current + diff;
    currentAngle.current = next;

    Animated.timing(animAngle, {
      toValue:         next,
      duration:        250,
      useNativeDriver: true,
    }).start();
  }, [heading, qibla]);

  const spin = animAngle.interpolate({
    inputRange:  [currentAngle.current - 360, currentAngle.current + 360],
    outputRange: [`${currentAngle.current - 360}deg`, `${currentAngle.current + 360}deg`],
  });

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding Qibla direction…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🧭</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const needleRotation = qibla !== null ? (qibla - heading + 360) % 360 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Title */}
        <Text style={styles.title}>🕋 Qibla Direction</Text>
        <Text style={styles.subtitle}>Point your phone to find Mecca</Text>

        {/* Compass */}
        <View style={styles.compassShell}>
          {/* Compass face */}
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Background (stays still) */}
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill={Colors.card} />
            {/* Outer glow ring (stays still) */}
            <Circle
              cx={CENTER} cy={CENTER} r={RADIUS + 4}
              fill="none" stroke={Colors.primary} strokeWidth="1" opacity="0.3"
            />
            {/* Rotating dial: ticks + N/E/S/W spin opposite the device's
                heading so whichever letter is at the top always matches the
                real-world direction the top of the phone is pointing at —
                exactly like the iOS Compass app. */}
            <G rotation={-heading} origin={`${CENTER}, ${CENTER}`}>
              <Ticks Colors={Colors} />
              <SvgText x={CENTER} y={20} textAnchor="middle"
                fill={Colors.primary} fontSize="16" fontWeight="bold">N</SvgText>
              <SvgText x={SIZE - 14} y={CENTER + 5} textAnchor="middle"
                fill={Colors.textSecondary} fontSize="14">E</SvgText>
              <SvgText x={CENTER} y={SIZE - 8} textAnchor="middle"
                fill={Colors.textSecondary} fontSize="14">S</SvgText>
              <SvgText x={14} y={CENTER + 5} textAnchor="middle"
                fill={Colors.textSecondary} fontSize="14">W</SvgText>
            </G>
          </Svg>

          {/* Animated needle (separate Animated.View for perf) */}
          <Animated.View
            style={[
              styles.needleWrapper,
              { transform: [{ rotate: `${needleRotation}deg` }] },
            ]}
          >
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {/* Gold arrow — points toward Qibla */}
              <G>
                <Path
                  d={`M ${CENTER} 36 L ${CENTER + 9} ${CENTER} L ${CENTER} ${CENTER + 16} L ${CENTER - 9} ${CENTER} Z`}
                  fill={Colors.primary}
                />
                {/* Tail */}
                <Path
                  d={`M ${CENTER} ${CENTER + 16} L ${CENTER + 9} ${CENTER} L ${CENTER} ${SIZE - 36} L ${CENTER - 9} ${CENTER} Z`}
                  fill={Colors.cardLight}
                  opacity="0.8"
                />
                {/* Kaaba at tip */}
                <SvgText x={CENTER} y={30} textAnchor="middle" fontSize="18">🕋</SvgText>
                {/* Center circle */}
                <Circle cx={CENTER} cy={CENTER} r={10} fill={Colors.primary} />
                <Circle cx={CENTER} cy={CENTER} r={5}  fill={Colors.background} />
              </G>
            </Svg>
          </Animated.View>
        </View>

        {/* Info cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>QIBLA BEARING</Text>
            <Text style={styles.infoValue}>{Math.round(qibla ?? 0)}°</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>COMPASS</Text>
            <Text style={styles.infoValue}>{Math.round(heading)}°</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DIFFERENCE</Text>
            <Text style={styles.infoValue}>
              {Math.round(Math.abs((qibla ?? 0) - heading))}°
            </Text>
          </View>
        </View>

        <Text style={styles.tip}>
          🌍 Hold phone flat and rotate until the 🕋 arrow points straight up
        </Text>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (Colors) => StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            16,
    padding:        32,
  },
  loadingText: {
    color:    Colors.textSecondary,
    fontSize: 15,
    marginTop: 12,
  },
  errorText: {
    color:     Colors.textSecondary,
    fontSize:  15,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex:       1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize:  24,
    fontWeight:'700',
    color:     Colors.text,
  },
  subtitle: {
    fontSize:    13,
    color:       Colors.textSecondary,
    marginTop:   4,
    marginBottom: 28,
  },
  compassShell: {
    position: 'relative',
    width:    SIZE,
    height:   SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.background,
    shadowColor:   Colors.primary,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius:  24,
    elevation:     12,
  },
  needleWrapper: {
    position: 'absolute',
    top: 0, left: 0,
    width:  SIZE,
    height: SIZE,
  },
  infoRow: {
    flexDirection: 'row',
    gap:           10,
    marginTop:     28,
    width:         '100%',
  },
  infoCard: {
    flex:            1,
    backgroundColor: Colors.card,
    borderRadius:    14,
    padding:         14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  infoLabel: {
    color:         Colors.textSecondary,
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 1,
    marginBottom:  4,
  },
  infoValue: {
    color:      Colors.primary,
    fontSize:   24,
    fontWeight: '800',
  },
  tip: {
    color:     Colors.textMuted,
    fontSize:  12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
