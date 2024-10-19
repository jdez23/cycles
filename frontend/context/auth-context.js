import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { firebase } from "@react-native-firebase/auth";
import context from "./context";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

// Get Token/User from storage
const getToken = async () => {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
      return token;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
};

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
    case "notifications":
      return {
        notifications: action.payload,
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
  if ((token, username, user)) {
    dispatch({
      type: "signin",
      token: token,
      username: username,
      user: user,
    });
  }
};

const getCurrentUser = (dispatch) => async () => {
  const user = await SecureStore.getItemAsync("user_id");
  if (user) {
    dispatch({
      type: "currentUser",
      user_id: user,
    });
    return user;
  }
};

const completeSignUp = (dispatch) => async (token, user_name) => {
  try {
    const res = await axios.post(
      `${BACKEND_URL}/users/register/`,
      {
        token: token,
        username: user_name.toLowerCase(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    if (res.status === 201) {
      const response = res.data;
      SecureStore.setItemAsync("username", response?.username);
      SecureStore.setItemAsync("user_id", JSON.stringify(response?.id));
      SecureStore.setItemAsync("token", response?.firebase_id);
      SecureStore.setItemAsync("user", "true");
      dispatch({
        type: "signin",
        token: response?.firebase_id,
        user_id: JSON.stringify(response?.id),
        username: response?.username,
        user: "true",
      });
      return true;
    }
  } catch (error) {
    if (error.response.status === 400) {
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

const login = (dispatch) => async (token) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/users/login`, {
      params: {
        token: token,
      },
    });
    const data = res.data.data;
    if (data == "None") {
      dispatch({
        type: "signin",
        user: "false",
        token: token,
        user_id: "",
        username: "",
      });
    } else {
      SecureStore.setItemAsync("token", data.firebase_id);
      SecureStore.setItemAsync("user_id", data.id.toString());
      SecureStore.setItemAsync("username", data.username);
      SecureStore.setItemAsync("user", "true");
      dispatch({
        type: "signin",
        token: data.firebase_id,
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
    await dispatch({ type: "confirmation", payload: confirm });
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
    const token = res.user.uid;
    login(dispatch)(token);
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
    return null;
  }
};

const signout = (dispatch) => async () => {
  const token = await getToken();
  try {
    const res = await axios.delete(`${BACKEND_URL}/notifications/fcmToken/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    if (res.status === 200) {
      SecureStore.deleteItemAsync("token");
      SecureStore.deleteItemAsync("user_id");
      SecureStore.deleteItemAsync("username");
      SecureStore.deleteItemAsync("user");
      SecureStore.deleteItemAsync("fcmToken");
      dispatch({
        type: "signout",
        token: null,
        user_id: null,
        username: null,
        user: "false",
      });
      dispatch({
        type: "confirmation",
        payload: "",
      });
    }
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const deleteAccount = (dispatch) => async (user_id) => {
  const token = await getToken();
  try {
    await axios
      .delete(`${BACKEND_URL}/users/user/${user_id}/`, {
        headers: {
          Authorization: token,
        },
      })
      .then((res) => {
        if (res.status === 204) {
          SecureStore.deleteItemAsync("token");
          SecureStore.deleteItemAsync("user_id");
          SecureStore.deleteItemAsync("username");
          SecureStore.deleteItemAsync("user");
          SecureStore.deleteItemAsync("fcmToken");
          dispatch({
            type: "signout",
            token: null,
            user_id: null,
            username: null,
            user: "false",
          });
          dispatch({
            type: "confirmation",
            payload: "",
          });
        }
      });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

// Check if Spotify is authenticated
const isSpotifyAuth = (dispatch) => async () => {
  const token = await SecureStore.getItemAsync("token");
  try {
    const isAuth = await axios.get(`${BACKEND_URL}/spotify_api/token/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    dispatch({ type: "spotifyAuth", payload: JSON.stringify(isAuth.data) });
    return JSON.stringify(isAuth.data);
  } catch (e) {
    null;
  }
};

// Authenticate Spotify
const authSpotify = (dispatch) => async () => {
  const userToken = await SecureStore.getItemAsync("token");
  try {
    axios
      .get(`${BACKEND_URL}/spotify_api/get-auth-url/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: userToken,
        },
      })
      .then((res) => {
        let url = JSON.stringify(res.data);
        Linking.openURL(JSON.parse(url));
      });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

//Spotify Callback
const spotifyCallback = (dispatch) => async (code) => {
  const token = await SecureStore.getItemAsync("token");
  try {
    const tokenresponse = await axios.post(
      `${BACKEND_URL}/spotify_api/token-request/`,
      { code: code },
      {
        headers: {
          Authorization: token,
        },
      }
    );
    return tokenresponse.data;
  } catch (e) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const spotifyLogin = (dispatch) => async (data) => {
  const userToken = await SecureStore.getItemAsync("token");
  try {
    const res = await axios.post(
      `${BACKEND_URL}/spotify_api/spotify_login/`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: userToken,
        },
      }
    );
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
  // const userToken = await RNSInfo.getItem('token', {});
  const userToken = await SecureStore.getItemAsync("token");
  try {
    await axios
      .delete(`${BACKEND_URL}/spotify_api/spotify_logout/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: userToken,
        },
      })
      .then((res) => {
        dispatch({ type: "spotifyAuth", payload: res.data });
      });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

export const { Provider, Context } = context(
  authReducer,
  {
    tryLocalStorage,
    getCurrentUser,
    completeSignUp,
    // onAppleButtonPress,
    // onGoogleButtonPress,
    signInWithPhone,
    confirmNumber,
    signout,
    isSpotifyAuth,
    spotifyCallback,
    spotifyLogin,
    spotifyLogout,
    authSpotify,
    deleteAccount,
  },
  defaultValue
);
console;
