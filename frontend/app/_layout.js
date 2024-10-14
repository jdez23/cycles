import React, { useEffect, useState, useContext } from "react";
import { View, StatusBar, SafeAreaView, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
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
  // const [hasNavigated, setHasNavigated] = useState(false);
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const token = authContext?.state?.token;
  const username = authContext?.state?.username;
  const segments = useSegments();

  useEffect(() => {
    const initializeAuth = async () => {
      await authContext?.tryLocalStorage();
      setIsLoading(false);
    };
    initializeAuth();
  }, [authContext]);

  // REPLCE WITH THE STACK!!
  useEffect(() => {
    if (!isLoading) {
      if (!token) {
        router.replace("/(auth)/sign-in");
      } else if (token && !username) {
        router.replace("/onboard/on-board");
      } else {
        router.replace("(tabs)/home");
      }
    }
  }, [token, isLoading, username]);

  // Gets notif when phone/app is on
  useEffect(() => {
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        if (remoteMessage) {
          router.replace("notifs");
        }
      }
    );

    // Gets notif when phone/app is off
    const getInitialNotification = async () => {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        console.log("remote message", remoteMessage.notification);
      }
    };
    getInitialNotification();

    return () => unsubscribeOnNotificationOpened();
  }, [router]);

  if (isLoading) {
    return <View style={styles.loadingContainer}></View>;
  }

  return (
    <RootSiblingParent>
      <Slot>
        <SafeAreaView style={styles.root}>
          <StatusBar barStyle="light-content" />
        </SafeAreaView>
      </Slot>
    </RootSiblingParent>
  );
};

const RootLayout = () => {
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

export default RootLayout;

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
