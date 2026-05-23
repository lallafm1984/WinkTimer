import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ModeCard} from '../ModeCard';

const actions = [
  {label: 'Start', value: 'Button'},
  {label: 'Pause', value: 'Look'},
  {label: 'Reset', value: 'Wink Hold'},
];

describe('ModeCard', () => {
  it('renders preset mode details', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ModeCard
          title="Look Pause"
          description="Stable default"
          actions={actions}
        />,
      );
    });

    expect(renderer!.root.findByProps({children: 'Look Pause'})).toBeTruthy();
    expect(
      renderer!.root.findByProps({children: 'Stable default'}),
    ).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Button'})).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({accessibilityRole: 'button'}),
    ).toHaveLength(0);
  });

  it('shows active and beta labels', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ModeCard
          title="Wink Control"
          description="Experimental wink-first mode"
          actions={actions}
          active
          beta
        />,
      );
    });

    expect(renderer!.root.findByProps({children: 'ACTIVE'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'BETA'})).toBeTruthy();
    expect(
      renderer!.root.findAll(
        node => node.props.accessibilityState?.selected === true,
      ),
    ).toHaveLength(0);
  });

  it('acts as a selectable card when an onPress handler is provided', async () => {
    const onPress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ModeCard
          title="Wink Start"
          description="Hands-free start"
          actions={actions}
          active
          onPress={onPress}
        />,
      );
    });

    const card = renderer!.root.findByProps({
      accessibilityLabel: 'Wink Start mode',
    });

    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityState).toEqual({selected: true});

    await ReactTestRenderer.act(() => {
      card.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
