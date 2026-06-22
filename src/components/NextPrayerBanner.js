import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions,
} from 'react-native';
import Svg, {
  Path, Circle, Rect,
  Defs, LinearGradient as SvgGradient, Stop,
} from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Landscape card dimensions ─────────────────────────────────────────────────
const CARD_W = SCREEN_W - 32;           // full width minus small margins
const CARD_H = Math.round(CARD_W * 0.62); // ~62% of width → landscape 16:10 feel

// ── Prayer background images ──────────────────────────────────────────────────
const PRAYER_IMAGES = {
  Fajr:    require('../../assets/prayers/fajr.png'),
  Sunrise: require('../../assets/prayers/sunrise.png'),
  Dhuhr:   require('../../assets/prayers/dhuhr.png'),
  Asr:     require('../../assets/prayers/asr.png'),
  Maghrib: require('../../assets/prayers/maghrib.png'),
  Isha:    require('../../assets/prayers/isha.png'),
};

const PRAYER_TINT = {
  Fajr:    'rgba(5,  15,  55, 0.28)',
  Sunrise: 'rgba(90, 35,   0, 0.22)',
  Dhuhr:   'rgba(8,  28,  80, 0.20)',
  Asr:     'rgba(90, 45,   0, 0.25)',
  Maghrib: 'rgba(100, 10,  5, 0.28)',
  Isha:    'rgba(5,   5,  18, 0.38)',
};

// ── Arc geometry — true semicircle (D-shape), equal radii ─────────────────────
const ARC_W   = CARD_W - 48;
const LEFT_X  = 10;
const RIGHT_X = ARC_W - 10;

const ARC_RX  = (RIGHT_X - LEFT_X) / 2;   // horizontal radius
const ARC_RY  = ARC_RX;                   // equal radii → true circle, not an ellipse
const ARC_CX  = (LEFT_X + RIGHT_X) / 2;
const BASE_Y  = ARC_RY + 8;
const ARC_H   = BASE_Y + 8;

function arcPointAt(t) {
  const theta = Math.PI * (1 - t);
  const x = ARC_CX + ARC_RX * Math.cos(theta);
  const y = BASE_Y - ARC_RY * Math.sin(theta);
  return { x, y };
}

// ── Day/night arc progress ─────────────────────────────────────────────────
// Day:   Fajr  -> Maghrib  → sun travels the arc
// Night: Maghrib -> next Fajr → moon travels the SAME arc
function calcArcState(fajrTime, maghribTime, nextFajrTime) {
  const now = new Date();

  const fajr = (fajrTime instanceof Date) ? fajrTime : (() => {
    const d = new Date(); d.setHours(5, 0, 0, 0); return d;
  })();
  const maghrib = (maghribTime instanceof Date) ? maghribTime : (() => {
    const d = new Date(); d.setHours(19, 0, 0, 0); return d;
  })();
  const nextFajr = (nextFajrTime instanceof Date) ? nextFajrTime : (() => {
    const d = new Date(fajr); d.setDate(d.getDate() + 1); return d;
  })();

  if (now >= fajr && now < maghrib) {
    // Daytime
    const t = (now - fajr) / (maghrib - fajr);
    return { isDay: true, t: Math.max(0.03, Math.min(0.97, t)) };
  }

  // Nighttime — handle the two cases: tonight (after Maghrib) and
  // the tail end of last night (after midnight, before today's Fajr).
  let windowStart = maghrib;
  let windowEnd   = nextFajr;

  if (now < fajr) {
    // Still in the previous night's window — approximate "yesterday's
    // Maghrib" using tonight's Maghrib→Fajr duration as a proxy
    // (night length barely shifts day to day).
    windowEnd   = fajr;
    windowStart = new Date(fajr.getTime() - (nextFajr - maghrib));
  }

  const t = (now - windowStart) / (windowEnd - windowStart);
  return { isDay: false, t: Math.max(0.03, Math.min(0.97, t)) };
}

// ── Real moon phase for tonight, no external API ─────────────────────────────
// Returns p in [0, 1): 0 = new moon, 0.25 = first quarter,
// 0.5 = full moon, 0.75 = last quarter.
function getMoonPhaseFraction(date = new Date()) {
  const synodicMonth = 29.53058867; // days
  const knownNewMoon  = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let phase = (diffDays % synodicMonth) / synodicMonth;
  if (phase < 0) phase += 1;
  return phase;
}

