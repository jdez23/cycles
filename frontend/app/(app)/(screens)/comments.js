import React, { useEffect, useContext, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import moment from "moment";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Context as AuthContext } from "../../../context/auth-context";
import { Context as PlaylistContext } from "../../../context/playlist-context";
import { TextInput } from "react-native-gesture-handler";
import Toast from "react-native-root-toast";
import Spotify_Icon_RGB_Green from "../../../assets/logos/Spotify_Icon_RGB_Green.png";
import { router, useLocalSearchParams } from "expo-router";
import default_avi from "../../../assets/images/default_avi.jpg";

const CommentsScreen = () => {
  const params = useLocalSearchParams();
  const {
    playlist_id,
    playlist_user_id,
    to_user,
    playlist_cover,
    playlist_url,
    playlist_title,
  } = params;
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState("");
  const window = Dimensions.get("window").width;
  const comments = playlistContext?.state?.comments?.results;
  const nextPage = playlistContext?.state?.comments?.next;

  useEffect(() => {
    if (playlistContext?.state?.errorMessage) {
      setToast(
        Toast.show(playlistContext?.state?.errorMessage, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.CENTER,
          onHidden: () =>
            playlistContext?.dispatch({ type: "clear_error_message" }),
        })
      );
    } else if (toast) {
      Toast.hide(toast);
    }
  }, [playlistContext?.state?.errorMessage]);

  // Call to get playlist' comments
  useEffect(() => {
    authContext?.getCurrentUser();
    playlistContext?.getComments(playlist_id);
  }, [authContext?.state.token]);

  const onBack = () => {
    router.back();
  };

  const wait = (timeout) => {
    // Defined the timeout function for testing purpose
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const loadMorePlaylists = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getComments(nextPage, playlist_id);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setLoadingData(true);
    playlistContext?.getComments(playlist_id);
    loadingData == true ? (
      <View
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
        }}
      >
        <ActivityIndicator color="white" size="large" />
      </View>
    ) : null;
    wait(2000).then(() => setIsRefreshing(false), setLoadingData(false));
  };

  const onComment = async (title) => {
    setTitle("");
    playlistContext?.comment({
      playlist_id: playlist_id,
      to_user: to_user,
      title: title,
    });
    playlistContext?.getComments(playlist_id);
  };

  const onPlaylist = async () => {
    router.push({
      pathname: "Playlist",
      params: { playlist_id: playlist_id },
    });
  };

  const onDelete = (item) => {
    playlistContext?.deleteComment(item.id);
    playlistContext?.getComments(playlist_id);
  };

  //Navigate to user profile
  const onUserPic = async (item) => {
    router.push({
      pathname: "ProfileScreen",
      params: { userID: item?.user, playlist_id: item?.playlist },
    });
  };

  const rightSwipeActions = (item) => {
    return (
      <Pressable
        onPress={() => onDelete(item)}
        style={{
          backgroundColor: "red",
          justifyContent: "center",
          alignItems: "flex-end",
        }}
      >
        <Text
          style={{
            color: "white",
            marginHorizontal: 20,
            fontWeight: "600",
          }}
        >
          Delete
        </Text>
      </Pressable>
    );
  };

  // Render comments
  _renderItem = ({ item }) => (
    <View>
      {playlist_user_id == authContext?.state.user_id ||
      item.user == authContext?.state.user_id ? (
        <Swipeable renderRightActions={() => rightSwipeActions(item)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              width: window,
              paddingLeft: 12,
              backgroundColor: "#151515",
              paddingVertical: 12,
            }}
          >
            <Pressable
              onPress={() => onUserPic(item)}
              style={{
                height: 35,
                width: 35,
                borderRadius: 30,
                backgroundColor: "#151515",
              }}
            >
              <Image
                style={{
                  height: 35,
                  width: 35,
                  borderRadius: 30,
                  backgroundColor: "#1f1f1f",
                }}
                source={item?.avi_pic ? { uri: item?.avi_pic } : default_avi}
              />
            </Pressable>
            <View
              style={{
                flexDirection: "column",
                justifyContent: "center",
                height: 35,
                maxWidth: window - 80,
                marginHorizontal: 10,
                paddingTop: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {item?.username ? (
                  <Pressable onPress={() => onUserPic(item)}>
                    <Text
                      numberOfLines={1}
                      style={{
                        textAlign: "left",
                        color: "white",
                        fontSize: 13,
                        fontWeight: "500",
                      }}
                    >
                      {item?.username}
                    </Text>
                  </Pressable>
                ) : null}
                {item?.date ? (
                  <Text
                    style={{
                      color: "lightgrey",
                      fontSize: 11,
                      marginLeft: 6,
                    }}
                  >
                    {moment(item?.date).fromNow()}
                  </Text>
                ) : null}
              </View>
              {item?.title ? (
                <Text
                  style={{
                    textAlign: "left",
                    color: "lightgrey",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {item?.title}
                </Text>
              ) : null}
            </View>
          </View>
        </Swipeable>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: window,
            marginTop: 10,
            marginBottom: 10,
            paddingLeft: 12,
          }}
        >
          {item?.avi_pic ? (
            <Pressable
              onPress={() => onUserPic(item)}
              style={{
                height: 35,
                width: 35,
                borderRadius: 30,
                backgroundColor: "#151515",
              }}
            >
              <Image
                style={{
                  height: 35,
                  width: 35,
                  borderRadius: 30,
                  backgroundColor: "#121212",
                }}
                source={{ uri: item?.avi_pic }}
              />
            </Pressable>
          ) : null}
          <View
            style={{
              flexDirection: "column",
              justifyContent: "flex-start",
              height: 35,
              maxWidth: window - 80,
              marginHorizontal: 10,
              paddingTop: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {item?.username ? (
                <Pressable onPress={() => onUserPic(item)}>
                  <Text
                    numberOfLines={1}
                    style={{
                      textAlign: "left",
                      color: "white",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {item?.username}
                  </Text>
                </Pressable>
              ) : null}
              {item?.date ? (
                <Text
                  style={{
                    color: "lightgrey",
                    fontSize: 11,
                    fontWeight: "500",
                    marginLeft: 6,
                  }}
                >
                  {moment(item?.date).fromNow()}
                </Text>
              ) : null}
            </View>
            {item?.title ? (
              <Text
                style={{
                  textAlign: "left",
                  color: "lightgrey",
                  fontSize: 13,
                  fontWeight: "500",
                  marginTop: 2,
                }}
              >
                {item?.title}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: "#151515" }}
      keyboardVerticalOffset={47}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={{ backgroundColor: "#151515", flex: 1 }}>
        <View style={styles.container}>
          <Pressable onPress={onBack}>
            <View style={styles.back}>
              <Ionicons name="chevron-back" size={25} color={"white"} />
            </View>
          </Pressable>
          <Text style={{ fontWeight: "600", fontSize: 15, color: "white" }}>
            Comments
          </Text>
          <View style={{ height: 50, width: 50 }} />
        </View>
        <View
          style={{
            width: window,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: "#1f1f1f",
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", width: 300 }}>
            {!playlist_cover ? null : (
              <Image
                style={{
                  height: 60,
                  width: 60,
                  resizeMode: "cover",
                  backgroundColor: "#1f1f1f",
                }}
                source={{ uri: playlist_cover }}
              />
            )}
            <View
              style={{
                flexDirection: "column",
                paddingLeft: 10,
                justifyContent: "center",
              }}
            >
              <TouchableOpacity onPress={() => onPlaylist()}>
                <Text style={{ color: "white", fontSize: 12 }}>
                  {playlist_title}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: "lightgrey", fontSize: 12, paddingTop: 2 }}>
                playlist
              </Text>
            </View>
          </View>
          {playlist_url ? (
            <Pressable onPress={() => Linking.openURL(playlist_url)}>
              <View
                style={{
                  height: 25,
                  width: 25,
                  borderRadius: 30,
                  backgroundColor: "#1f1f1f",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  style={{ width: 15, height: 15 }}
                  source={Spotify_Icon_RGB_Green}
                />
              </View>
            </Pressable>
          ) : null}
        </View>
        <FlatList
          data={comments}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          initialNumToRender={10}
          renderItem={_renderItem}
          onEndReached={loadMorePlaylists}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        ></FlatList>
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 0.5,
            borderTopColor: "#121212",
            paddingHorizontal: 12,
            height: "auto",
            paddingVertical: 12,
            minHeight: 75,
          }}
        >
          <TextInput
            multiline={true}
            keyboardType="default"
            style={{
              color: "white",
              height: "auto",
              minHeight: 45,
              flex: 1,
              borderWidth: 1,
              borderRadius: 30,
              borderColor: "#121212",
              paddingHorizontal: 12,
              paddingVertical: 12,
              alignSelf: "center",
              paddingTop: 13,
            }}
            placeholderTextColor={"grey"}
            value={title}
            placeholder="Comment..."
            onChangeText={setTitle}
          ></TextInput>
          <TouchableOpacity
            disabled={title.length < 1}
            onPress={() => onComment(title)}
            style={{
              height: 45,
              width: 60,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "flex-end",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: title.length > 0 ? "#0C8ECE" : "grey",
              }}
            >
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
    flexDirection: "row",
    borderBottomColor: "#121212",
    borderBottomWidth: 0.5,
  },
  inboxtext: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  back: {
    height: 50,
    width: 50,
    justifyContent: "center",
    paddingLeft: 12,
  },
  loadingContainer: {
    paddingTop: 30,
    paddingBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CommentsScreen;
