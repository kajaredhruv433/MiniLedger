import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddLoanScreen from './src/screens/AddLoanScreen';
import { api } from './src/services/api';

export type RootStackParamList = { Login: undefined; Dashboard: undefined; AddLoan: undefined };
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  useEffect(() => { api.hasToken().then((hasToken) => setInitialRoute(hasToken ? 'Dashboard' : 'Login')); }, []);
  if (!initialRoute) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color="#176b45" /></View>;
  return <NavigationContainer><Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Dashboard" component={DashboardScreen} /><Stack.Screen name="AddLoan" component={AddLoanScreen} options={{ headerShown: true, title: '', headerStyle: { backgroundColor: '#f6f7f4' }, headerShadowVisible: false }} /></Stack.Navigator></NavigationContainer>;
}
