import React, { useContext, useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Image,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Context as AuthContext } from "../../context/auth-context";
import PhoneInput from "react-native-phone-number-input";
import Toast from "react-native-root-toast";
import cycleshuman_1 from "/Users/jessehernandez/Documents/DevProjects/cycles/frontend/assets/logos/cycles_human.png";

const SignIn = () => {
  const [country, setCountryCode] = useState("");
  const authContext = useContext(AuthContext);
  const [toast, setToast] = useState(null);
  const [continueDisabled, setContinueDisabled] = useState(true);
  const [number, setValue] = useState("");
  const numberInput = useRef(null);

  useEffect(() => {
    setContinueDisabled(number.length < 1);
  }, [number]);

  useEffect(() => {
    if (numberInput.current) {
      numberInput.current.focus();
    }
  }, []);

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
    authContext?.state?.confirmation
      ? router.push({
          pathname: "/(auth)/confirm-code",
          params: authContext?.state?.confirmation,
        })
      : null;
  }, [authContext?.state?.confirmation]);

  const onContinue = async () => {
    await authContext.signInWithPhone(country);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View
        style={{
          alignItems: "center",
          marginTop: 100,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "flex-end",
            marginBottom: 20,
          }}
        >
          <Text style={styles.cycles_text}>cycles</Text>
          <Image
            source={cycleshuman_1}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.text}>What's your phone number?</Text>
        <Text style={styles.smallPrint}>
          We'll send you a text to confirm it's you.
        </Text>
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <PhoneInput
            inputRef={numberInput}
            clearTextOnFocus={true}
            placeholder="Phone number"
            textInputProps={styles.numberInputProps}
            containerStyle={{
              height: 50,
              width: 350,
              borderRadius: 10,
              backgroundColor: "#333132",
            }}
            textInputStyle={{ color: "white" }}
            textContainerStyle={{
              backgroundColor: "#1f1f1f",
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
            }}
            codeTextStyle={{ color: "white" }}
            disableArrowIcon
            defaultValue={number}
            defaultCode="US"
            layout="second"
            onChangeText={(text) => {
              setValue(text.replace(/[^0-9]/g, ""));
            }}
            onChangeFormattedText={(text) => {
              setCountryCode(text);
            }}
            autoFocus
          />
        </View>
        <TouchableOpacity
          // disabled={continueDisabled}
          onPress={() => onContinue()}
        >
          <View
            style={
              continueDisabled == true
                ? styles.continueBoxEmpty
                : styles.continueBox
            }
          >
            <Text style={styles.continueText}>Continue</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    backgroundColor: "#151515",
    flex: 1,
  },
  text: {
    fontSize: 20,
    fontFamily: "futura",
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  logo: {
    maxWidth: 30,
    maxHeight: 25,
    tintColor: "#333333",
    marginTop: 16,
  },
  cycles_text: {
    fontSize: 38,
    fontFamily: "futura",
    fontWeight: "bold",
    color: "white",
  },
  smallPrint: {
    fontSize: 14,
    color: "grey",
    fontWeight: "bold",
    marginBottom: 32,
  },
  numberInputProps: {
    clearTextOnFocus: true,
    cursorColor: "white",
    placeholderTextColor: "grey",
    selectionColor: "white",
    textContentType: "telephoneNumber",
    keyboardType: "phone-pad",
    returnKeyType: "done",
    height: 50,
  },
  continueText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  continueBox: {
    backgroundColor: "#32D74B",
    width: 350,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
  continueBoxEmpty: {
    backgroundColor: "#1f1f1f",
    width: 350,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
});

export default SignIn;
