// import PushNotificationIOS from "@react-native-community/push-notification-ios";
import context from "./context";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const defaultValue = {
  errorMessage: "",
  notifCount: [0],
  notifications: [],
};

const notifReducer = (state, action) => {
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
    case "NOTIF_COUNT":
      return {
        ...state,
        notifCount: action.notifCount,
      };
    case "NOTIFICATIONS":
      if (action.append) {
        return {
          ...state,
          notifications: {
            ...action.notifications,
            results: [
              ...(state.notifications?.results || []),
              ...action.notifications.results,
            ],
          },
        };
      }
      return {
        ...state,
        notifications: action.notifications,
      };
    default:
      return state;
  }
};

const resetCount = (dispatch) => () => {
  try {
    dispatch({ type: "NOTIF_COUNT", notifCount: 0 });
    PushNotificationIOS.setApplicationIconBadgeNumber(0);
  } catch (err) {
    null;
  }
};

const notifBadge = (dispatch) => () => {
  try {
    const badge_num = PushNotificationIOS.getApplicationIconBadgeNumber();
    PushNotificationIOS.setApplicationIconBadgeNumber(+1);
    dispatch({ type: "NOTIF_COUNT", notifCount: +1 });
  } catch (err) {
    null;
  }
};

//Fetch current users notifications.
const getNotifications =
  (dispatch) =>
  async (nextPage = null) => {
    const token = await SecureStore.getItemAsync("token");
    try {
      const url = nextPage || `${BACKEND_URL}/notifications/message/`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      const notifications = res.data;

      // Dispatch action to handle notifications
      dispatch({
        type: "NOTIFICATIONS",
        notifications: notifications,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const deleteNotification = (dispatch) => async (id) => {
  const token = await SecureStore.getItemAsync("token");
  try {
    const res = await axios.delete(
      `${BACKEND_URL}/notifications/message/?id=${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    return res.status;
  } catch (error) {
    null;
  }
};

export const { Provider, Context } = context(
  notifReducer,
  {
    resetCount,
    notifBadge,
    getNotifications,
    deleteNotification,
  },
  defaultValue
);
