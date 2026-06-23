import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions,
} from 'react-native';
import Svg, {
  Path, Circle, Rect,
  Defs, LinearGradient as SvgGradient, Stop,
} from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Card dimensions ───────────────────────────────────────────────────────────
const CARD_W = SCREEN_W - 32;

// ── Prayer background images ──────────────────────────────────────────────────
const PRAYER_IMAGES = {
  Fajr:    require('../../assets/prayers/fajr.jpg'),
  Sunrise: require('../../assets/prayers/sunrise.jpg'),
  Dhuhr:   require('../../assets/prayers/dhuhr.jpg'),
  Asr:     require('../../assets/prayers/asr.jpg'),
  Maghrib: require('../../assets/prayers/maghrib.jpg'),
  Isha:    require('../../assets/prayers/isha.jpg'),
};

const PRAYER_TINT = {
  Fajr:    'rgba(5,  15,  55, 0.28)',
  Sunrise: 'rgba(90, 35,   0, 0.22)',
  Dhuhr:   'rgba(8,  28,  80, 0.20)',
  Asr:     'rgba(90, 45,   0, 0.25)',
  Maghrib: 'rgba(100, 10,  5, 0.28)',
  Isha:    'rgba(5,   5,  18, 0.38)',
};

// ── Arc geometry ──────────────────────────────────────────────────────────────
const ARC_W   = CARD_W - 48;
const LEFT_X  = 10;
const RIGHT_X = ARC_W - 10;
const ARC_RX  = (RIGHT_X - LEFT_X) / 2;
const ARC_RY  = ARC_RX;
const ARC_CX  = (LEFT_X + RIGHT_X) / 2;
const BASE_Y  = ARC_RY + 8;
const ARC_H   = BASE_Y + 8;
const CARD_H  = ARC_H + 57;

function arcPointAt(t) {
  const theta = Math.PI * (1 - t);
  const x = ARC_CX + ARC_RX * Math.cos(theta);
  const y = BASE_Y - ARC_RY * Math.sin(theta);
  return { x, y };
}

// ── Sun/Moon arc: day = Fajr→Maghrib, night = Maghrib→nextFajr ───────────────
function calcArcState(fajr, maghrib, nextFajr) {
  const now = new Date();

  const F = fajr    instanceof Date ? fajr    : (() => { const d = new Date(); d.setHours(5,0,0,0);  return d; })();
  const M = maghrib instanceof Date ? maghrib : (() => { const d = new Date(); d.setHours(19,0,0,0); return d; })();
  const N = nextFajr instanceof Date ? nextFajr : new Date(F.getTime() + 86400000);

  if (now >= F && now < M) {
    return { isDay: true, t: Math.max(0.03, Math.min(0.97, (now - F) / (M - F))) };
  }

  let wStart = M, wEnd = N;
  if (now < F) {
    wEnd   = F;
    wStart = new Date(F.getTime() - (N - M));
  }
  return { isDay: false, t: Math.max(0.03, Math.min(0.97, (now - wStart) / (wEnd - wStart))) };
}

// ── Moon phase (no API) ───────────────────────────────────────────────────────
function getMoonPhase(date = new Date()) {
  const synodic   = 29.53058867;
  const refNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  let p = ((date.getTime() - refNewMoon) / 86400000 % synodic) / synodic;
  if (p < 0) p += 1;
  return p;
}

