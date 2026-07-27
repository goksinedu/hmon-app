import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from './src/components/UI';
import { ExperimentProvider } from './src/context/ExperimentContext';
import { ensureSignedIn } from './src/lib/firebase';
import DashboardScreen from './src/screens/DashboardScreen';
import LightingScreen from './src/screens/LightingScreen';
import PhenotypingScreen from './src/screens/PhenotypingScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import SensorsScreen from './src/screens/SensorsScreen';
import SetupScreen from './src/screens/SetupScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
  );
}

export default function App() {
  useEffect(() => {
    // Anonymous cloud sign-in (no-op until Firebase is configured).
    ensureSignedIn().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ExperimentProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <StatusBar style="dark" />
          <BrandHeader />
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primaryDark,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarStyle: { borderTopColor: colors.border },
              }}
            >
              <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="🏠" focused={p.focused} /> }}
              />
              <Tab.Screen
                name="Sensors"
                component={SensorsScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="🌡️" focused={p.focused} /> }}
              />
              <Tab.Screen
                name="Plants"
                component={PhenotypingScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="🌱" focused={p.focused} /> }}
              />
              <Tab.Screen
                name="Lighting"
                component={LightingScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="💡" focused={p.focused} /> }}
              />
              <Tab.Screen
                name="Photos"
                component={PhotosScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="📷" focused={p.focused} /> }}
              />
              <Tab.Screen
                name="Setup"
                component={SetupScreen}
                options={{ tabBarIcon: (p) => <TabIcon glyph="⚙️" focused={p.focused} /> }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </ExperimentProvider>
    </SafeAreaProvider>
  );
}
