import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import { firebase } from "@react-native-firebase/auth";
import api from "../utils/api";
import context from "./context";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const defaultValue = {
  user: "false",
  token: "",
  username: "",
  user_id: "",
  spotifyAuth: "false",
  errorMessage: "",
  username_error: "",
  confirmation: "",
  code: "",
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "error_1":
      return {
        ...state,
        errorMessage: action.payload,
      };
    case "clear_error_message":
      return {
        ...state,
        errorMessage: "",
      };
    case "username_error":
      return {
        ...state,
        username_error: action.username_error,
      };
    case "confirmation":
      return {
        ...state,
        errorMessage: "",
        confirmation: action.payload,
      };
    case "code":
      return {
        ...state,
        errorMessage: "",
        code: action.payload,
      };
    case "signin":
      return {
        ...state,
        token: action.token,
        username: action.username,
        user_id: action.user_id,
        user: action.user,
      };
    case "signout":
      return {
        ...state,
        token: null,
        username: null,
        user_id: null,
        user: "false",
      };
    case "spotifyAuth":
      return {
        ...state,
        spotifyAuth: action.payload,
      };
    case "currentUser":
      return {
        ...state,
        user_id: action.user_id,
      };
    default:
      return state;
  }
};

const tryLocalStorage = (dispatch) => async () => {
  const token = await SecureStore.getItemAsync("token");
  const username = await SecureStore.getItemAsync("username");
  const user = await SecureStore.getItemAsync("user");
  const user_id = await SecureStore.getItemAsync("user_id");
  if (token && username && user) {
    dispatch({
      type: "signin",
      token,
      username,
      user,
      user_id: user_id || "",
    });
  }
};

const getCurrentUser = (dispatch) => async () => {
  const user_id = await SecureStore.getItemAsync("user_id");
  if (user_id) {
    dispatch({ type: "currentUser", user_id });
    return user_id;
  }
};

const setError = (dispatch) => (message) => {
  dispatch({ type: "error_1", payload: message });
};

const completeSignUp = (dispatch) => async (uid, username) => {
  try {
    const res = await api.post("/users/register/", {
      token: uid,
      username: username.toLowerCase(),
    });
    if (res.status === 201) {
      const response = res.data;
      // Get the real Firebase ID token (JWT) for authenticated API calls
      const idToken = await firebase.auth().currentUser?.getIdToken();
      const storedToken = idToken || response.firebase_id;
      await Promise.all([
        SecureStore.setItemAsync("username", response.username),
        SecureStore.setItemAsync("user_id", JSON.stringify(response.id)),
        SecureStore.setItemAsync("token", storedToken),
        SecureStore.setItemAsync("user", "true"),
      ]);
      dispatch({
        type: "signin",
        token: storedToken,
        user_id: JSON.stringify(response.id),
        username: response.username,
        user: "true",
      });
      return true;
    }
  } catch (error) {
    if (error.response?.status === 400) {
      dispatch({
        type: "username_error",
        username_error: "Username is already taken.",
      });
    } else {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  }
};

// uid: Firebase UID for user lookup; idToken: Firebase ID token JWT for auth
const login = (dispatch) => async (uid, idToken) => {
  try {
    const res = await api.get("/users/login/", { params: { token: uid } });
    const data = res.data.data;
    if (data === "None") {
      dispatch({
        type: "signin",
        user: "false",
        token: idToken,
        user_id: "",
        username: "",
      });
    } else {
      // Always store the real ID token, not the firebase_id (UID)
      await Promise.all([
        SecureStore.setItemAsync("token", idToken),
        SecureStore.setItemAsync("user_id", data.id.toString()),
        SecureStore.setItemAsync("username", data.username),
        SecureStore.setItemAsync("user", "true"),
      ]);
      dispatch({
        type: "signin",
        token: idToken,
        user_id: data.id.toString(),
        username: data.username,
        user: "true",
      });
    }
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const signInWithPhone = (dispatch) => async (data) => {
  try {
    const confirm = await firebase.auth().signInWithPhoneNumber(data);
    dispatch({ type: "confirmation", payload: confirm });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const confirmNumber = (dispatch) => async (confirm, code) => {
  try {
    const res = await confirm.confirm(code);
    // Get the real Firebase ID token JWT — NOT just the UID
    const idToken = await res.user.getIdToken();
    const uid = res.user.uid;
    login(dispatch)(uid, idToken);
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
    return null;
  }
};

const signout = (dispatch) => async () => {
  // Clear local state regardless of network outcome
  await Promise.all([
    SecureStore.deleteItemAsync("user_id"),
    SecureStore.deleteItemAsync("username"),
    SecureStore.deleteItemAsync("user"),
    SecureStore.deleteItemAsync("fcmToken"),
    SecureStore.deleteItemAsync("token"),
  ]);
  dispatch({
    type: "signout",
    user_id: null,
    username: null,
    user: "false",
    token: null,
  });
  dispatch({ type: "confirmation", payload: "" });

  // Best-effort FCM token cleanup — don't block logout on this
  try {
    await api.delete("/notifications/fcm-token/");
  } catch (_err) {
    // Ignore — token will expire naturally
  }
};

const deleteAccount = (dispatch) => async (user_id) => {
  try {
    const res = await api.delete(`/users/user/${user_id}/`);
    if (res.status === 204) {
      await Promise.all([
        SecureStore.deleteItemAsync("token"),
        SecureStore.deleteItemAsync("user_id"),
        SecureStore.deleteItemAsync("username"),
        SecureStore.deleteItemAsync("user"),
        SecureStore.deleteItemAsync("fcmToken"),
      ]);
      dispatch({
        type: "signout",
        token: null,
        user_id: null,
        username: null,
        user: "false",
      });
      dispatch({ type: "confirmation", payload: "" });
    }
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const isSpotifyAuth = (dispatch) => async () => {
  try {
    const res = await api.get("/spotify-api/token/");
    const value = JSON.stringify(res.data);
    dispatch({ type: "spotifyAuth", payload: value });
    return value;
  } catch (e) {
    return null;
  }
};

const authSpotify = (dispatch) => async () => {
  try {
    const res = await api.get("/spotify-api/get-auth-url/");
    Linking.openURL(res.data);
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const spotifyCallback = (dispatch) => async (code) => {
  try {
    const res = await api.post("/spotify-api/token-request/", { code });
    return res.data;
  } catch (e) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const spotifyLogin = (dispatch) => async (data) => {
  try {
    const res = await api.post("/spotify-api/spotify-login/", data);
    dispatch({ type: "spotifyAuth", payload: res.data });
    return res.data;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const spotifyLogout = (dispatch) => async () => {
  try {
    const res = await api.delete("/spotify-api/spotify-logout/");
    dispatch({ type: "spotifyAuth", payload: res.data });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const getDeveloperToken = (dispatch) => async () => {
  try {
    const res = await api.get("/apple-music/developer-token/");
    return res.data.developer_token;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
    return null;
  }
};

export const { Provider, Context } = context(
  authReducer,
  {
    tryLocalStorage,
    getCurrentUser,
    setError,
    completeSignUp,
    signInWithPhone,
    confirmNumber,
    signout,
    isSpotifyAuth,
    spotifyCallback,
    spotifyLogin,
    spotifyLogout,
    authSpotify,
    deleteAccount,
    getDeveloperToken,
  },
  defaultValue
);
