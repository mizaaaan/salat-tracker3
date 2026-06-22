import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const ARABIC = {
  Fajr:    'الفجر',
  Dhuhr:   'الظهر',
  Asr:     'العصر',
  Maghrib: 'المغرب',
  Isha:    'العشاء',
};

/** Request permission to show notifications. Returns true if granted. */
export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false; // Skip on simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Schedule local notifications for all 5 trackable prayers for today.
 * Cancels any previously scheduled prayer notifications first.
 */
export const schedulePrayerNotifications = async (prayerTimes) => {
  // Cancel old scheduled notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  const trackable = {
    Fajr:    prayerTimes.Fajr,
    Dhuhr:   prayerTimes.Dhuhr,
    Asr:     prayerTimes.Asr,
    Maghrib: prayerTimes.Maghrib,
    Isha:    prayerTimes.Isha,
  };

  const now = new Date();

  for (const [name, time] of Object.entries(trackable)) {
    if (!time || time <= now) continue; // Skip past prayers

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🕌 ${name} — ${ARABIC[name]}`,
        body:  `It's time for ${name} prayer. Allahu Akbar! 🤲`,
        sound: true,
        data:  { prayer: name },
      },
      trigger: { date: time },
    });
  }
};

/** Cancel all scheduled prayer notifications. */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
