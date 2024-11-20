import React, { useEffect, useState, useContext, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Image,
  Text,
  Pressable,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Linking,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ActionSheet from "react-native-actionsheet";
import Header from "../../components/header";
import Toast from "react-native-root-toast";
import moment from "moment";
import * as SecureStore from "expo-secure-store";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { router } from "expo-router";
import default_avi from "../../assets/images/default_avi.jpg";
import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";

const windowWidth = Dimensions.get("window").width;

const FollowingFeed = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const actionSheet = useRef();
  const playlistContext = useContext(PlaylistContext);
  const playlists = playlistContext?.state?.followingPlaylists?.results;
  const nextPage = playlistContext?.state?.followingPlaylists?.next;

  useEffect(() => {
    const fetchData = async () => {
      await playlistContext?.getFollowersPlaylists();
      setIsCheckingData(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (playlistContext?.state?.errorMessage) {
      Toast.show(playlistContext?.state?.errorMessage, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
        onHidden: () =>
          playlistContext?.dispatch({ type: "clear_error_message" }),
      });
    }
  }, [playlistContext?.state?.errorMessage]);

  const onRefresh = () => {
    setIsRefreshing(true);
    playlistContext
      ?.getFollowersPlaylists()
      .finally(() => setIsRefreshing(false));
  };

  const loadMorePlaylists = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getFollowersPlaylists(nextPage);
      setLoading(false);
    }
  };

  const onPlaylistDetail = async (item) => {
    const me = await SecureStore.getItemAsync("user_id");
    router.push({
      pathname: "/screens/playlist-screen",
      params: { playlist_id: selectedItem?.id ?? item.id, me },
    });
    setSelectedItem(null);
  };

  const onUserPic = async (item) => {
    router.push({
      pathname: "screens/user-profile",
      params: {
        userID: selectedItem?.user || item.user,
        playlist_id: selectedItem?.id || item.id,
      },
    });
    setSelectedItem(null);
  };

  const onActionSelect = (index) => {
    if (index === 0) {
      onUserPic(selectedItem);
    } else if (index === 1) {
      onPlaylistDetail(selectedItem);
    } else if (index === 2) {
      setSelectedItem(null); // Reset selectedItem when "Cancel" is selected
    }
  };

  // Open ActionSheet only when selectedItem is set
  useEffect(() => {
    if (selectedItem) {
      actionSheet.current.show();
    }
  }, [selectedItem]);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.userInfoContainer}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => onUserPic(item)}
            style={styles.userAvatarContainer}
          >
            <Image
              style={styles.userAvatar}
              source={item.avi_pic ? { uri: item.avi_pic } : default_avi}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onUserPic(item)}>
            <Text style={styles.username}>@{item.username}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedItem(item);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          <ActionSheet
            ref={actionSheet}
            options={["Go to profile", "Go to playlist", "Cancel"]}
            onPress={(index) => onActionSelect(index)}
            cancelButtonIndex={2}
          />
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedItem(item);
            actionSheet.current.show();
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          <ActionSheet
            ref={actionSheet}
            options={["Go to profile", "Go to playlist", "Cancel"]}
            onPress={(index) => onActionSelect(index, selectedItem)}
            cancelButtonIndex={2}
          />
        </TouchableOpacity> */}
      </View>

      {item?.playlist_cover && (
        <Pressable
          onPress={() => onPlaylistDetail(item)}
          style={styles.playlistContainer}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Image
              style={styles.playlistCover}
              source={{ uri: item.playlist_cover }}
            />
            <View style={styles.playlistInfoContainer}>
              <Text numberOfLines={2} style={styles.playlistTitle}>
                {item.playlist_title}
              </Text>
              <Text style={styles.playlistType}>{item.playlist_type}</Text>
            </View>
          </View>
          <Pressable
            style={styles.spotifyButton}
            onPress={() => Linking.openURL(item.playlist_url)}
          >
            <Image style={styles.spotifyIcon} source={Spotify_Icon_RGB_Green} />
          </Pressable>
        </Pressable>
      )}
      <Text style={styles.timestamp}>{moment(item.date).fromNow()}</Text>
    </View>
  );

  if (isCheckingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header />
      {playlists?.length > 0 ? (
        <FlatList
          data={playlists}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMorePlaylists}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={styles.loadingIndicator} />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.noPlaylistsContainer}>
          <Text style={styles.noPlaylistsText}>
            Find playlists in the discover tab.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#111111",
    flex: 1,
  },
  itemContainer: {
    marginVertical: 12,
    width: windowWidth,
    alignItems: "center",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: windowWidth,
    paddingHorizontal: 13,
  },
  userAvatarContainer: {
    height: 35,
    width: 35,
    borderRadius: 30,
    backgroundColor: "#1f1f1f",
  },
  userAvatar: {
    height: 35,
    width: 35,
    borderRadius: 30,
  },
  username: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 10,
  },
  actionButton: {
    height: 35,
    width: 35,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  playlistContainer: {
    width: windowWidth - 18,
    height: 120,
    backgroundColor: "#181818",
    borderRadius: 10,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  playlistCover: {
    width: 100,
    height: 100,
    resizeMode: "cover",
    backgroundColor: "#1f1f1f",
  },
  playlistInfoContainer: {
    flexDirection: "column",
    marginLeft: 10,
  },
  playlistTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    width: windowWidth / 2,
  },
  playlistType: {
    color: "lightgrey",
    fontWeight: "600",
    fontSize: 13,
    marginTop: 2,
  },
  spotifyButton: {
    height: 25,
    width: 25,
    borderRadius: 30,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  spotifyIcon: {
    width: 15,
    height: 15,
  },
  timestamp: {
    color: "lightgrey",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 6,
    marginLeft: 18,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  noPlaylistsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPlaylistsText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "bold",
    width: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111111",
  },
});

export default FollowingFeed;