function getMoonPhaseName(p) {
  if (p < 0.03 || p > 0.97) return 'New Moon';
  if (p < 0.22) return 'Waxing Crescent';
  if (p < 0.28) return 'First Quarter';
  if (p < 0.47) return 'Waxing Gibbous';
  if (p < 0.53) return 'Full Moon';
  if (p < 0.72) return 'Waning Gibbous';
  if (p < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

// Builds the SVG path for the moon's *lit* sliver at phase p, radius r,
// centered at (cx, cy). Draw a full dark disc first, then this on top.
function buildMoonPath(cx, cy, r, p) {
  const theta = p * 2 * Math.PI;
  const rx = r * Math.cos(theta); // signed horizontal radius of terminator ellipse
  const outerSweep       = p < 0.5 ? 1 : 0;
  const terminatorSweep  = (p < 0.25 || p > 0.75) ? 1 : 0;

  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r}`,
    `A ${Math.abs(rx)} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

function naturalCountdown(cd) {
  const [h, m, s] = (cd || '00:00:00').split(':').map(Number);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)           return `${h} hour${h !== 1 ? 's' : ''}`;
  if (m > 0)           return `${m} minute${m !== 1 ? 's' : ''}`;
  return `${s}s`;
}

// ── Gradient overlay ──────────────────────────────────────────────────────────
function GradientOverlay() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={CARD_W}
      height={CARD_H}
      preserveAspectRatio="none"
    >
      <Defs>
        <SvgGradient id="bannerFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor="#000" stopOpacity="0.00" />
          <Stop offset="0.40" stopColor="#000" stopOpacity="0.10" />
          <Stop offset="0.70" stopColor="#000" stopOpacity="0.45" />
          <Stop offset="1"    stopColor="#000" stopOpacity="0.72" />
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill="url(#bannerFade)" />
    </Svg>
  );
}

// ── Flat ellipse arc + sun (day) / moon (night) ───────────────────────────────
function CelestialArc({ isDay, t, moonPhase }) {
  const body = arcPointAt(t);
  // Large-arc=1, sweep=1 → correct upper ellipse arc
  const d = `M ${LEFT_X} ${BASE_Y} A ${ARC_RX} ${ARC_RY} 0 0 1 ${RIGHT_X} ${BASE_Y}`;

  const strokeColor = isDay ? 'rgba(255,255,255' : 'rgba(170,185,235';

  return (
    <Svg width={ARC_W} height={ARC_H}>
      {/* Glow layers */}
      <Path d={d} fill="none" stroke={`${strokeColor},0.12)`} strokeWidth={10} strokeLinecap="round" />
      <Path d={d} fill="none" stroke={`${strokeColor},0.25)`} strokeWidth={5}  strokeLinecap="round" />
      <Path d={d} fill="none" stroke={`${strokeColor},0.90)`} strokeWidth={2}  strokeLinecap="round" />

      {/* Endpoint dots */}
      <Circle cx={LEFT_X}  cy={BASE_Y} r={6}   fill={`${strokeColor},0.18)`} />
      <Circle cx={LEFT_X}  cy={BASE_Y} r={4}   fill={`${strokeColor},0.75)`} />
      <Circle cx={RIGHT_X} cy={BASE_Y} r={6}   fill={`${strokeColor},0.18)`} />
      <Circle cx={RIGHT_X} cy={BASE_Y} r={4}   fill={`${strokeColor},0.75)`} />

      {isDay ? (
        // ── Sun ──
        <>
          <Circle cx={body.x} cy={body.y} r={18}  fill="rgba(255,200,0,0.12)" />
          <Circle cx={body.x} cy={body.y} r={12}  fill="rgba(255,195,0,0.24)" />
          <Circle cx={body.x} cy={body.y} r={8}   fill="#FFC107" />
          <Circle cx={body.x} cy={body.y} r={5}   fill="#FFE566" />
          <Circle cx={body.x} cy={body.y} r={2.5} fill="#FFFDE7" />
        </>
      ) : (
        // ── Moon — real phase for tonight ──
        <>
          <Circle cx={body.x} cy={body.y} r={16}  fill="rgba(190,205,245,0.10)" />
          <Circle cx={body.x} cy={body.y} r={11}  fill="rgba(190,205,245,0.18)" />
          <Circle cx={body.x} cy={body.y} r={8}   fill="#3A4368" />
          <Path d={buildMoonPath(body.x, body.y, 8, moonPhase)} fill="#F4F1E8" />
        </>
      )}
    </Svg>
  );
}

