import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityState?: {
    selected?: boolean;
    expanded?: boolean;
  };
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityState,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={
        disabled ? {...accessibilityState, disabled} : accessibilityState
      }
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({pressed}) => [
        styles.button,
        variant === 'secondary' ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.label,
          variant === 'secondary' ? styles.secondaryLabel : styles.primaryLabel,
          disabled && styles.disabledLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: '#1D4D3A',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5D0',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: '#17201A',
  },
  disabledLabel: {
    color: '#5D6A62',
  },
});
