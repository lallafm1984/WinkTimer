import React from 'react';
import {Image} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {GhostMascot, getGhostExpressionLabel} from '../GhostMascot';
import {
  allMascotImages,
  mascotImagePools,
  preloadMascotImages,
  resetMascotImagePreloadForTests,
  selectRandomMascotImage,
} from '../mascotImages';

describe('GhostMascot helpers', () => {
  it('labels the ready expression', () => {
    expect(getGhostExpressionLabel('ready')).toBe('Ghost ready');
  });

  it('labels left and right wink expressions separately', () => {
    expect(getGhostExpressionLabel('leftWink')).toBe('Ghost right wink');
    expect(getGhostExpressionLabel('rightWink')).toBe('Ghost left wink');
  });

  it('labels non-wink expression states', () => {
    expect(getGhostExpressionLabel('looking')).toBe('Ghost looking shy');
    expect(getGhostExpressionLabel('resetFlash')).toBe('Ghost reset flash');
  });
});

describe('GhostMascot', () => {
  it('renders an accessible mascot image', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<GhostMascot expression="looking" />);
    });

    expect(
      renderer!.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost looking shy',
      }),
    ).toBeTruthy();
    const image = renderer!.root.findByType(Image);

    expect(image.props.testID).toBe('ghost-mascot-image');
    expect(mascotImagePools.look).toContain(image.props.source);
  });

  it('renders a recognized left wink without any hold progress UI', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <GhostMascot expression="leftWink" />,
      );
    });

    expect(renderer!.root.findAllByProps({testID: 'ghost-hold-track'})).toHaveLength(0);
    expect(renderer!.root.findAllByProps({testID: 'ghost-hold-fill'})).toHaveLength(0);
    expect(
      renderer!.root.findByProps({
        accessibilityLabel: 'Ghost right wink',
      }),
    ).toBeTruthy();
    expect(mascotImagePools.wink).toContain(
      renderer!.root.findByType(Image).props.source,
    );
  });

  it('keeps the same image while the expression does not change', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<GhostMascot expression="ready" />);
    });

    const firstSource = renderer!.root.findByType(Image).props.source;

    await ReactTestRenderer.act(() => {
      renderer!.update(<GhostMascot expression="ready" />);
    });

    expect(renderer!.root.findByType(Image).props.source).toBe(firstSource);
  });

  it('selects images from the expected expression pools', () => {
    expect(selectRandomMascotImage('ready', () => 0)).toBe(
      mascotImagePools.idle[0],
    );
    expect(selectRandomMascotImage('looking', () => 0.99)).toBe(
      mascotImagePools.look[mascotImagePools.look.length - 1],
    );
    expect(selectRandomMascotImage('rightWink', () => 0)).toBe(
      mascotImagePools.wink[0],
    );
  });

  it('preloads every mascot image once for the first timer run', async () => {
    resetMascotImagePreloadForTests();
    const resolveAssetSource = jest
      .spyOn(Image, 'resolveAssetSource')
      .mockImplementation(source => ({
        height: 128,
        scale: 1,
        uri: `asset-${String(source)}`,
        width: 128,
      }));
    const prefetch = jest
      .spyOn(Image, 'prefetch')
      .mockResolvedValue(true);

    await preloadMascotImages();
    await preloadMascotImages();

    expect(resolveAssetSource).toHaveBeenCalledTimes(allMascotImages.length);
    expect(prefetch).toHaveBeenCalledTimes(allMascotImages.length);
    expect(prefetch).toHaveBeenCalledWith(expect.stringMatching(/^asset-/));
  });
});
