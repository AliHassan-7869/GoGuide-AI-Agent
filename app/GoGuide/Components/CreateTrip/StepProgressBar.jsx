import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/constants';
import { useTheme, Palette } from '../constants/theme';

export default function StepProgressBar({ currentStep = 1, totalSteps = 5, stepTitle = "" }) {
  const theme = useTheme();
  const percentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep, text: `Step ${currentStep} of ${totalSteps}${stepTitle ? `, ${stepTitle}` : ""}` }}
    >
      <View style={styles.textRow}>
        <Text style={[styles.stepText, { color: Colors.PRIMARY }]}>
          STEP {currentStep} OF {totalSteps}
        </Text>
        {stepTitle ? (
          <Text style={[styles.titleText, { color: theme.subtext || "#888" }]}>
            {stepTitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: theme.isDark ? "#2A2A2A" : Palette.slate200 }]}>
        <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: Colors.PRIMARY }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
