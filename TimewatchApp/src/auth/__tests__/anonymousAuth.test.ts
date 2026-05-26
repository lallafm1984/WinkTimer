import {getAuth, signInAnonymously} from '@react-native-firebase/auth';
import {ensureAnonymousUser} from '../anonymousAuth';

function getMockAuth() {
  return getAuth() as unknown as {
    currentUser: {uid: string; isAnonymous: boolean} | null;
  };
}

beforeEach(() => {
  getMockAuth().currentUser = null;
  jest.mocked(getAuth).mockClear();
  jest.mocked(signInAnonymously).mockClear();
});

test('returns the current anonymous Firebase user when one already exists', async () => {
  getMockAuth().currentUser = {
    uid: 'existing-user',
    isAnonymous: true,
  };

  await expect(ensureAnonymousUser()).resolves.toEqual({
    uid: 'existing-user',
    isAnonymous: true,
  });

  expect(signInAnonymously).not.toHaveBeenCalled();
});

test('signs in anonymously when there is no Firebase user yet', async () => {
  await expect(ensureAnonymousUser()).resolves.toEqual({
    uid: 'anonymous-test-user',
    isAnonymous: true,
  });

  expect(signInAnonymously).toHaveBeenCalledWith(getMockAuth());
});
