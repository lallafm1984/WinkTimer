import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type ModeCardAction = {
  label: string;
  value: string;
};

type ModeCardProps = {
  title: string;
  description: string;
  actions: ModeCardAction[];
  active?: boolean;
  beta?: boolean;
  onPress?: () => void;
};

export function ModeCard({
  title,
  description,
  actions,
  active = false,
  beta = false,
  onPress,
}: ModeCardProps) {
  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.badges}>
          {active ? (
            <View style={[styles.badge, styles.activeBadge]}>
              <Text style={[styles.badgeText, styles.activeBadgeText]}>
                ACTIVE
              </Text>
            </View>
          ) : null}
          {beta ? (
            <View style={[styles.badge, styles.betaBadge]}>
              <Text style={[styles.badgeText, styles.betaBadgeText]}>BETA</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        {actions.map(action => (
          <View key={`${action.label}-${action.value}`} style={styles.actionRow}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionValue}>{action.value}</Text>
          </View>
        ))}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={`${title} mode`}
        accessibilityRole="button"
        accessibilityState={{selected: active}}
        onPress={onPress}
        style={({pressed}) => [
          styles.card,
          active && styles.activeCard,
          pressed && styles.pressedCard,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, active && styles.activeCard]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    minHeight: arcadeTheme.dimensions.modeCardMinHeight,
    padding: arcadeTheme.spacing.md,
  },
  activeCard: {
    borderColor: arcadeTheme.colors.accent,
  },
  pressedCard: {
    opacity: 0.82,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    gap: arcadeTheme.spacing.xs,
  },
  title: {
    ...arcadeTheme.typography.body,
    color: arcadeTheme.colors.ink,
    fontWeight: '900',
  },
  description: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
    fontWeight: '400',
  },
  badges: {
    alignItems: 'flex-end',
    gap: arcadeTheme.spacing.xs,
  },
  badge: {
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  activeBadge: {
    backgroundColor: arcadeTheme.colors.accent,
    borderColor: arcadeTheme.colors.accent,
  },
  betaBadge: {
    backgroundColor: arcadeTheme.colors.panelMuted,
    borderColor: arcadeTheme.colors.heavyLine,
  },
  badgeText: {
    ...arcadeTheme.typography.label,
  },
  activeBadgeText: {
    color: arcadeTheme.colors.panel,
  },
  betaBadgeText: {
    color: arcadeTheme.colors.ink,
  },
  actions: {
    gap: arcadeTheme.spacing.xs,
  },
  actionRow: {
    alignItems: 'center',
    borderTopColor: arcadeTheme.colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
    paddingTop: arcadeTheme.spacing.xs,
  },
  actionLabel: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
  },
  actionValue: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.ink,
  },
});
