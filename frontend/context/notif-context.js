import * as Notifications from "expo-notifications";
import api from "../utils/api";
import context from "./context";

const defaultValue = {
  errorMessage: "",
  notifCount: 0,
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
              ...(action.notifications?.results || []),
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

const resetCount = (dispatch) => async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
    dispatch({ type: "NOTIF_COUNT", notifCount: 0 });
  } catch (err) {
    // Ignore — badge updates are best-effort
  }
};

const notifBadge = (dispatch) => async (currentCount) => {
  try {
    const newCount = (currentCount || 0) + 1;
    await Notifications.setBadgeCountAsync(newCount);
    dispatch({ type: "NOTIF_COUNT", notifCount: newCount });
  } catch (err) {
    // Ignore
  }
};

const getNotifications =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const url = nextPage || "/notifications/message/";
      const res = await api.get(url);
      dispatch({
        type: "NOTIFICATIONS",
        notifications: res.data,
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
  try {
    const res = await api.delete(`/notifications/message/?id=${id}`);
    return res.status;
  } catch (error) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
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
