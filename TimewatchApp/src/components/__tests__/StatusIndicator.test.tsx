import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {StatusIndicator} from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders looking status text in text mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="looking" mode="text" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === 'LOOK PAUSE')).toBe(
      true,
    );
  });

  it('hides label text in minimal mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="notLooking" mode="minimal" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.length).toBe(0);
  });

  it('sets a readable Korean accessibility label', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="unknown" mode="text" />,
      );
    });

    expect(
      renderer!.root.findByProps({
        accessibilityLabel: '\uAC10\uC9C0 \uC0C1\uD0DC: SCANNING',
      }),
    ).toBeTruthy();
  });
});
