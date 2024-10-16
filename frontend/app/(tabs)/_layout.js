import { View, ActivityIndicator } from "react-native";
import React, { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Octicons from "@expo/vector-icons/Octicons";
import { requestUserPermission } from "../../firebase/notifications";

const TabsLayout = () => {
  SplashScreen.preventAutoHideAsync();

  useEffect(() => {
    SplashScreen.hideAsync();
    requestUserPermission();
  }, []);

  return (
    <Tabs backBehavior="history">
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopWidth: 0.2,
            borderTopColor: "#202020",
          },
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={focused ? 28 : 27}
              color={focused ? "white" : "lightgrey"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopWidth: 0.2,
            borderTopColor: "#202020",
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={focused ? 28 : 27}
              color={focused ? "white" : "lightgrey"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="new_playlist"
        options={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopWidth: 0.2,
            borderTopColor: "#202020",
          },
          tabBarIcon: ({ color, focused }) => (
            <Octicons name="plus" size={27} color={"lightgrey"} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifs"
        options={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopWidth: 0.2,
            borderTopColor: "#202020",
          },
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={focused ? 28 : 27}
                color={focused ? "white" : "lightgrey"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarShowLabel: false,
          headerShown: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "grey",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopWidth: 0.2,
            borderTopColor: "#202020",
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={focused ? 30 : 29}
              color={focused ? "white" : "lightgrey"}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
