import messaging from "@react-native-firebase/messaging";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
// import envs from '../../Config/env';

const getToken = async () => await SecureStore.getItemAsync("token", {});

// const BACKEND_URL = envs.PROD_URL;
const BACKEND_URL = "http://127.0.0.1:8000";

export async function requestUserPermission() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      getFcmToken();
    }
  } catch (e) {
    null;
  }
}

const getFcmToken = async () => {
  const token = await getToken();
  try {
    messaging()
      .getToken()
      .then((fcmToken) => {
        try {
          axios.post(
            `${BACKEND_URL}/notifications/fcmToken/`,
            { token: fcmToken },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
            }
          );
        } catch (error) {
          null;
        }
      });
  } catch (error) {
    null;
  }
};
