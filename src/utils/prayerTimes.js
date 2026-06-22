import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from 'adhan';

// The 5 trackable prayers (Sunrise is display-only)
export const TRACKABLE_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const ALL_PRAYERS       = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const PRAYER_META = {
  Fajr:    { icon: '🌅', image: require('../../assets/prayers/fajr.png'),    arabic: 'الفجر',   color: '#7B8CDE' },
  Sunrise: { icon: '🌄', image: require('../../assets/prayers/sunrise.png'), arabic: 'الشروق',  color: '#F9A825' },
  Dhuhr:   { icon: '☀️', image: require('../../assets/prayers/dhuhr.png'),   arabic: 'الظهر',   color: '#FFD600' },
  Asr:     { icon: '🌤️', image: require('../../assets/prayers/asr.png'),    arabic: 'العصر',   color: '#FF8F00' },
  Maghrib: { icon: '🌇', image: require('../../assets/prayers/maghrib.png'), arabic: 'المغرب',  color: '#FF7043' },
  Isha:    { icon: '🌙', image: require('../../assets/prayers/isha.png'),    arabic: 'العشاء',  color: '#5C6BC0' },
};

/**
 * Calculate prayer times for a given location and date.
 * Uses Karachi method (standard in South/Southeast Asia).
 */
export const calculatePrayerTimes = (latitude, longitude, date = new Date()) => {
  const coordinates = new Coordinates(latitude, longitude);
  // Karachi method used widely in Bangladesh, Pakistan, India
  const params     = CalculationMethod.Karachi();
  const times      = new PrayerTimes(coordinates, date, params);

  return {
    Fajr:    times.fajr,
    Sunrise: times.sunrise,
    Dhuhr:   times.dhuhr,
    Asr:     times.asr,
    Maghrib: times.maghrib,
    Isha:    times.isha,
  };
};

/**
 * Returns the Qibla bearing (degrees clockwise from North) for a location.
 */
export const calculateQibla = (latitude, longitude) => {
  const coordinates = new Coordinates(latitude, longitude);
  return Qibla(coordinates); // number: degrees from North
};

/**
 * Finds the next upcoming prayer after now.
 * If every prayer for today has already passed (i.e. it's after Isha),
 * rolls over and returns tomorrow's Fajr — provided latitude/longitude
 * are passed in so tomorrow's times can be calculated.
 * Returns { name, time } or null if it can't be determined.
 */
export const getNextPrayer = (prayerTimes, latitude, longitude) => {
  const now = new Date();
  for (const name of ALL_PRAYERS) {
    if (prayerTimes[name] && prayerTimes[name] > now) {
      return { name, time: prayerTimes[name] };
    }
  }

  // All of today's prayers have passed (post-Isha) — roll over to tomorrow's Fajr
  if (latitude != null && longitude != null) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = calculatePrayerTimes(latitude, longitude, tomorrow);
    return { name: 'Fajr', time: tomorrowTimes.Fajr };
  }

  return null;
};

/**
 * Returns tomorrow's Fajr time for a given location — used to anchor the
 * night-time (Maghrib → Fajr) arc once today's Maghrib has passed.
 */
export const getTomorrowFajr = (latitude, longitude) => {
  if (latitude == null || longitude == null) return null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return calculatePrayerTimes(latitude, longitude, tomorrow).Fajr;
};

/**
 * Formats a Date object to a 12-hour time string, e.g. "4:23 AM"
 */
export const formatTime = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Returns a countdown string "HH:MM:SS" for the difference between
 * a future Date and now.
 */
export const getCountdown = (targetDate) => {
  const diff = targetDate - new Date();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

/**
 * Returns the CURRENT active prayer and the Date when it ends.
 * e.g. if it's 12:30 PM → { name: 'Dhuhr', endsAt: <Asr Date> }
 *
 * PRAYER_END_ORDER: each prayer ends when the next one begins.
 * Isha ends at tomorrow's Fajr, so caller should pass tomorrowFajr.
 */
export const getCurrentPrayer = (prayerTimes, tomorrowFajr = null) => {
  const now    = new Date();
  const order  = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (let i = order.length - 1; i >= 0; i--) {
    const name      = order[i];
    const startTime = prayerTimes[name];
    if (startTime && now >= startTime) {
      // Found the current prayer — its end time is the next prayer's start
      const nextName    = order[i + 1];
      const nextStart   = nextName ? prayerTimes[nextName] : null;
      const endsAt      = nextStart ?? tomorrowFajr ?? null;
      return { name, endsAt };
    }
  }
  // Before Fajr — still in Isha from yesterday (or no data)
  return null;
};
