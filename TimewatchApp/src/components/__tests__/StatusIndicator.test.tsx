import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text, View} from 'react-native';
import {StatusIndicator} from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders Korean text for the current detection status in text mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator mode="text" status="notLooking" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '집중 중')).toBe(true);
  });

  it('keeps minimal mode visually compact without a label', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator mode="minimal" status="looking" />,
      );
    });

    expect(renderer!.root.findAllByType(Text)).toHaveLength(0);
    expect(renderer!.root.findAllByType(View).length).toBeGreaterThan(0);
  });
});
