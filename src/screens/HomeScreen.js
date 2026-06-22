import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';

import { useTheme } from '../constants/ThemeContext';
import {
  calculatePrayerTimes, formatTime, getCountdown,
  getNextPrayer, getTomorrowFajr, ALL_PRAYERS, TRACKABLE_PRAYERS, PRAYER_META,
} from '../utils/prayerTimes';
import { getCompletedPrayers, togglePrayer } from '../utils/storage';
import {
  requestNotificationPermission,
  schedulePrayerNotifications,
} from '../utils/notifications';
import PrayerCard         from '../components/PrayerCard';
import NextPrayerBanner   from '../components/NextPrayerBanner';
import PrayerProgressBar  from '../components/PrayerProgressBar';

// ── Hijri date calculator ────────────────────────────────────────────────────
function getHijriDate(date = new Date()) {
  const jd = Math.floor(date.getTime() / 86400000) + 2440588;

  const l  = jd - 1948440 + 10632;
  const n  = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j  =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670)           * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16)        * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay   = l3 - Math.floor((709 * hMonth) / 24);
  const hYear  = 30 * n + j - 30;

  const MONTHS = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
  ];
  return `${hDay} ${MONTHS[hMonth - 1]} ${hYear} AH`;
}

// ── End-time lookup: when does a given prayer period close? ──────────────────
const PRAYER_END_KEY = {
  Fajr:    'Sunrise',
  Sunrise: 'Dhuhr',
  Dhuhr:   'Asr',
  Asr:     'Maghrib',
  Maghrib: 'Isha',
  Isha:    null,
};

function getEndTime(prayerName, times) {
  const key = PRAYER_END_KEY[prayerName];
  return key ? formatTime(times[key]) : null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  const [prayerTimes,      setPrayerTimes]      = useState(null);
  const [completedPrayers, setCompletedPrayers] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [nextPrayer,       setNextPrayer]       = useState(null);
  const [countdown,        setCountdown]        = useState('--:--:--');
  const [tomorrowFajr,     setTomorrowFajr]     = useState(null);

  const timesRef  = useRef(null);
  const coordsRef = useRef(null);

  // ── Load prayer times from GPS ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location access is needed to calculate prayer times.');
        return;
      }

      const loc   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coordsRef.current = loc.coords;
      const times = calculatePrayerTimes(loc.coords.latitude, loc.coords.longitude);
      setPrayerTimes(times);
      timesRef.current = times;
      setTomorrowFajr(getTomorrowFajr(loc.coords.latitude, loc.coords.longitude));

      const granted = await requestNotificationPermission();
      if (granted) await schedulePrayerNotifications(times);

      const completed = await getCompletedPrayers();
      setCompletedPrayers(completed);
    } catch (e) {
      setError('Could not get location. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Live countdown ticker ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const times = timesRef.current;
      if (!times) return;
      const next = getNextPrayer(times, coordsRef.current?.latitude, coordsRef.current?.longitude);
      setNextPrayer(next);
      if (next) setCountdown(getCountdown(next.time));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Toggle a prayer done / undone ──────────────────────────────────────────
  const handleToggle = async (prayer) => {
    const updated = await togglePrayer(prayer);
    setCompletedPrayers(updated);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مرحباً';
    return 'مساء الخير';
  };

  // Short format for banner top-right
  const shortDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const hijriDate = getHijriDate();

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Calculating prayer times…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: main ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>

        {/* Next prayer banner — redesigned */}
        {nextPrayer && (
          <NextPrayerBanner
            name={nextPrayer.name}
            time={formatTime(nextPrayer.time)}
            endTime={getEndTime(nextPrayer.name, prayerTimes)}
            countdown={countdown}
            meta={PRAYER_META[nextPrayer.name]}
            onLocationPress={load}
            hijriDate={hijriDate}
            gregorianDate={shortDate}
            fajrTime={prayerTimes?.Fajr}
            maghribTime={prayerTimes?.Maghrib}
            nextFajrTime={tomorrowFajr}
          />
        )}

        {/* Today's progress — tasbih-style bead strand */}
        <PrayerProgressBar
          prayers={TRACKABLE_PRAYERS}
          completed={completedPrayers}
          nextPrayer={nextPrayer?.name}
          prayerMeta={PRAYER_META}
        />

        {/* Prayer cards */}
        <View style={styles.list}>
          {ALL_PRAYERS.map((prayer) => (
            <PrayerCard
              key={prayer}
              name={prayer}
              meta={PRAYER_META[prayer]}
              time={formatTime(prayerTimes?.[prayer])}
              isCompleted={completedPrayers.includes(prayer)}
              isTrackable={TRACKABLE_PRAYERS.includes(prayer)}
              onToggle={() => handleToggle(prayer)}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    padding:        32,
    gap:            16,
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
  retryBtn: {
    backgroundColor:   Colors.primary,
    paddingHorizontal: 28,
    paddingVertical:   12,
    borderRadius:      12,
    marginTop:         8,
  },
  retryText: {
    color:      Colors.background,
    fontWeight: '700',
    fontSize:   16,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     4,
  },
  greeting: {
    fontSize:   26,
    fontWeight: '700',
    color:      Colors.primary,
    textAlign:  'right',
  },
  date: {
    fontSize:  13,
    color:     Colors.textSecondary,
    marginTop: 4,
  },

  // Prayer list
  list: {
    paddingHorizontal: 16,
    paddingTop:        8,
  },
});
