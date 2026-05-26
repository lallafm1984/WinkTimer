import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';
import {allMascotImages} from './mascotImages';

export function MascotImageCache() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.cache}
      testID="mascot-image-cache">
      {allMascotImages.map((source, index) => (
        <Image
          fadeDuration={0}
          key={index}
          resizeMode="contain"
          source={source}
          style={styles.image}
          testID="mascot-image-cache-image"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cache: {
    height: arcadeTheme.dimensions.mascotLarge,
    left: -10000,
    opacity: 0,
    position: 'absolute',
    top: -10000,
    width: arcadeTheme.dimensions.mascotLarge,
  },
  image: {
    height: arcadeTheme.dimensions.mascotLarge,
    position: 'absolute',
    width: arcadeTheme.dimensions.mascotLarge,
  },
});
