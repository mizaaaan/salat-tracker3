import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export default function SettingsScreen() {
  const { colors: Colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      <Text style={[styles.title, { color: Colors.primary }]}>Settings</Text>

      <View style={[styles.settingItem, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Text style={[styles.label, { color: Colors.text }]}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={notificationsEnabled ? Colors.primary : Colors.textSecondary}
        />
      </View>

      <View style={[styles.settingItem, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
        <Text style={[styles.label, { color: Colors.text }]}>App Version</Text>
        <Text style={[styles.value, { color: Colors.textSecondary }]}>1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
  },
});
