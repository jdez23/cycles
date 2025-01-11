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
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";
import Octicons from "@expo/vector-icons/Octicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { Context as PlaylistContext } from "../../context/playlist-context";
import Toast from "react-native-root-toast";
import ActionSheet from "react-native-actionsheet";
import { Audio } from "expo-av";
import * as Progress from "react-native-progress";

const window = Dimensions.get("window").width;

const Playlist = () => {
  const actionSheet = useRef();
  const optionArray = ["Delete", "Update", "Cancel"];
  const playlistContext = useContext(PlaylistContext);
  const params = useLocalSearchParams();
  const { playlist_id } = params;

  const playlist = playlistContext?.state?.playlist;
  const tracks = playlistContext?.state?.tracks;
  const nextPage = playlistContext?.state?.pagination?.next;

  const [toast, setToast] = useState(null);
  const [sound, setSound] = useState(null);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const me = params.me;

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

  const fetchInitialData = async () => {
    setLoadingState((prev) => ({ ...prev, isInitialLoading: true }));
    try {
      await playlistContext?.fetchPlaylist(playlist_id);
    } finally {
      setLoadingState((prev) => ({ ...prev, isInitialLoading: false }));
    }
  };

  const toggleLike = async () => {
    try {
      if (playlist?.isLiked) {
        await playlistContext?.unlikePlaylist(playlist.id); // Call unlike API
      } else {
        await playlistContext?.likePlaylist(props); // Call like API
      }
      await playlistContext?.fetchPlaylist(playlist_id); // Refresh playlist details
    } catch (error) {}
  };

  useEffect(() => {
    fetchInitialData();
  }, [playlist_id]);

  // //Listen for Callback URL
  // useEffect(() => {
  //   const callback = Linking.addEventListener("url", onSpotifyCallback);
  //   return () => callback.remove();
  // }, [authContext?.state.token]);

  const onComments = () => {
    router.push({
      pathname: "./comments",
      params: props,
    });
  };

  const onUser = async () => {
    router.push({
      pathname: "/screens/user-profile",
      params: {
        userID: playlist.user,
      },
    });
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

  // //Spotify Callback
  // const onSpotifyCallback = async (url) => {
  //   if (url !== null) {
  //     const urlCallback = new URL(url.url);
  //     const code = urlCallback.searchParams.get("code");
  //     const tokenresponse = await authContext?.spotifyCallback(code);
  //     const data = {
  //       access_token: tokenresponse.access_token,
  //       token_type: tokenresponse.token_type,
  //       expires_in: tokenresponse.expires_in,
  //       refresh_token: tokenresponse.refresh_token,
  //     };
  //     await authContext?.spotifyLogin(data);
  //   }
  // };

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
        await playlistContext.getAllPlaylists();
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

  // Update playlist
  const onUpdatePlaylist = async () => {
    setLoadingState((prevState) => ({
      ...prevState,
      isDeleting: true,
    }));

    try {
      await playlistContext?.updatePlaylist(playlist_id);
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
      onUpdatePlaylist();
    } else if (index === 2) {
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

  // Go to hasthtag playlists
  const onHashtag = (item) => {
    router.push({
      pathname: "./hashtag-playlists",
      params: { hashtag: item },
    });
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

        {/* Heart and comment */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 12,
            paddingTop: 12,
            alignItems: "center",
          }}
        >
          <View
            style={{
              height: 25,
              width: 25,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity onPress={toggleLike}>
              <Octicons
                name={playlist?.isLiked ? "heart-fill" : "heart"}
                size={25}
                color={playlist?.isLiked ? "red" : "white"}
              />
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => onComments()}>
              <FontAwesome5 name="comment" size={25} color={"white"} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: "column",
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            {/* Playlist Cover */}
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

            {/* Playlist Title and Type */}
            <View
              style={{
                flex: 1, // Ensures the column stretches within available space
                flexDirection: "column",
                paddingLeft: 10,
                paddingRight: 10, // Add padding for proper spacing
              }}
            >
              {!playlist?.playlist_title ? null : (
                <Text
                  style={{
                    color: "white",
                    fontSize: 13,
                    fontWeight: "600",
                    lineHeight: 18, // Improves readability for wrapped text
                    flexWrap: "wrap", // Ensures text wraps
                  }}
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
            {/* Spotify Icon */}
            {!playlist?.playlist_url ? null : (
              <Pressable
                onPress={() => Linking.openURL(playlist?.playlist_url)}
              >
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

          {/* Description */}
          {!playlist?.playlist_description ? null : (
            <View
              style={{
                marginHorizontal: 12,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 13,
                  lineHeight: 18, // Adjust line height for better readability
                }}
              >
                <Text
                  style={{
                    fontWeight: "500",
                  }}
                >
                  {playlist?.playlist_description}
                </Text>
              </Text>
            </View>
          )}

          {/* Hahstags */}
          {playlist?.hashtags && playlist?.hashtags?.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                paddingTop: 8,
                paddingHorizontal: 12,
              }}
            >
              <FlatList
                data={playlist.hashtags}
                horizontal
                scrollEnabled={playlist?.hashtags?.length > 1 ? true : false}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => onHashtag(item)}
                    style={{
                      backgroundColor: "#333",
                      borderRadius: 20,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 14 }}>{item}</Text>
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  const playlistTracks = ({ item }) => {
    return (
      <View style={styles.trackContainer}>
        <Pressable onPress={() => playSound(item)} style={styles.trackRow}>
          <Image
            style={styles.trackAlbumCover}
            source={{ uri: item?.images }}
          />
          <View style={styles.trackDetails}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {item?.name}
            </Text>
            <Text numberOfLines={1} style={styles.trackArtist}>
              {item?.artist}
            </Text>
          </View>
        </Pressable>
        <View style={styles.trackIconContainer}>
          {isPlaying && item.id === currentTrackId ? (
            <Progress.Circle
              size={17}
              progress={progress}
              thickness={1.5}
              color="darkgrey"
              borderWidth={0}
              style={styles.progressCircle}
            />
          ) : null}
          <Pressable
            style={styles.spotifyIcon}
            onPress={() => Linking.openURL(item?.track_id)}
          >
            <Image
              style={styles.spotifyImage}
              source={Spotify_Icon_RGB_Green}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.container}>
        <Pressable onPress={onBack}>
          <View style={styles.header}>
            <Ionicons name="chevron-back" size={25} color={"white"} />
          </View>
        </Pressable>
        {playlist?.username ? (
          <Pressable onPress={() => onUser()}>
            <Text style={styles.username}>{"@" + playlist?.username}</Text>
          </Pressable>
        ) : null}
        {JSON.stringify(playlist?.user) === me ? (
          <Pressable onPress={showActionSheet} style={styles.header}>
            <Feather name="more-horizontal" size={25} color={"white"} />
            <ActionSheet
              ref={actionSheet}
              options={optionArray}
              cancelButtonIndex={2}
              onPress={onActionSelect}
              destructiveButtonIndex={0}
            />
          </Pressable>
        ) : (
          <View style={{ height: 50, width: 50, justifyContent: "center" }} />
        )}
      </SafeAreaView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#111111",
    flex: 1,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  trackContainer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  trackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    alignItems: "center",
    flex: 1,
  },
  trackAlbumCover: {
    width: 50,
    height: 50,
    resizeMode: "cover",
    borderRadius: 3,
  },
  trackDetails: {
    flexDirection: "column",
    alignSelf: "center",
    paddingLeft: 10,
    flex: 1,
  },
  trackTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  trackArtist: {
    marginTop: 2,
    color: "lightgrey",
    fontSize: 13,
    fontWeight: "500",
  },
  trackIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
  },
  progressCircle: {
    marginRight: 15,
  },
  spotifyIcon: {
    height: 25,
    width: 25,
    borderRadius: 30,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  spotifyImage: {
    width: 15,
    height: 15,
  },
});

export default Playlist;
