import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  SafeAreaView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/FontAwesome";
import axios from "axios";
import Toast from "react-native-root-toast";
import { Context as AuthContext } from "../../../context/auth-context";
import { router, useLocalSearchParams, useSegments } from "expo-router";
import default_avi from "../../../assets/images/default_avi.jpg";
// import envs from '../../../Config/env';

// const BACKEND_URL = envs.PROD_URL;
const BACKEND_URL = "http://127.0.0.1:8000/";

const window = Dimensions.get("window").width;

const EditProfile = () => {
  const params = useLocalSearchParams();
  const segments = useSegments();
  const { avi_pic, name, username, bio, spotify_url, fromTab, userID } = params;
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [new_avi_pic, setAviPic] = useState(avi_pic);
  const [new_name, setName] = useState(name);
  const [new_username, setUsername] = useState(username);
  const [new_bio, setBio] = useState(bio);
  const [new_spotify_url, setSpotifyLink] = useState(spotify_url);
  const [toast, setToast] = useState(null);
  const getToken = async () => await SecureStore.getItemAsync("token");
  const getCurrentUser = async () => await SecureStore.getItemAsync("user_id");

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

  const pickAviImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAviPic(result.assets[0].uri);
    }
  };

  //Update Profile to API
  const updateProfile = async () => {
    setLoading(true);
    const currentUser = await getCurrentUser();
    const token = await getToken();
    const formData = new FormData();
    formData.append("avi_pic", {
      uri: new_avi_pic,
      type: "image/jpeg",
      name: new_avi_pic,
    });
    formData.append("name", new_name);
    formData.append("username", new_username);
    formData.append("bio", new_bio);
    formData.append("spotify_url", new_spotify_url ? new_spotify_url : "null");
    try {
      const res = await axios.put(
        `${BACKEND_URL}/users/user/${currentUser}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: token,
          },
        }
      );
      if (res.status === 200) {
        setLoading(false);
        router.back();
      }
    } catch (e) {
      authContext?.dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView
      style={StyleSheet.create({ backgroundColor: "#151515", flex: 1 })}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack}>
          <View
            style={{
              height: 50,
              width: 70,
              justifyContent: "center",
            }}
          >
            <Text style={styles.canceltext}>Cancel</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.textUser}>Edit Profile</Text>
        <TouchableOpacity onPress={() => updateProfile()}>
          <View
            style={{
              height: 50,
              width: 70,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          >
            <Text
              style={{
                color: "#0C8ECE",
                fontWeight: "500",
                fontSize: 14,
                paddingRight: 12,
              }}
            >
              Save
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <View>
        <View
          borderBottomWidth={0.5}
          borderBottomColor={"#1f1f1f"}
          style={{
            alignSelf: "center",
            justifyContent: "center",
            alignItems: "center",
            width: window,
            paddingVertical: 12,
          }}
        >
          <Pressable
            onPress={pickAviImage}
            style={{
              height: 94,
              width: 94,
              borderRadius: 50,
              alignSelf: "center",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View style={styles.imageContainer}>
              <Image
                style={styles.image}
                source={
                  new_avi_pic
                    ? { uri: new_avi_pic }
                    : avi_pic
                    ? avi_pic
                    : default_avi
                }
              />
              <Icon
                name="camera"
                size={12}
                color="white"
                style={styles.iconContainer}
              />
            </View>
          </Pressable>
          <Text style={{ color: "#0C8ECE", paddingVertical: 12 }}>
            Edit profile picture
          </Text>
        </View>
        <View style={{ paddingHorizontal: 12 }}>
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#1f1f1f",
              height: 60,
              justifyContent: "flex-start",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "500",
                fontSize: 14,
                width: 80,
                marginRight: 50,
              }}
            >
              Name:
            </Text>
            <TextInput
              style={{
                color: "white",
                fontSize: 14,
                width: 200,
              }}
              numberOfLines={1}
              value={new_name === "null" ? null : new_name}
              onChangeText={setName}
              placeholder={"Name"}
              placeholderTextColor={"grey"}
            ></TextInput>
          </View>
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#1f1f1f",
              height: 60,
              justifyContent: "flex-start",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "500",
                fontSize: 14,
                width: 80,
                marginRight: 50,
              }}
            >
              Username:
            </Text>
            <TextInput
              style={{ color: "white", fontSize: 14, width: 200 }}
              value={new_username === "null" ? null : new_username}
              numberOfLines={1}
              onChangeText={setUsername}
              placeholder={"Username"}
              placeholderTextColor={"grey"}
            ></TextInput>
          </View>
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#1f1f1f",
              height: 60,
              justifyContent: "flex-start",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "500",
                fontSize: 14,
                width: 80,
                marginRight: 50,
              }}
            >
              Bio:
            </Text>
            <TextInput
              style={{ color: "white", fontSize: 14, width: 200 }}
              value={new_bio === "null" ? null : new_bio}
              onChangeText={setBio}
              numberOfLines={1}
              placeholder={"Bio"}
              placeholderTextColor={"grey"}
            ></TextInput>
          </View>
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#1f1f1f",
              height: 60,
              justifyContent: "flex-start",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "500",
                fontSize: 14,
                width: 80,
                marginRight: 50,
              }}
            >
              Spotify Link:
            </Text>
            <TextInput
              style={{
                color: "white",
                fontSize: 14,
                width: 235,
              }}
              value={new_spotify_url === "null" ? null : new_spotify_url}
              onChangeText={setSpotifyLink}
              placeholder={"Spotify link"}
              numberOfLines={1}
              placeholderTextColor={"grey"}
            ></TextInput>
          </View>
        </View>
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
  },
  textUser: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    paddingHorizontal: 12,
  },
  canceltext: {
    fontSize: 14,
    fontWeight: "600",
    color: "lightgrey",
    paddingLeft: 12,
  },
  imageContainer: {
    height: 94,
    width: 94,
    borderRadius: 47, // Half of height and width to make it circular
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    position: "relative",
  },
  image: {
    height: 90,
    width: 90,
    borderRadius: 80, // Half of image height and width
    backgroundColor: "#1f1f1f",
  },
  iconContainer: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 80,
    padding: 5,
  },
});

export default EditProfile;
