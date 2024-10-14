import React from "react";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";

const AppEntry = () => {
  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(screens)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default AppEntry;
