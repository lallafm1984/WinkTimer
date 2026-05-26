import {
  getAuth,
  signInAnonymously,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export type AnonymousAuthUser = {
  uid: string;
  isAnonymous: boolean;
};

function toAnonymousAuthUser(
  user: Pick<FirebaseAuthTypes.User, 'uid' | 'isAnonymous'>,
): AnonymousAuthUser {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
  };
}

export async function ensureAnonymousUser(): Promise<AnonymousAuthUser> {
  const auth = getAuth();

  if (auth.currentUser !== null) {
    return toAnonymousAuthUser(auth.currentUser);
  }

  const credential = await signInAnonymously(auth);

  return toAnonymousAuthUser(credential.user);
}
