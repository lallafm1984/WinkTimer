import {Image, type ImageSourcePropType} from 'react-native';

export type GhostExpression =
  | 'ready'
  | 'running'
  | 'looking'
  | 'leftWink'
  | 'rightWink'
  | 'resetFlash';

export type MascotImageGroup = 'idle' | 'look' | 'wink';

export const mascotImagePools: Record<
  MascotImageGroup,
  readonly ImageSourcePropType[]
> = {
  idle: [
    require('../assets/characters/idle_1.png'),
    require('../assets/characters/idle_2.png'),
    require('../assets/characters/idle_3.png'),
  ],
  look: [
    require('../assets/characters/look_1.png'),
    require('../assets/characters/look_2.png'),
    require('../assets/characters/look_3.png'),
    require('../assets/characters/look_5.png'),
  ],
  wink: [
    require('../assets/characters/wink_1.png'),
    require('../assets/characters/wink_2.png'),
    require('../assets/characters/wink_3.png'),
    require('../assets/characters/wink_4.png'),
  ],
};

export const allMascotImages = Object.values(mascotImagePools).flat();

let mascotImagesPreloadPromise: Promise<void> | null = null;

export function preloadMascotImages(): Promise<void> {
  if (mascotImagesPreloadPromise === null) {
    mascotImagesPreloadPromise = Promise.all(
      allMascotImages.map(source => {
        const resolvedSource = Image.resolveAssetSource(source);

        if (!resolvedSource?.uri) {
          return Promise.resolve(false);
        }

        return Image.prefetch(resolvedSource.uri).catch(() => false);
      }),
    ).then(() => undefined);
  }

  return mascotImagesPreloadPromise;
}

export function resetMascotImagePreloadForTests() {
  mascotImagesPreloadPromise = null;
}

export function getMascotImageGroupForExpression(
  expression: GhostExpression,
): MascotImageGroup {
  switch (expression) {
    case 'running':
    case 'looking':
      return 'look';
    case 'leftWink':
    case 'rightWink':
      return 'wink';
    case 'ready':
    case 'resetFlash':
      return 'idle';
  }
}

export function selectRandomMascotImage(
  expression: GhostExpression,
  random: () => number = Math.random,
): ImageSourcePropType {
  const group = getMascotImageGroupForExpression(expression);
  const pool = mascotImagePools[group];
  const imageIndex = Math.min(
    pool.length - 1,
    Math.floor(random() * pool.length),
  );

  return pool[imageIndex];
}
