import React from "react";
import { Stack } from "expo-router";

const ScreensLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="comments"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="followers-list"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="following-list"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="playlist-screen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile-settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="spotify-playlist"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user-profile"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default ScreensLayout;
