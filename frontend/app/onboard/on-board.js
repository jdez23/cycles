import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Context as AuthContext } from "../../context/auth-context";
import Toast from "react-native-root-toast";
import { router } from "expo-router";

const onBoard = () => {
  const authContext = useContext(AuthContext);
  const token = authContext.state.token;
  const [user_name, setUsername] = useState("");
  const [toast, setToast] = useState(null);
  let usernameInput = useRef(null);
  const inputLength = 30;
  const continueDisabled = user_name.length < 4;

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

  useEffect(() => {
    usernameInput.current.focus();
  }, []);

  const completeProfile = () => {
    authContext?.completeSignUp(token, user_name);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.mainView}>
        <Text style={styles.text}>Complete your profile</Text>
        <View style={styles.form_container}>
          <View
            style={{
              backgroundColor: "#1f1f1f",
              width: 350,
              height: 45,
              borderRadius: 10,
              fontSize: 14,
              justifyContent: "center",
            }}
          >
            <TextInput
              ref={usernameInput}
              selectionColor={"white"}
              maxLength={inputLength}
              style={{ color: "white", left: 12 }}
              placeholderTextColor={"lightgrey"}
              value={user_name}
              placeholder="Username:"
              clearTextOnFocus={true}
              onChangeText={setUsername}
            />
          </View>
          {authContext?.state?.username_error ? (
            <Text
              style={{
                fontSize: 13,
                color: "red",
                top: 4,
                alignSelf: "flex-start",
              }}
            >
              {authContext?.state?.username_error}
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            disabled={continueDisabled}
            onPress={() => completeProfile()}
            style={
              continueDisabled
                ? styles.continue_botton_disabled
                : styles.button_container
            }
          >
            <Text style={styles.button_text}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#111111",
    flex: 1,
  },
  mainView: {
    marginTop: 30,
    alignItems: "center",
  },
  form_container: {
    alignItems: "center",
    marginTop: 30,
  },
  text: {
    fontSize: 20,
    color: "white",
    fontWeight: "600",
  },
  button_container: {
    backgroundColor: "#32D74B",
    width: 350,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  continue_botton_disabled: {
    backgroundColor: "#1f1f1f",
    width: 350,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  button_text: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default onBoard;
