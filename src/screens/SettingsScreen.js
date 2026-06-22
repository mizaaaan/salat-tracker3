import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: '#444', true: '#FFD700' }}
          thumbColor={notificationsEnabled ? '#FFD700' : '#888'}
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.label}>App Version</Text>
        <Text style={styles.value}>1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a3e',
    marginBottom: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#888',
  },
});