import { firebase } from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";

/**
 * Returns a valid Firebase ID token (JWT).
 * Uses the current Firebase session to auto-refresh if the stored token
 * has expired (Firebase ID tokens expire after 1 hour).
 * Falls back to the SecureStore value if no active Firebase session exists.
 */
export const getValidToken = async () => {
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    return currentUser.getIdToken();
  }
  return SecureStore.getItemAsync("token");
};
