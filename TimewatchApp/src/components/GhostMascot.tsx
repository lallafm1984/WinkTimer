import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {
  selectRandomMascotImage,
  type GhostExpression,
} from './mascotImages';
import {arcadeTheme} from '../theme/arcadeTheme';

export type {GhostExpression} from './mascotImages';

export type WinkSide = 'left' | 'right' | 'any';

type GhostMascotProps = {
  accessibilityLabel?: string;
  expression: GhostExpression;
  scale?: number;
  size?: 'large' | 'medium';
  winkSide?: WinkSide;
};

export function getGhostExpressionLabel(
  expression: GhostExpression,
  _winkSide: WinkSide = 'any',
): string {
  switch (expression) {
    case 'ready':
      return 'Ghost ready';
    case 'running':
      return 'Ghost running';
    case 'looking':
      return 'Ghost looking shy';
    case 'leftWink':
      return 'Ghost right wink';
    case 'rightWink':
      return 'Ghost left wink';
    case 'resetFlash':
      return 'Ghost reset flash';
  }
}

export function GhostMascot({
  accessibilityLabel,
  expression,
  scale = 1,
  size = 'large',
  winkSide = 'any',
}: GhostMascotProps) {
  const [imageSource, setImageSource] = React.useState(() =>
    selectRandomMascotImage(expression),
  );
  const lastExpressionRef = React.useRef(expression);
  const mascotSize =
    Math.round(
      (size === 'large'
        ? arcadeTheme.dimensions.mascotLarge
        : arcadeTheme.dimensions.mascotMedium) * scale,
    );

  React.useEffect(() => {
    if (lastExpressionRef.current === expression) {
      return;
    }

    lastExpressionRef.current = expression;
    setImageSource(selectRandomMascotImage(expression));
  }, [expression]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ?? getGhostExpressionLabel(expression, winkSide)
      }
      style={[styles.stage, {height: mascotSize, width: mascotSize}]}>
      <Image
        fadeDuration={0}
        resizeMode="contain"
        source={imageSource}
        style={styles.image}
        testID="ghost-mascot-image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
