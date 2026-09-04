import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../utils/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderRadius?: number;
  intensity?: number;
  borderTint?: string;
  hasHighlight?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  onPress,
  borderRadius = 20,
  intensity = 50,
  borderTint,
  hasHighlight = true,
}) => {
  const { colors } = useTheme();

  const containerStyle = [
    styles.container,
    colors.glassShadow,
    {
      borderRadius,
      borderColor: borderTint || colors.glassBorder,
    },
    style,
  ];

  const cardBody = (
    <View style={[{ borderRadius, overflow: 'hidden' }]}>
      <BlurView
        intensity={intensity}
        tint={colors.blurTint}
        style={[
          styles.blurView,
          {
            backgroundColor: colors.glassCard,
            borderRadius,
          },
        ]}
      >
        {/* Subtle Specular Top Reflection Sheen */}
        {hasHighlight && (
          <View
            style={[
              styles.highlightBar,
              { backgroundColor: colors.glassBorderHighlight },
            ]}
          />
        )}
        <View style={[styles.innerContent, contentStyle]}>{children}</View>
      </BlurView>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          containerStyle,
          pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
        ]}
        onPress={onPress}
      >
        {cardBody}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{cardBody}</View>;
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginVertical: 6,
  },
  blurView: {
    width: '100%',
  },
  highlightBar: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    opacity: 0.6,
  },
  innerContent: {
    padding: 16,
  },
});
