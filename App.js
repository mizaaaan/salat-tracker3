import React from 'react';
import { Image } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import QuranScreen from './src/screens/QuranScreen';
import DuaScreen from './src/screens/DuaScreen';
import { ThemeProvider, useTheme } from './src/constants/ThemeContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();

// Custom image icon component
const TabIcon = ({ source, color }) => (
  <Image
    source={source}
    style={{
      width: 26,
      height: 26,
      tintColor: color,
      resizeMode: 'contain',
    }}
  />
);

function Navigation() {
  const { colors: Colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: Colors.background,
      card:       Colors.card,
      border:     Colors.border,
      text:       Colors.text,
      primary:    Colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 24,
            paddingTop: 10,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tab.Screen
          name="Prayer Times"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon
                source={require('./assets/prayertime.png')}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Qibla"
          component={QiblaScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon
                source={require('./assets/qibla.png')}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon
                source={require('./assets/tools.png')}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Quran"
          component={QuranScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon
                source={require('./assets/quran.png')}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Dua"
          component={DuaScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon
                source={require('./assets/dua.png')}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
}