function buildMoonPath(cx, cy, r, p) {
  const rx = r * Math.cos(p * 2 * Math.PI);
  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${p < 0.5 ? 1 : 0} ${cx} ${cy + r}`,
    `A ${Math.abs(rx)} ${r} 0 0 ${(p < 0.25 || p > 0.75) ? 1 : 0} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

// ── Format HH:mm:ss ───────────────────────────────────────────────────────────
function formatHMS(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

// ── Format time for display ───────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── THE BRAIN: computes all display state from current time + prayer times ────
//
//  States:
//   • Pre-Fajr   → bgName=Isha,    displayName=Fajr,    mode='next',   countdown to Fajr
//   • Fajr win.  → bgName=Fajr,    displayName=Fajr,    mode='active', countdown to Sunrise
//   • Gap        → bgName=Sunrise, displayName=Dhuhr,   mode='next',   countdown to Dhuhr
//   • Dhuhr win. → bgName=Dhuhr,   displayName=Dhuhr,   mode='active', countdown to Asr
//   • Asr win.   → bgName=Asr,     displayName=Asr,     mode='active', countdown to Maghrib
//   • Maghrib w. → bgName=Maghrib, displayName=Maghrib, mode='active', countdown to Isha
//   • Isha win.  → bgName=Isha,    displayName=Isha,    mode='active', countdown to nextFajr
//
function calcBannerState(prayerTimes, nextFajrTime) {
  if (!prayerTimes) return null;
  const now = new Date();
  const { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha } = prayerTimes;

  // Pre-Fajr — still night, next is Fajr
  if (now < Fajr) {
    return {
      bgName: 'Isha',
      displayName: 'Fajr',
      arabic: 'الفجر',
      bigTime: fmt(Fajr),
      mode: 'next',
      countdown: formatHMS(Fajr - now),
      nextName: null,
    };
  }

  // Fajr window → Sunrise
  if (now < Sunrise) {
    return {
      bgName: 'Fajr',
      displayName: 'Fajr',
      arabic: 'الفجر',
      bigTime: fmt(Fajr),
      mode: 'active',
      countdown: formatHMS(Sunrise - now),
      nextName: 'Sunrise',
    };
  }

  // Post-Fajr gap → Dhuhr (Ishraq / Duha time)
  if (now < Dhuhr) {
    return {
      bgName: 'Sunrise',
      displayName: 'Dhuhr',
      arabic: 'الظهر',
      bigTime: fmt(Dhuhr),
      mode: 'next',
      countdown: formatHMS(Dhuhr - now),
      nextName: null,
    };
  }

  // Dhuhr window → Asr
  if (now < Asr) {
    return {
      bgName: 'Dhuhr',
      displayName: 'Dhuhr',
      arabic: 'الظهر',
      bigTime: fmt(Dhuhr),
      mode: 'active',
      countdown: formatHMS(Asr - now),
      nextName: 'Asr',
    };
  }

  // Asr window → Maghrib
  if (now < Maghrib) {
    return {
      bgName: 'Asr',
      displayName: 'Asr',
      arabic: 'العصر',
      bigTime: fmt(Asr),
      mode: 'active',
      countdown: formatHMS(Maghrib - now),
      nextName: 'Maghrib',
    };
  }

  // Maghrib window → Isha
  if (now < Isha) {
    return {
      bgName: 'Maghrib',
      displayName: 'Maghrib',
      arabic: 'المغرب',
      bigTime: fmt(Maghrib),
      mode: 'active',
      countdown: formatHMS(Isha - now),
      nextName: 'Isha',
    };
  }

  // Isha window → next Fajr
  const tFajr = nextFajrTime instanceof Date
    ? nextFajrTime
    : new Date(Fajr.getTime() + 86400000);
  return {
    bgName: 'Isha',
    displayName: 'Isha',
    arabic: 'العشاء',
    bigTime: fmt(Isha),
    mode: 'active',
    countdown: formatHMS(tFajr - now),
    nextName: 'Fajr',
  };
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

// ── Celestial arc (sun day / moon night) ──────────────────────────────────────
function CelestialArc({ isDay, t, moonPhase }) {
  const body = arcPointAt(t);
  const d    = `M ${LEFT_X} ${BASE_Y} A ${ARC_RX} ${ARC_RY} 0 0 1 ${RIGHT_X} ${BASE_Y}`;
  const sc   = isDay ? 'rgba(255,255,255' : 'rgba(170,185,235';

  return (
    <Svg width={ARC_W} height={ARC_H}>
      <Path d={d} fill="none" stroke={`${sc},0.12)`} strokeWidth={10} strokeLinecap="round" />
      <Path d={d} fill="none" stroke={`${sc},0.25)`} strokeWidth={5}  strokeLinecap="round" />
      <Path d={d} fill="none" stroke={`${sc},0.90)`} strokeWidth={2}  strokeLinecap="round" />

      <Circle cx={LEFT_X}  cy={BASE_Y} r={6} fill={`${sc},0.18)`} />
      <Circle cx={LEFT_X}  cy={BASE_Y} r={4} fill={`${sc},0.75)`} />
      <Circle cx={RIGHT_X} cy={BASE_Y} r={6} fill={`${sc},0.18)`} />
      <Circle cx={RIGHT_X} cy={BASE_Y} r={4} fill={`${sc},0.75)`} />

      {isDay ? (
        <>
          <Circle cx={body.x} cy={body.y} r={18}  fill="rgba(255,200,0,0.12)" />
          <Circle cx={body.x} cy={body.y} r={12}  fill="rgba(255,195,0,0.24)" />
          <Circle cx={body.x} cy={body.y} r={8}   fill="#FFC107" />
          <Circle cx={body.x} cy={body.y} r={5}   fill="#FFE566" />
          <Circle cx={body.x} cy={body.y} r={2.5} fill="#FFFDE7" />
        </>
      ) : (
        <>
          <Circle cx={body.x} cy={body.y} r={16} fill="rgba(190,205,245,0.10)" />
          <Circle cx={body.x} cy={body.y} r={11} fill="rgba(190,205,245,0.18)" />
          <Circle cx={body.x} cy={body.y} r={8}  fill="#3A4368" />
          <Path d={buildMoonPath(body.x, body.y, 8, moonPhase)} fill="#F4F1E8" />
        </>
      )}
    </Svg>
  );
}

// ── Page dots ─────────────────────────────────────────────────────────────────
const TRACKABLE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function PageDots({ activeName }) {
  // During Sunrise gap show Dhuhr dot (1); all others map directly
  const name   = activeName === 'Sunrise' ? 'Dhuhr' : activeName;
  const active = Math.max(0, TRACKABLE.indexOf(name));
  return (
    <View style={styles.dotsRow}>
      {TRACKABLE.map((_, i) => (
        <View key={i} style={[styles.dot, i === active ? styles.dotOn : styles.dotOff]} />
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
//
// Props:
//   prayerTimes     { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha }  (Date objects)
//   nextFajrTime    Date   tomorrow's Fajr (for Isha→Fajr countdown)
//   hijriDate       string
//   gregorianDate   string
//   location        string (city name)
//   onLocationPress function
//
export default function NextPrayerBanner({
  prayerTimes,
  nextFajrTime,
  hijriDate,
  gregorianDate,
  location,
  onLocationPress,
}) {
  const locLabel = location || 'Local';

  // ── 1-second live state ────────────────────────────────────────────────────
  const [state, setState] = useState(() => calcBannerState(prayerTimes, nextFajrTime));

  useEffect(() => {
    // Recompute immediately whenever prayerTimes changes
    setState(calcBannerState(prayerTimes, nextFajrTime));

    // Then tick every second — countdown updates + auto-phase transition at 0
    const id = setInterval(() => {
      setState(calcBannerState(prayerTimes, nextFajrTime));
    }, 1000);

    return () => clearInterval(id);
  }, [prayerTimes, nextFajrTime]);

  // ── Arc (updates every minute — sun/moon moves slowly) ────────────────────
  const [arc, setArc] = useState(() =>
    calcArcState(prayerTimes?.Fajr, prayerTimes?.Maghrib, nextFajrTime)
  );
  useEffect(() => {
    setArc(calcArcState(prayerTimes?.Fajr, prayerTimes?.Maghrib, nextFajrTime));
    const id = setInterval(() => {
      setArc(calcArcState(prayerTimes?.Fajr, prayerTimes?.Maghrib, nextFajrTime));
    }, 60_000);
    return () => clearInterval(id);
  }, [prayerTimes, nextFajrTime]);

  const moonPhase = arc.isDay ? 0 : getMoonPhase();

  if (!state) return null;

  const bgImage = PRAYER_IMAGES[state.bgName] ?? PRAYER_IMAGES.Fajr;
  const tint    = PRAYER_TINT[state.bgName]   ?? PRAYER_TINT.Fajr;

  return (
    <View style={styles.shadow}>
      <View style={styles.card}>

        {/* Background */}
        <Image source={bgImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        <GradientOverlay />

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

          <View style={{ height: 10 }} />

          {/* Arc + info block */}
          <View style={styles.arcContainer}>
            <View style={styles.arcWrap}>
              <CelestialArc isDay={arc.isDay} t={arc.t} moonPhase={moonPhase} />
            </View>

            {/* Info overlaid inside arc */}
            <View style={styles.arcInfoOverlay}>

              {/* Hijri date */}
              <Text style={styles.hijriDate}>{hijriDate}</Text>

              {/* Prayer name */}
              <Text style={styles.prayerName}>{state.displayName.toUpperCase()}</Text>

              {/* Arabic name */}
              {!!state.arabic && (
                <Text style={styles.arabicName}>{state.arabic}</Text>
              )}

              {/* Big clock time */}
              <Text style={styles.bigTime}>{state.bigTime}</Text>

              {/* ── Live countdown row ─────────────────────────────────── */}
              {state.mode === 'active' ? (
                // During an active prayer window:
                // "[NextName]  HH:mm:ss" — shows next prayer + live countdown
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownLabel}>
                    {state.nextName}
                  </Text>
                  <Text style={styles.countdownSep}>·</Text>
                  <Text style={styles.countdownTicker}>{state.countdown}</Text>
                </View>
              ) : (
                // Between windows / pre-Fajr:
                // "Starts in  HH:mm:ss"
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownLabel}>Starts in</Text>
                  <Text style={styles.countdownSep}>·</Text>
                  <Text style={styles.countdownTicker}>{state.countdown}</Text>
                </View>
              )}

            </View>
          </View>

          {/* Page dots */}
          <PageDots activeName={state.displayName} />
          <View style={{ height: 10 }} />

        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: 16,
    marginVertical:   10,
    borderRadius:     20,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.15,
    shadowRadius:     6,
    elevation:        4,
  },
  card: {
    borderRadius: 20,
    overflow:     'hidden',
    height:       CARD_H,
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

  // Arc
  arcContainer: {
    width:      '100%',
    position:   'relative',
    alignItems: 'center',
  },
  arcWrap: {
    alignItems: 'center',
    width:      '100%',
  },

  // Info overlay inside arc
  arcInfoOverlay: {
    position:   'absolute',
    bottom:     16,
    left:       0,
    right:      0,
    alignItems: 'center',
  },

  hijriDate: {
    color:         'rgba(255,255,255,0.60)',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 0.5,
    marginBottom:  4,
  },

  prayerName: {
    color:         'rgba(255,255,255,0.88)',
    fontSize:      13,
    fontWeight:    '500',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom:  1,
  },

  arabicName: {
    color:         'rgba(255,255,255,0.70)',
    fontSize:      16,
    fontWeight:    '600',
    letterSpacing: 0.5,
    marginBottom:  2,
  },

  bigTime: {
    color:            '#fff',
    fontSize:         32,
    fontWeight:       '700',
    letterSpacing:    1,
    lineHeight:       38,
    textShadowColor:  'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom:     4,
  },

  // ── Live countdown row ────────────────────────────────────────────────────
  countdownRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           6,
  },
  countdownLabel: {
    color:         'rgba(255,255,255,0.60)',
    fontSize:      12,
    fontWeight:    '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countdownSep: {
    color:   'rgba(255,255,255,0.30)',
    fontSize: 11,
  },
  countdownTicker: {
    color:           '#FFD700',
    fontSize:        15,
    fontWeight:      '800',
    letterSpacing:   1.8,
    fontVariant:     ['tabular-nums'],
    textShadowColor:  'rgba(255,215,0,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
