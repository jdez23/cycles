import { router } from "expo-router";
import React, { useContext, useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Toast from "react-native-root-toast";
import { Context as AuthContext } from "../../context/auth-context";

const ConfirmCode = () => {
  const window = Dimensions.get("window").width;
  const params = useLocalSearchParams();
  const { number } = params;
  const [toast, setToast] = useState(null);
  const [code, setCode] = useState(Array(6).fill(""));
  const inputsRef = useRef([]);
  const authContext = useContext(AuthContext);
  const confirm = authContext.state.confirmation;

  const onConfirmNumber = (joinedCode) => {
    authContext?.confirmNumber(confirm, joinedCode);
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

  const handleChange = (text, index) => {
    if (/^\d+$/.test(text) || text === "") {
      // Allow only digits or empty
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (text !== "" && index < 6 - 1) {
        // Move to the next input if not the last
        inputsRef.current[index + 1].focus();
      }
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      // Move focus to the previous input
      inputsRef.current[index - 1].focus();
    }
  };

  const handleConfirmNumber = () => {
    const joinedCode = code.join("");
    onConfirmNumber(joinedCode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          justifyContent: "center",
          height: 50,
          width: window,
          borderBottomColor: "#232323",
          borderBottomWidth: 0.5,
        }}
      ></View>
      <View style={styles.body}>
        <View>
          <Text style={styles.text}>Enter 6-digit code</Text>
          <Text style={styles.text2}>
            Enter the code we just sent to your mobile number.
          </Text>
        </View>
        <View>
          <View style={styles.numContainer}>
            {Array(6)
              .fill()
              .map((_, index) => (
                <View key={index} style={styles.cellView}>
                  <TextInput
                    ref={(ref) => (inputsRef.current[index] = ref)}
                    maxLength={1}
                    returnKeyType="done"
                    keyboardType="number-pad"
                    style={styles.cellText}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    value={code[index]}
                    autoFocus={index === 0 ? true : false}
                    secureTextEntry={false}
                  />
                </View>
              ))}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleConfirmNumber()}
          disabled={code.join("").length !== 6}
        >
          <View
            style={
              code.join("").length === 6
                ? styles.continueBox
                : styles.continueBoxEmpty
            }
          >
            <Text style={styles.continueText}>Continue</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => authContext?.signInWithPhone(number)}>
          <Text style={{ color: "white" }}>Resend code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151515",
  },
  text: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  text2: {
    color: "lightgrey",
    fontSize: 12,
    fontWeight: "500",
    paddingTop: 8,
  },
  body: {
    // paddingTop: 12,
    height: 300,
    // backgroundColor: 'brown',
    justifyContent: "space-evenly",
    paddingHorizontal: 24,
  },
  numContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    // backgroundColor: 'yellow',
    height: 40,
  },
  cellView: {
    marginRight: 14,
    borderColor: "grey",
    width: 45,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1.5,
    // backgroundColor: 'green',
    height: 40,
  },
  cellText: {
    textAlign: "center",
    fontSize: 16,
    color: "white",
  },
  continueBox: {
    backgroundColor: "#32D74B",
    width: 350,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  continueBoxEmpty: {
    backgroundColor: "#1f1f1f",
    width: 350,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  continueText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ConfirmCode;
