import React, {type ReactNode} from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type ArcadePanelProps = {
  children: ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function ArcadePanel({children, title, style}: ArcadePanelProps) {
  return (
    <View accessibilityRole="summary" style={[styles.panel, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleLine} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    padding: arcadeTheme.spacing.lg,
    gap: arcadeTheme.spacing.md,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  title: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.ink,
  },
  titleLine: {
    backgroundColor: arcadeTheme.colors.line,
    flex: 1,
    height: 2,
  },
});
