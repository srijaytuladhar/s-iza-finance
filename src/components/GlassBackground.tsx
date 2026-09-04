import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface GlassBackgroundProps {
  children?: React.ReactNode;
  style?: any;
}

export const GlassBackground: React.FC<GlassBackgroundProps> = ({ children, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Liquid Ambient Orbs that refract through frosted glass */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top-Right Ambient Orb */}
        <View
          style={[
            styles.orb,
            {
              top: -60,
              right: -60,
              width: width * 0.8,
              height: width * 0.8,
              borderRadius: (width * 0.8) / 2,
              backgroundColor: colors.orb1,
            },
          ]}
        />

        {/* Center-Left Ambient Orb */}
        <View
          style={[
            styles.orb,
            {
              top: height * 0.32,
              left: -80,
              width: width * 0.85,
              height: width * 0.85,
              borderRadius: (width * 0.85) / 2,
              backgroundColor: colors.orb2,
            },
          ]}
        />

        {/* Bottom-Right Ambient Orb */}
        <View
          style={[
            styles.orb,
            {
              bottom: height * 0.12,
              right: -60,
              width: width * 0.75,
              height: width * 0.75,
              borderRadius: (width * 0.75) / 2,
              backgroundColor: colors.orb3,
            },
          ]}
        />

        {/* Bottom-Left Mint Ambient Orb */}
        <View
          style={[
            styles.orb,
            {
              bottom: -70,
              left: -40,
              width: width * 0.7,
              height: width * 0.7,
              borderRadius: (width * 0.7) / 2,
              backgroundColor: colors.orb4,
            },
          ]}
        />
      </View>

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    opacity: 0.9,
    // Web and native support
    transform: [{ scale: 1.1 }],
  },
});
