/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<App />);
    });

    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});