// ── Page dots ─────────────────────────────────────────────────────────────────
const TRACKABLE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function PageDots({ prayerName }) {
  const active = Math.max(0, TRACKABLE.indexOf(prayerName));
  return (
    <View style={styles.dotsRow}>
      {TRACKABLE.map((_, i) => (
        <View key={i} style={[styles.dot, i === active ? styles.dotOn : styles.dotOff]} />
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NextPrayerBanner({
  name,
  time,
  countdown,
  hijriDate,
  gregorianDate,
  location,
  fajrTime,
  maghribTime,
  nextFajrTime,
  onLocationPress,
}) {
  const bgImage  = PRAYER_IMAGES[name] ?? PRAYER_IMAGES.Fajr;
  const tint     = PRAYER_TINT[name]   ?? PRAYER_TINT.Fajr;
  const locLabel = location || 'Local';

  const [arc, setArc] = useState(() => calcArcState(fajrTime, maghribTime, nextFajrTime));
  useEffect(() => {
    setArc(calcArcState(fajrTime, maghribTime, nextFajrTime));
    const id = setInterval(
      () => setArc(calcArcState(fajrTime, maghribTime, nextFajrTime)),
      60_000
    );
    return () => clearInterval(id);
  }, [fajrTime, maghribTime, nextFajrTime]);

  const moonPhase = arc.isDay ? 0 : getMoonPhaseFraction(new Date());

  return (
    <View style={styles.shadow}>
      <View style={styles.card}>

        {/* Background image — landscape fill */}
        <Image
          source={bgImage}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Mood tint */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />

        {/* Gradient */}
        <GradientOverlay />

        {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
        <View style={styles.overlay}>

          {/* Top bar */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.locationPill}
              onPress={onLocationPress}
              activeOpacity={0.75}
            >
              <Text style={styles.locationIcon}>🌐</Text>
              <Text style={styles.locationLabel}>{locLabel}</Text>
            </TouchableOpacity>
            <Text style={styles.topDate}>{gregorianDate}</Text>
          </View>

          {/* Small spacer */}
          <View style={{ flex: 1 }} />

          {/* ── Arc + Info block ──────────────────────────────────────────── */}
          <View style={styles.arcContainer}>

            {/* Flat arc SVG */}
            <View style={styles.arcWrap}>
              <CelestialArc isDay={arc.isDay} t={arc.t} moonPhase={moonPhase} />
            </View>

            {/* Prayer info INSIDE the arc — absolutely positioned */}
            <View style={styles.arcInfoOverlay}>
              <Text style={styles.hijriDate}>{hijriDate}</Text>
              <Text style={styles.prayerName}>{name}</Text>
              <Text style={styles.bigTime}>{time}</Text>
              <Text style={styles.countdown}>
                will start in {naturalCountdown(countdown)}
              </Text>
            </View>

          </View>

          {/* Page dots */}
          <PageDots prayerName={name} />

          <View style={{ height: 10 }} />
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: 16,
    marginVertical:   10,
    borderRadius:     20,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.40,
    shadowRadius:     16,
    elevation:        12,
  },
  card: {
    borderRadius: 20,
    overflow:     'hidden',
    height:       CARD_H,   // ← landscape height (62% of card width)
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingTop:        14,
    alignItems:        'center',
  },

  // Top bar
  topRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    width:          '100%',
  },
  locationPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.28)',
  },
  locationIcon:  { fontSize: 12 },
  locationLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  topDate:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  hijriDate:     {
    color:         'rgba(255,255,255,0.65)',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 0.5,
    marginBottom:  4,
  },

  // Arc container
  arcContainer: {
    width:      '100%',
    position:   'relative',
    alignItems: 'center',
  },
  arcWrap: {
    alignItems: 'center',
    width:      '100%',
  },

  // Prayer info INSIDE arc — absolutely placed
  arcInfoOverlay: {
    position:   'absolute',
    bottom:     16,
    left:       0,
    right:      0,
    alignItems: 'center',
  },

  // Prayer name
  prayerName: {
    color:         'rgba(255,255,255,0.88)',
    fontSize:      13,
    fontWeight:    '500',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom:  1,
  },

  // Big time
  bigTime: {
    color:            '#fff',
    fontSize:         32,
    fontWeight:       '700',
    letterSpacing:    1,
    lineHeight:       38,
    textShadowColor:  'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom:     1,
  },

  // Countdown
  countdown: {
    color:         'rgba(255,255,255,0.75)',
    fontSize:      12,
    letterSpacing: 0.2,
  },

  // Page dots
  dotsRow: {
    flexDirection:  'row',
    gap:            5,
    justifyContent: 'center',
    marginTop:      6,
  },
  dot:    { height: 5, borderRadius: 3 },
  dotOn:  { width: 18, backgroundColor: 'rgba(255,255,255,0.90)' },
  dotOff: { width:  5, backgroundColor: 'rgba(255,255,255,0.28)' },
});
