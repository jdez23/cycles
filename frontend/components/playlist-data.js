import React, { useContext, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Text,
  Pressable,
  Linking,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Context as PlaylistContext } from "../context/playlist-context";
import { Context as AuthContext } from "../context/auth-context";
import Toast from "react-native-root-toast";
import Spotify_Icon_RGB_Green from "../assets/logos/Spotify_Icon_RGB_Green.png";
import Feather from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { router } from "expo-router";
import { Audio } from "expo-av";
import * as Progress from "react-native-progress";

// Playlist Details Component
export default PlaylistDetails = (item) => {
  const playlistContext = useContext(PlaylistContext);
  const authContext = useContext(AuthContext);
  const [isLiked, setIsLiked] = useState();
  const [toast, setToast] = useState(null);
  const window = Dimensions.get("window").width;
  const playlist = item?.item?.item;
  const tracks = playlistContext?.state?.tracks?.results?.playlistTracks;
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [sound, setSound] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const props = {
    playlist_id: playlist?.id,
    to_user: playlist?.user,
    playlist_user_id: playlist?.user,
    playlist_cover: playlist?.playlist_cover,
    playlist_url: playlist?.playlist_url,
    playlist_title: playlist?.playlist_title,
  };

  // Listen for errors
  useEffect(() => {
    if (authContext?.state?.errorMessage) {
      setToast(
        Toast.show(authContext?.state?.errorMessage, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.CENTER,
          onHidden: () => dispatch({ type: "clear_error_message" }),
        })
      );
    } else if (toast) {
      Toast.hide(toast);
    }
  }, [authContext?.state?.errorMessage]);

  // Check if current user liked this image
  useEffect(() => {
    playlistContext
      ?.checkIfLiked(playlist?.id)
      .then((item) => setIsLiked(item.data));
  }, []);

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

  // useEffect(() => {
  //   return sound
  //     ? () => {
  //         console.log("Unloading Sound");
  //         sound.unloadAsync();
  //       }
  //     : undefined;
  // }, [sound]);

  // const playSound = async () => {
  //   console.log("Loading Sound");
  //   const { sound: newSound } = await Audio.Sound.createAsync(
  //     { uri: previewUrl },
  //     { shouldPlay: true },
  //     updateProgress
  //   );
  //   setSound(newSound);
  //   setIsPlaying(true);
  // };

  // const updateProgress = (playbackStatus) => {
  //   if (playbackStatus.isLoaded) {
  //     const currentProgress =
  //       playbackStatus.positionMillis / playbackStatus.durationMillis;
  //     setProgress(currentProgress);
  //     if (playbackStatus.didJustFinish) {
  //       setIsPlaying(false);
  //     }
  //   }
  // };

  // Go to comments screen
  const onComments = () => {
    router.push({
      pathname: "../comments",
      params: props,
    });
  };

  // Unlike playlist
  const onUnlike = () => {
    playlistContext
      ?.unlikePlaylist(playlist.id)
      .then((item) => setIsLiked(item));
  };

  // Like playlist
  const onLike = (props) => {
    playlistContext?.likePlaylist(props).then((item) => setIsLiked(item));
  };

  return playlist ? (
    <View>
      <View
        style={[
          playlist?.isSpotifyAuth === true
            ? styles.isAuthPadding
            : styles.notauthPadding,
        ]}
      >
        {!playlist?.playlist_cover ? null : (
          <Image
            style={{ height: window, backgroundColor: "#121212" }}
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
                  <Feather name="heart" size={24} color={"white"} />
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
                <Text style={{ color: "white", fontSize: 13 }}>
                  {playlist?.playlist_title}
                </Text>
              )}
              <Text
                style={{
                  marginTop: 2,
                  color: "lightgrey",
                  fontSize: 13,
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
      <FlatList
        data={tracks}
        renderItem={({ item }) => (
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
                source={{ uri: item.images }}
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
                    fontWeight: "500",
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
        )}
      ></FlatList>
    </View>
  ) : null;
};

const styles = StyleSheet.create({
  isAuthPadding: {
    paddingBottom: 12,
    borderBottomColor: "#1f1f1f",
    borderBottomWidth: 0.3,
  },
  notauthPadding: {
    paddingBottom: 12,
    borderBottomColor: "#1f1f1f",
    borderBottomWidth: 0.3,
  },
  progress_bar: {
    height: 20,
  },
});
