import {
  Text,
  StyleSheet,
  Image,
  View,
  FlatList,
  Pressable,
  SafeAreaView,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Dimensions,
  TouchableHighlight,
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome";
import Entypo from "react-native-vector-icons/Entypo";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-root-toast";
import { Context as AuthContext } from "../../context/auth-context";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { router } from "expo-router";
import default_avi from "../../assets/images/default_avi.jpg";
// import envs from '../../../Config/env';

// const BACKEND_URL = envs.PROD_URL;
const BACKEND_URL = "http://127.0.0.1:8000/";

const window = Dimensions.get("window").width;

const DiscoverFeed = () => {
  const [recentSearch, setRecentSearched] = useState([]);
  const [nextSearchPage, setSearchNextPage] = useState(null);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchPlaylists, setSearchPlaylists] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [isPressed, setPressed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const playlistContext = useContext(PlaylistContext);
  const getUserID = async () => await SecureStore.getItemAsync("user_id");
  const searchResults = [...searchUsers, ...searchPlaylists];
  const nextFeed = playlistContext?.state?.allPlaylists?.next;

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

  //Call to fetch Playlists function
  useEffect(() => {
    playlistContext?.getAllPlaylists();
  }, [authContext?.state.token]);

  const wait = (timeout) => {
    // Defined the timeout function for testing purpose
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setLoadingData(true);
    playlistContext?.getAllPlaylists();
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

  //Navigate to playlist detail screen
  const onPlaylistDetail = async (item) => {
    const me = await getUserID();
    router.push({
      pathname: "playlist-screen",
      params: { playlist_id: item.id, me: me, fromTab: "discover" },
    });
  };

  const loadMorePlaylists = async (route) => {
    if (route && !loading) {
      setLoading(true);
      if (route == nextFeed) {
        await playlistContext?.getAllPlaylists(nextFeed);
      } else {
        if ((route = nextSearchPage)) {
          await searchAPI(search, nextSearchPage);
        }
      }
      setLoading(false);
    }
  };

  const onSearched = (item) => {
    setRecentSearched(item);
    item.playlist_title
      ? onPlaylistDetail(item)
      : router.push({
          pathname: "user-profile",
          params: item,
        });
  };

  //Navigate to user profile
  const onUserPic = async (item) => {
    const me = await getUserID();
    router.push({
      pathname: "user-profile",
      params: { userID: item.user, playlist_id: item.id, me: me },
    });
  };

  //Render Playlist data
  const renderPlaylists = ({ item }) => (
    <View
      style={{
        marginTop: 6,
        marginHorizontal:
          playlistContext?.state?.allPlaylists?.results.length > 1 ? 2 : 12,
        marginBottom: 12,
        width: window / 2 - 12,
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={() => onPlaylistDetail(item)}
        style={{
          flexDirection: "column",
          justifyContent: "center",
          width: window / 2 - 22,
        }}
      >
        {item.playlist_cover ? (
          <Image
            style={{
              width: window / 2 - 22,
              height: window / 2 - 22,
              backgroundColor: "#1f1f1f",
            }}
            source={{ uri: item.playlist_cover }}
          />
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 10,
            width: window / 2 - 22,
          }}
        >
          <Pressable
            onPress={() => onUserPic(item)}
            style={{
              height: 30,
              width: 30,
              borderRadius: 30,
              backgroundColor: "#121212",
            }}
          >
            <Image
              style={{ height: 30, width: 30, borderRadius: 30 }}
              source={item.avi_pic ? { uri: item?.avi_pic } : default_avi}
            />
          </Pressable>
          <View
            style={{
              flexDirection: "column",
              marginLeft: 8,
              width: window / 2 - 60,
            }}
          >
            <View>
              <Text
                style={{
                  textAlign: "left",
                  color: "white",
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                {item.username}
              </Text>
              <Text
                style={{
                  textAlign: "left",
                  color: "lightgrey",
                  fontSize: 12,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {item.playlist_title}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );

  // Render recent searched
  const renderRecentSearch = ({ item }) => {
    <Pressable
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        width: window,
        paddingHorizontal: 12,
      }}
      onPress={() => onPlaylistDetail(item)}
    >
      <View style={{ flexDirection: "row" }}>
        <Image
          style={{
            width: 50,
            height: 50,
            backgroundColor: "#1f1f1f",
          }}
          source={{ uri: item.playlist_cover }}
        />
        <View
          style={{
            flexDirection: "column",
            marginLeft: 10,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              textAlign: "left",
              color: "white",
              fontSize: 14,
              fontWeight: "500",
            }}
            numberOfLines={1}
          >
            {item.username}
          </Text>
          <Text
            style={{
              textAlign: "left",
              color: "lightgrey",
              fontSize: 13,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {item.playlist_title}
          </Text>
        </View>
      </View>
      <Entypo name="cross" size={20} color="white" onPress={null} />
    </Pressable>;
  };

  //Render searched playlist
  const renderFilteredPlaylists = ({ item, index }) =>
    item.username ? (
      <TouchableHighlight
        key={`${item.id}-${index}`}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 8,
          width: window,
          paddingHorizontal: 12,
        }}
        onPress={() => onSearched(item)}
      >
        <View style={{ flexDirection: "row" }}>
          {item.playlist_cover ? (
            <Image
              style={{
                width: 50,
                height: 50,
                backgroundColor: "#1f1f1f",
              }}
              source={{
                uri: item.playlist_cover,
              }}
            />
          ) : (
            <Image
              style={{
                width: 50,
                height: 50,
                borderRadius: 40,
                backgroundColor: "#1f1f1f",
              }}
              source={item.avi_pic ? { uri: item?.avi_pic } : default_avi}
            />
          )}
          <View
            style={{
              flexDirection: "column",
              marginLeft: 10,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                textAlign: "left",
                color: "white",
                fontSize: 14,
                fontWeight: "500",
              }}
              numberOfLines={1}
            >
              {item.username}
            </Text>
            {item.playlist_title ? (
              <Text
                style={{
                  textAlign: "left",
                  color: "lightgrey",
                  fontSize: 13,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {item.playlist_title
                  ? item.playlist_title
                  : item.name
                  ? item.name
                  : null}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableHighlight>
    ) : null;

  // Search data
  const searchAPI = async (text) => {
    const token = await SecureStore.getItemAsync("token");
    if (text.length > 0)
      try {
        const url = nextSearchPage
          ? nextSearchPage
          : `${BACKEND_URL}/feed/search/?q=${text}`;
        const response = await axios.get(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        });
        const searchResults = response.data;
        setSearchNextPage(searchResults?.next);
        // Append the new user data to the existing searchUsers state
        setSearchUsers((prevUsers) => [
          ...prevUsers,
          ...searchResults?.results[0]?.users,
        ]);

        // Append the new playlist data to the existing searchPlaylists state
        setSearchPlaylists((prevPlaylists) => [
          ...prevPlaylists,
          ...searchResults?.results[0]?.playlists,
        ]);
      } catch (error) {}
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.text}>cycles</Text>
      </View>
      <View
        style={
          isPressed ? styles.search_container_pressed : styles.search_container
        }
      >
        <View style={isPressed ? styles.searchBarPressed : styles.searchBar}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon name="search" size={13} color={"white"} />
            <TextInput
              placeholder={"Search:"}
              selectionColor={"white"}
              placeholderTextColor={"white"}
              onFocus={() => {
                setPressed(true);
              }}
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                searchAPI(text);
                setSearchPlaylists(text);
                setSearchUsers(text);
              }}
              style={isPressed ? styles.textInputOpened : styles.textInput}
            ></TextInput>
          </View>
          {search.length > 0 ? (
            <Entypo
              name="cross"
              size={20}
              color="white"
              onPress={() => {
                setSearch("");
              }}
            />
          ) : null}
        </View>
        {isPressed ? (
          <Pressable
            style={{
              width: 60,
              height: 50,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
            onPress={() => {
              Keyboard.dismiss();
              setPressed(false);
              setSearch("");
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View
        style={
          playlistContext?.state?.allPlaylists &&
          playlistContext?.state?.allPlaylists?.results.length > 1
            ? {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }
            : {
                flex: 1,
                justifyContent: "center",
              }
        }
      >
        {isPressed ? (
          search ? (
            <FlatList
              keyExtractor={(item, index) => `${item.id}-${index}`}
              key={`one-column-${searchResults?.length}`}
              data={searchResults}
              numColumns={1}
              initialNumToRender={10}
              renderItem={renderFilteredPlaylists}
              onEndReached={() => loadMorePlaylists(nextSearchPage)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : null
              }
            ></FlatList>
          ) : (
            <FlatList
              data={recentSearch}
              key={`one-column-recent-${recentSearch?.length}`}
              numColumns={1}
              initialNumToRender={10}
              renderItem={renderRecentSearch}
            ></FlatList>
          )
        ) : (
          <FlatList
            data={playlistContext?.state?.allPlaylists?.results}
            key={`two-columns-${playlistContext?.state.allPlaylists?.results.length}`}
            renderItem={renderPlaylists}
            numColumns={2}
            initialNumToRender={10}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            onEndReached={() => loadMorePlaylists(nextFeed)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" />
                </View>
              ) : null
            }
          ></FlatList>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#111111",
    flex: 1,
  },
  columnWrapper: {
    justifyContent: "space-evenly",
  },
  container: {
    backgroundColor: "#111111",
    height: 50,
    alignItems: "center",
  },
  text: {
    fontSize: window / 13,
    fontFamily: "futura",
    fontWeight: "bold",
    color: "white",
  },
  search_container: {
    height: 50,
    width: window,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomColor: "#121212",
    borderBottomWidth: 0.5,
  },
  search_container_pressed: {
    height: 50,
    width: window,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomColor: "#121212",
    borderBottomWidth: 0.3,
  },
  searchBarPressed: {
    paddingHorizontal: 12,
    backgroundColor: "#1f1f1f",
    height: 35,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    width: window - 84,
    justifyContent: "space-between",
  },
  searchBar: {
    paddingHorizontal: 12,
    backgroundColor: "#1f1f1f",
    height: 35,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    width: window - 24,
  },
  textInput: {
    fontSize: 13,
    color: "white",
    marginLeft: 8,
    width: window - 57,
    height: 35,
  },
  textInputOpened: {
    fontSize: 13,
    color: "white",
    height: 35,
    marginLeft: 8,
  },
  loadingContainer: {
    paddingTop: 30,
    paddingBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DiscoverFeed;
