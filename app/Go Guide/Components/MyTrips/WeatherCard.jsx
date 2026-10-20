import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/constants';
import { useTheme } from '../constants/theme';

export default function WeatherCard({ weatherBrief: weatherBriefProp }) {
  const theme = useTheme();
  const weatherBrief = weatherBriefProp || "Expect pleasant travel conditions for your upcoming adventure!";


  // Simple heuristic for weather icon
  const getIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('sun') || t.includes('clear')) return 'sunny';
    if (t.includes('rain') || t.includes('shower')) return 'rainy';
    if (t.includes('cloud')) return 'cloudy';
    if (t.includes('snow')) return 'snow';
    if (t.includes('storm') || t.includes('thunder')) return 'thunderstorm';
    return 'partly-sunny';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: Colors.PRIMARY + '20' }]}>
        <Ionicons name={getIcon(weatherBrief)} size={24} color={Colors.PRIMARY} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: theme.subtext }]}>Expected Weather</Text>
        <Text style={[styles.value, { color: theme.text }]}>{weatherBrief}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
});
