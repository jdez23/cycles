import { router } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-root-toast";
import { Context as AuthContext } from "../../context/auth-context";

const ProfileSettings = () => {
  const authContext = useContext(AuthContext);
  const params = useLocalSearchParams();
  const { user_id } = params;
  const [toast, setToast] = React.useState(null);
  const [loading, setLoading] = useState(false);

  const onBack = () => {
    router.back();
  };

  useEffect(() => {
    if (authContext?.state?.errorMessage) {
      setToast(
        Toast.show(authContext?.state?.errorMessage, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.CENTER,
          onHidden: () =>
            authContext?.dispatch({ type: "clear_error_message" }),
        })
      );
    } else if (toast) {
      Toast.hide(toast);
    }
  }, [authContext?.state?.errorMessage]);

  const onSignOut = async () => {
    setLoading(true);
    try {
      const res = await authContext.signout();
      if (res === 200) {
        setLoading(false);
      }
    } catch (e) {
      authContext?.dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
    setLoading(false);
  };

  const onDelete = () => {
    setLoading(true);
    try {
      const res = authContext.deleteAccount(user_id);
      if (res === 200) {
        setLoading(false);
      }
    } catch (e) {
      authContext?.dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
    setLoading(false);
  };

  const deleteProfileAlert = () =>
    Alert.alert(
      "Are you sure you want to delete your account?",
      "Action is not reversable",
      [
        {
          text: "Yes",
          onPress: () => onDelete(),
        },
        {
          text: "Cancel",
          onPress: () => null,
          style: "cancel",
        },
      ],
      {
        cancelable: true,
      }
    );

  return (
    <SafeAreaView
      style={StyleSheet.create({ backgroundColor: "#151515", flex: 1 })}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack}>
          <View
            style={{
              height: 50,
              width: 50,
              justifyContent: "center",
              paddingLeft: 6,
            }}
          >
            <Ionicons name="chevron-back" size={25} color={"white"} />
          </View>
        </TouchableOpacity>
        <Text style={styles.textUser}>Settings</Text>
        <View style={{ height: 50, width: 50 }} />
      </View>
      <View style={{ paddingHorizontal: 12 }}>
        <TouchableOpacity
          onPress={() => onSignOut()}
          style={{ paddingTop: 12 }}
        >
          <View
            style={{
              justifyContent: "space-between",
              height: 30,
              flexDirection: "row",
              alignItems: "center",
              borderBottomColor: "#262626",
            }}
          >
            <Text style={{ fontSize: 14, color: "white" }}>Log Out</Text>
            <Ionicons
              name="chevron-forward"
              style={{ color: "white", fontSize: 20 }}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={deleteProfileAlert}
          style={{ paddingTop: 12 }}
        >
          <View
            style={{
              justifyContent: "space-between",
              height: 30,
              flexDirection: "row",
              alignItems: "center",
              borderBottomColor: "#262626",
            }}
          >
            <Text style={{ fontSize: 14, color: "white" }}>Delete Account</Text>
            <Ionicons
              name="chevron-forward"
              style={{ color: "white", fontSize: 20 }}
            />
          </View>
        </TouchableOpacity>
      </View>
      {loading == true ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(12, 12, 12, 0.5)",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="small" />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#151515",
    height: 50,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.3,
    borderBottomColor: "#252525",
  },
  textUser: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
});

export default ProfileSettings;
