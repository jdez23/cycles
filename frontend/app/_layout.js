import React, { useEffect, useState, useContext } from "react";
import { View, StatusBar, SafeAreaView, StyleSheet } from "react-native";
import { Stack, Slot, useRouter } from "expo-router";
import { RootSiblingParent } from "react-native-root-siblings";
import { Provider as PlaylistProvider } from "../context/playlist-context";
import { Provider as NotifProvider } from "../context/notif-context";
import messaging from "@react-native-firebase/messaging";
import {
  Provider as AuthProvider,
  Context as AuthContext,
} from "../context/auth-context";

const MainLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const token = authContext?.state?.token;
  const username = authContext?.state?.username;

  useEffect(() => {
    const initializeAuth = async () => {
      await authContext?.tryLocalStorage();
      setIsLoading(false);
    };
    initializeAuth();
  }, [authContext]);

  useEffect(() => {
    if (!isLoading) {
      if (!token) {
        router.replace("/sign-in");
      } else if (token && !username) {
        router.replace("/onboard/on-board");
      } else {
        router.replace("/home");
      }
    }
  }, [token, isLoading, username]);

  // Gets notif when phone/app is on
  useEffect(() => {
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        if (remoteMessage) {
          router.replace("/notifs");
        }
      }
    );

    // Gets notif when phone/app is off
    const getInitialNotification = async () => {
      await messaging().getInitialNotification();
    };
    getInitialNotification();

    return () => unsubscribeOnNotificationOpened();
  }, [router]);

  if (isLoading) {
    return <View style={styles.loadingContainer}></View>;
  }

  return (
    <RootSiblingParent>
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="screens" options={{ headerShown: false }} />
      </Stack>
    </RootSiblingParent>
  );
};

export default RootLayout = () => {
  return (
    <AuthProvider>
      <NotifProvider>
        <PlaylistProvider>
          <MainLayout />
        </PlaylistProvider>
      </NotifProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#111111",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111111",
  },
});
