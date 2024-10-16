import React, { useEffect, useContext, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  Linking,
  ActivityIndicator,
  SectionList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Feather from "react-native-vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { Context as AuthContext } from "../../context/auth-context";
import Toast from "react-native-root-toast";
import ActionSheet from "react-native-actionsheet";
import { Audio } from "expo-av";
import * as Progress from "react-native-progress";

const window = Dimensions.get("window").width;

const Playlist = () => {
  const params = useLocalSearchParams();
  const { playlist_id } = params;
  let actionSheet = useRef();
  const optionArray = ["Delete", "Cancel"];
  const [toast, setToast] = useState(null);
  const playlistContext = useContext(PlaylistContext);
  const authContext = useContext(AuthContext);
  const [sound, setSound] = useState(null);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [me, setMe] = useState(null);
  // const [isLiked, setIsLiked] = useState(false);
  const isLiked = playlistContext?.state?.isLiked?.data;
  const playlist = playlistContext?.state?.playlist;
  const tracks = playlistContext?.state?.tracks;
  const nextPage = playlistContext?.state?.pagination?.next;
  const [loadingState, setLoadingState] = useState({
    isInitialLoading: true, // Initially loading
    isMoreLoading: false, // Loading more data
    isRefreshing: false, // Pull-to-refresh loading
    isDeleting: false, // Deleting playlist loading
  });
  const props = {
    playlist_id: playlist?.id,
    to_user: playlist?.user,
    playlist_user_id: playlist?.user,
    playlist_cover: playlist?.playlist_cover,
    playlist_url: playlist?.playlist_url,
    playlist_title: playlist?.playlist_title,
  };

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

  useEffect(() => {
    playlistContext?.checkIfLiked(playlist_id);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingState((prevState) => ({
        ...prevState,
        isInitialLoading: true,
      }));

      // const delay = new Promise((resolve) => setTimeout(resolve, 1300));

      try {
        const me = await authContext?.getCurrentUser();
        setMe(me);

        await playlistContext?.fetchPlaylist(
          playlist_id ? playlist_id : playlist_id.toString()
        );

        // await Promise.all([delay]);
      } finally {
        setLoadingState((prevState) => ({
          ...prevState,
          isInitialLoading: false,
        }));
      }
    };

    if (playlist_id) {
      fetchInitialData();
    }
  }, [playlist_id]);

  //Listen for Callback URL
  useEffect(() => {
    const callback = Linking.addEventListener("url", onSpotifyCallback);
    return () => callback.remove();
  }, [authContext?.state.token]);

  const onComments = () => {
    router.push({
      pathname: "../comments",
      params: props,
    });
  };

  // Unlike playlist
  const onUnlike = () => {
    playlistContext?.unlikePlaylist(playlist.id);
  };

  // Like playlist
  const onLike = (props) => {
    playlistContext?.likePlaylist(props);
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Function to play the selected track
  const playSound = async (item) => {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: item.preview_url },
      { shouldPlay: true },
      updateProgress
    );
    setSound(newSound);
    setIsPlaying(true);
    setCurrentTrackId(item.id);

    newSound.setOnPlaybackStatusUpdate(updateProgress);
  };

  const updateProgress = (playbackStatus) => {
    if (playbackStatus.isLoaded) {
      const currentProgress =
        playbackStatus.positionMillis / playbackStatus.durationMillis;
      setProgress(currentProgress);
      if (playbackStatus.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  //Spotify Callback
  const onSpotifyCallback = async (url) => {
    if (url !== null) {
      const urlCallback = new URL(url.url);
      const code = urlCallback.searchParams.get("code");
      const tokenresponse = await authContext?.spotifyCallback(code);
      const data = {
        access_token: tokenresponse.access_token,
        token_type: tokenresponse.token_type,
        expires_in: tokenresponse.expires_in,
        refresh_token: tokenresponse.refresh_token,
      };
      await authContext?.spotifyLogin(data);
    }
  };

  const onDeletePlaylist = async (userID) => {
    setLoadingState((prevState) => ({
      ...prevState,
      isDeleting: true,
    }));

    try {
      const res = await playlistContext?.deletePlaylist(playlist?.id);
      if (res === 200) {
        await playlistContext.getFollowersPlaylists();
        await playlistContext.getMyPlaylistData();
        if (userID) {
          await playlistContext.getPlaylistData();
        }
        router.back();
      }
    } catch (error) {
      playlistContext?.dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    } finally {
      setLoadingState((prevState) => ({
        ...prevState,
        isDeleting: false,
      }));
    }
  };

  //Show action sheet
  const showActionSheet = () => {
    actionSheet.current.show();
  };

  const showAlert = () =>
    Alert.alert(
      "Are you sure you want to delete this playlist?",
      "Action is not reversable",
      [
        {
          text: "Yes",
          onPress: () => onDeletePlaylist(),
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

  const onActionSelect = (index) => {
    if (index === 0) {
      showAlert();
    } else if (index === 1) {
      null;
    }
  };

  // Refresh screen
  const onRefresh = async () => {
    setLoadingState((prevState) => ({
      ...prevState,
      isRefreshing: true,
    }));
    try {
      await playlistContext?.checkIfLiked(playlist_id);
      await playlistContext?.fetchPlaylist(playlist_id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState((prevState) => ({
        ...prevState,
        isRefreshing: false,
      }));
    }
  };

  const loadMoreTracks = async () => {
    if (nextPage && !loadingState.isMoreLoading) {
      setLoadingState((prevState) => ({
        ...prevState,
        isMoreLoading: true,
      }));

      try {
        await playlistContext?.fetchMoreTracks(nextPage);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingState((prevState) => ({
          ...prevState,
          isMoreLoading: false,
        }));
      }
    }
  };

  // Go back to prev screen
  const onBack = () => {
    router.back();
  };

  if (loadingState.isInitialLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#111111",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  const playlistDetails = () => {
    return (
      <View
        style={{
          paddingBottom: 12,
          borderBottomColor: "#1f1f1f",
          borderBottomWidth: 0.3,
        }}
      >
        {!playlist?.playlist_cover ? null : (
          <Image
            style={{
              width: window,
              height: window,
              backgroundColor: "#121212",
            }}
            source={{ uri: playlist?.playlist_cover }}
          />
        )}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            paddingHorizontal: 12,
            marginVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <View
              style={{
                height: 25,
                width: 25,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isLiked == true ? (
                <TouchableOpacity onPress={() => onUnlike(item.item)}>
                  <FontAwesome name="heart" size={24} color={"red"} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => onLike(props)}>
                  <FontAwesome name="heart-o" size={24} color={"white"} />
                </TouchableOpacity>
              )}
            </View>
            <View
              style={{
                height: 25,
                width: 25,
                marginLeft: 15,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TouchableOpacity onPress={() => onComments(item?.playlist_id)}>
                <Feather name="message-circle" size={25} color={"white"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onComments(playlist?.playlist_id)}>
          <Text
            style={{
              color: "lightgrey",
              fontSize: 13,
              fontWeight: "500",
              paddingLeft: 12,
              marginBottom: 12,
            }}
          >
            See all comments
          </Text>
        </TouchableOpacity>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {!playlist?.playlist_cover ? null : (
              <Image
                style={{
                  width: 70,
                  height: 70,
                  resizeMode: "cover",
                  borderRadius: 2,
                  backgroundColor: "#1f1f1f",
                }}
                source={{ uri: playlist?.playlist_cover }}
              />
            )}
            <View
              style={{
                flexDirection: "column",
                alignSelf: "center",
                paddingLeft: 10,
              }}
            >
              {!playlist?.playlist_title ? null : (
                <Text
                  style={{ color: "white", fontSize: 13, fontWeight: "600" }}
                >
                  {playlist?.playlist_title}
                </Text>
              )}
              <Text
                style={{
                  marginTop: 2,
                  color: "lightgrey",
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                {playlist?.playlist_type}
              </Text>
            </View>
          </View>
          {!playlist?.playlist_url ? null : (
            <Pressable onPress={() => Linking.openURL(playlist?.playlist_url)}>
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
          )}
        </View>
      </View>
    );
  };

  const playlistTracks = ({ item }) => {
    return (
      <View
        style={{
          justifyContent: "center",
          width: window,
          marginTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => playSound(item)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 4,
            paddingHorizontal: 12,
            alignItems: "center",
          }}
        >
          <View
            style={{
              paddingTop: 7,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Image
              style={{
                width: 50,
                height: 50,
                resizeMode: "cover",
                borderRadius: 3,
              }}
              source={{ uri: item?.images }}
            />
            <View
              style={{
                flexDirection: "column",
                alignSelf: "center",
                paddingLeft: 10,
                maxWidth: "80%",
              }}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: "white",
                  fontSize: 13,
                  fontWeight: "600",
                  width: "100%",
                }}
              >
                {item?.name}
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  color: "lightgrey",
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                {item?.artist}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {isPlaying && item.id === currentTrackId ? (
              <Progress.Circle
                size={17}
                progress={progress}
                thickness={1.2}
                color="darkgrey"
                borderWidth={0}
                style={{ marginRight: 15 }}
              />
            ) : null}
            <Pressable
              style={{
                height: 25,
                width: 25,
                borderRadius: 30,
                backgroundColor: "#1f1f1f",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 10,
              }}
              onPress={() => Linking.openURL(item?.track_id)}
            >
              <Image
                style={{ width: 15, height: 15 }}
                source={Spotify_Icon_RGB_Green}
              />
            </Pressable>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Pressable onPress={onBack}>
          <View style={styles.header}>
            <Ionicons name="chevron-back" size={25} color={"white"} />
          </View>
        </Pressable>
        {playlist?.username ? (
          <Text style={styles.username}>{"@" + playlist?.username}</Text>
        ) : null}
        {JSON.stringify(playlist?.user) === me ? (
          <Pressable onPress={showActionSheet} style={styles.header}>
            <Feather name="more-horizontal" size={25} color={"white"} />
            <ActionSheet
              ref={actionSheet}
              options={optionArray}
              cancelButtonIndex={1}
              onPress={onActionSelect}
              title={"Delete playlist"}
              destructiveButtonIndex={0}
            />
          </Pressable>
        ) : (
          <View style={{ height: 50, width: 50, justifyContent: "center" }} />
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {tracks ? (
          <SectionList
            sections={[
              { title: "PlaylistDetails", data: [playlist] },
              { title: "Tracks", data: tracks },
            ]}
            keyExtractor={(item, index) =>
              item?.id ? item.id.toString() : index.toString()
            }
            renderItem={({ item, section }) =>
              section.title === "Tracks"
                ? playlistTracks({ item })
                : playlistDetails()
            }
            refreshing={loadingState.isRefreshing}
            onRefresh={onRefresh}
            onEndReached={loadMoreTracks}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingState.isMoreLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" />
                </View>
              ) : null
            }
          />
        ) : null}
      </View>
      {loadingState.isDeleting == true ? (
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
  screen: {
    backgroundColor: "#111111",
    alignItems: "center",
    flex: 1,
    width: window,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    width: window,
    backgroundColor: "#111111",
    borderBottomColor: "#232323",
    borderBottomWidth: 0.3,
  },
  header: {
    height: 50,
    width: 50,
    justifyContent: "center",
    paddingLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    justifyContent: "center",
  },
  progress_bar: {
    height: 20,
  },
});

export default Playlist;
