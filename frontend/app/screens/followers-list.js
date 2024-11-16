import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  SafeAreaView,
  Pressable,
  Dimensions,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Context as AuthContext } from "../../context/auth-context";
import { Context as PlaylistContext } from "../../context/playlist-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-root-toast";
import { router, useLocalSearchParams } from "expo-router";
import default_avi from "../../assets/images/default_avi.jpg";

const window = Dimensions.get("window").width;

const FollowersList = () => {
  const params = useLocalSearchParams();
  const { user_id, id } = params;
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);
  const followers = playlistContext?.state?.followers?.results;
  const nextPage = playlistContext?.state?.followers?.next;

  useEffect(() => {
    if (authContext?.state?.errorMessage) {
      setToast(
        Toast.show(playlistContext?.state?.errorMessage, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.TOP,
          onHidden: () => dispatch({ type: "clear_error_message" }),
        })
      );
    } else if (toast) {
      Toast.hide(toast);
    }
  }, [authContext?.state?.errorMessage]);

  // Call to get list of followers
  useEffect(() => {
    playlistContext?.getFollowers(user_id || id);
  }, [authContext?.state?.token]);

  const wait = (timeout) => {
    // Defined the timeout function for testing purpose
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setLoadingData(true);
    playlistContext?.getFollowers(id || user_id, nextPage);
    loadingData == true ? (
      <View
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
        }}
      >
        <ActivityIndicator color={"white"} size="large" />
      </View>
    ) : null;
    wait(2000).then(() => setIsRefreshing(false), setLoadingData(false));
  };

  const onBack = () => {
    router.back();
  };

  //Navigate to user profile
  const onUser = async (item) => {
    router.push({ pathname: "./user-profile", params: { userID: item.user } });
  };

  const loadMore = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getFollowers(to_user, nextPage);
      setLoading(false);
    }
  };

  // Render followers
  _renderItem = ({ item }) => (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 55,
        width: window,
        marginTop: 10,
        paddingHorizontal: 12,
        justifyContent: "space-between",
      }}
      onPress={() => onUser(item)}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 40,
          width: 40,
          backgroundColor: "#1f1f1f",
          borderRadius: 30,
        }}
      >
        <Image
          style={{ height: 40, width: 40, borderRadius: 40 }}
          source={item.avi_pic ? { uri: item.avi_pic } : default_avi}
        />
        <View
          style={{
            flexDirection: "column",
            marginLeft: 10,
            width: 200,
            justifyContent: "center",
          }}
        >
          {item.username ? (
            <Text
              numberOfLines={1}
              style={{
                textAlign: "left",
                color: "white",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {item.username}
            </Text>
          ) : null}
          {item.name ? (
            <Text
              numberOfLines={1}
              style={{
                textAlign: "left",
                marginTop: 1,
                color: "lightgrey",
                fontSize: 13,
              }}
            >
              {item.name}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={23} color={"white"} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111111" }}>
      <View style={styles.container} blurRadius={1}>
        <Pressable onPress={onBack}>
          <View style={{ height: 40, width: 40, justifyContent: "center" }}>
            <Ionicons name="chevron-back" size={25} color={"white"} />
          </View>
        </Pressable>
        <Text style={styles.textUser}>Followers</Text>
        <View style={{ height: 40, width: 40 }} />
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          data={followers}
          renderItem={_renderItem}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          initialNumToRender={10}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        ></FlatList>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111111",
    height: 50,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomColor: "#232323",
    borderBottomWidth: 0.3,
  },
  inboxtext: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  textUser: {
    fontSize: 14,
    color: "white",
    fontWeight: "bold",
  },
});

export default FollowersList;
