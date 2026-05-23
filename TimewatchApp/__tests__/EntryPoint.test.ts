describe('entry point', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('registers the native app shell root', () => {
    const registerComponent = jest.fn();

    jest.doMock('react-native', () => ({
      AppRegistry: {
        registerComponent,
      },
    }));

    jest.doMock('../App', () => ({
      __esModule: true,
      default: function MockApp() {
        return null;
      },
    }));

    jest.isolateModules(() => {
      require('../index');
    });

    expect(registerComponent).toHaveBeenCalledWith(
      'TimewatchApp',
      expect.any(Function),
    );
    expect(registerComponent).toHaveBeenCalledTimes(1);
  });
});
