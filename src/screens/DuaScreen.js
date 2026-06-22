import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export default function DuaScreen() {
  const { colors: Colors } = useTheme();
  const styles = getStyles(Colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.icon}>🤲</Text>
        <Text style={styles.title}>Dua</Text>
        <Text style={styles.subtitle}>Coming soon — daily duas & azkar</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});