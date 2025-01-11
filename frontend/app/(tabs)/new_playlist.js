import React, { useState, useContext, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Linking,
  Dimensions,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Context as AuthContext } from "../../context/auth-context";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { router } from "expo-router";
import Toast from "react-native-root-toast";
import axios from "axios";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

const CreatePlaylist = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);
  const selected_playlist = playlistContext?.state?.selectedSpotifyPlaylist;
  const continueDisabled = !selected_playlist;
  const getToken = async () => await SecureStore.getItemAsync("token");
  const [hashtag, setHashtag] = useState("");
  const [hashtags, setHashtags] = useState([]);

  // Validate and add hashtag
  const addHashtag = () => {
    const MAX_LENGTH = 30; // Define the maximum length for a hashtag

    if (hashtag.trim()) {
      // Normalize the hashtag
      const formattedHashtag = hashtag
        .trim()
        .toLowerCase() // Optional: Convert to lowercase for consistency
        .replace(/\s+/g, "_"); // Replace spaces with underscores

      // Ensure the hashtag starts with "#"
      const finalHashtag = formattedHashtag.startsWith("#")
        ? formattedHashtag
        : `#${formattedHashtag}`;

      // Check if the hashtag exceeds the maximum length
      if (finalHashtag.length > MAX_LENGTH) {
        Toast.show(
          `Hashtag too long! Max length is ${MAX_LENGTH} characters.`,
          {
            duration: Toast.durations.SHORT,
            position: Toast.positions.CENTER,
          }
        );
        return; // Exit the function if the hashtag is too long
      }

      // Check for duplicates
      if (!hashtags.includes(finalHashtag)) {
        setHashtags([...hashtags, finalHashtag]);
        setHashtag(""); // Clear the input field
      } else {
        Toast.show("Hashtag already added!", {
          duration: Toast.durations.SHORT,
          position: Toast.positions.CENTER,
        });
      }
    }
  };

  // Remove hashtag by index
  const removeHashtag = (index) => {
    const updatedHashtags = [...hashtags];
    updatedHashtags.splice(index, 1);
    setHashtags(updatedHashtags);
  };

  //Listen for Callback URL
  useEffect(() => {
    const callback = Linking.addEventListener("url", onSpotifyCallback);
    return () => callback.remove();
  }, [authContext?.state.token]);

  // Listen for errors
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

  // Authenticate Spotify
  const authenticateSpotify = async () => {
    const isSpotifyAuth = await authContext?.isSpotifyAuth();
    isSpotifyAuth === "true" ? router.push("/screens/spotify-playlist") : null;
    isSpotifyAuth === "false" ? authContext?.authSpotify() : null;
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
      const res = await authContext?.spotifyLogin(data);
      if (res == "true") {
        router.push("/screens/spotify-playlist");
      } else {
        null;
      }
    }
  };

  //Post playlist to API
  const postPlaylist = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      const data = {
        hashtags, // Array of hashtags
        playlist_url: selected_playlist.external_urls.spotify,
        playlist_ApiURL: selected_playlist.href,
        playlist_id: selected_playlist.id,
        playlist_cover: selected_playlist.images[0].url,
        playlist_title: selected_playlist.name,
        playlist_description: selected_playlist.description,
        playlist_type: selected_playlist.type,
        playlist_uri: selected_playlist.uri,
        playlist_tracks: selected_playlist.tracks.href,
      };

      const response = await axios.post(
        `${BACKEND_URL}/feed/my-playlists/`,
        data,
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.status === 201) {
        playlistContext?.clearSelectedPlaylist();
        setHashtags([]);
        playlistContext?.getFollowersPlaylists();
        playlistContext?.getAllPlaylists();
        router.replace("(tabs)/home");
      } else {
        // Handle unexpected status codes
        authContext?.dispatch({
          type: "error_1",
          payload: "Failed to post playlist.",
        });
      }
    } catch (error) {
      // Extract error message from the response if available
      let errorMessage = "Hmmm... Something went wrong. Please try again";
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      authContext?.dispatch({
        type: "error_1",
        payload: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  //Navigate back to previous screen
  const cancel = () => {
    playlistContext?.clearSelectedPlaylist();
    setHashtags([]);
  };

  return (
    <SafeAreaView
      style={StyleSheet.create({ backgroundColor: "#111111", flex: 1 })}
    >
      <View style={styles.header}>
        <TouchableOpacity
          disabled={continueDisabled}
          style={{
            height: 50,
            width: 80,
            justifyContent: "center",
          }}
          onPress={() => cancel()}
        >
          <Text
            style={
              continueDisabled
                ? styles.disabled_cancel_text
                : styles.cancel_text
            }
          >
            Clear
          </Text>
        </TouchableOpacity>
        <Text style={styles.header_text}>Upload Playlist</Text>
        <TouchableOpacity
          disabled={continueDisabled}
          style={{
            height: 50,
            width: 80,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
          onPress={() => postPlaylist()}
        >
          <Text
            style={
              continueDisabled ? styles.disabled_share_text : styles.share_text
            }
          >
            Share
          </Text>
        </TouchableOpacity>
      </View>
      {!selected_playlist ? (
        <TouchableHighlight onPress={() => authenticateSpotify()}>
          <View style={styles.uploadplaylist}>
            <Text style={styles.uploadplaylist_text}>Select playlist</Text>
            <Ionicons name="chevron-forward" size={18} color={"lightgrey"} />
          </View>
        </TouchableHighlight>
      ) : (
        <TouchableHighlight onPress={() => authenticateSpotify()}>
          <View style={styles.selected_playlist}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={selected_playlist?.images}
                style={styles.playlistimage}
              />
              <View style={{ flexDirection: "column", marginLeft: 10 }}>
                <Text style={styles.playlisttitle} numberOfLines={1}>
                  {selected_playlist?.name}
                </Text>
                <Text style={styles.playlisttype} numberOfLines={1}>
                  {selected_playlist?.type}
                </Text>
              </View>
            </View>
            <Icon
              name="angle-right"
              size={20}
              style={{ right: 3, color: "white" }}
            />
          </View>
        </TouchableHighlight>
      )}
      {/* Display existing hashtags */}
      <View style={styles.chipContainer}>
        {hashtags.map((tag, index) => (
          <View key={index} style={styles.chip}>
            <Text style={styles.chipText}>{tag}</Text>
            <TouchableOpacity onPress={() => removeHashtag(index)}>
              <Text style={styles.removeIcon}>x</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {/* Input for new hashtags */}
      <TextInput
        style={styles.input}
        value={hashtag}
        onChangeText={setHashtag}
        onSubmitEditing={addHashtag} // Add hashtag on Enter/Done
        placeholder="Add a hashtag"
        placeholderTextColor="lightgrey"
        selectionColor="white"
      />
      {/* Add button */}
      <TouchableOpacity style={styles.addButton} onPress={addHashtag}>
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
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
  share_text: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0C8ECE",
    paddingHorizontal: 12,
  },
  disabled_share_text: {
    fontSize: 14,
    fontWeight: "600",
    color: "grey",
    paddingHorizontal: 12,
  },
  cancel_text: {
    fontSize: 14,
    fontWeight: "600",
    color: "red",
    paddingHorizontal: 12,
  },
  disabled_cancel_text: {
    fontSize: 14,
    fontWeight: "600",
    color: "grey",
    paddingHorizontal: 12,
  },
  header_text: {
    fontSize: 14,
    alignSelf: "center",
    color: "white",
    fontWeight: "600",
  },
  header: {
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  camera_container: {
    justifyContent: "center",
    height: 30,
    width: 30,
    backgroundColor: "black",
    alignItems: "center",
    flexDirection: "row",
    borderRadius: 15,
  },
  camera_icon: {
    alignItems: "center",
  },
  uploadplaylist: {
    flexDirection: "row",
    height: 100,
    alignItems: "center",
  },
  uploadplaylist_text: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0C8ECE",
    textAlign: "left",
  },
  selected_playlist: {
    flexDirection: "row",
    height: 100,
    alignItems: "center",
    marginHorizontal: 12,
    justifyContent: "space-between",
  },
  playlistimage: {
    height: 60,
    width: 60,
  },
  playlisttitle: {
    fontSize: 13,
    color: "white",
    left: 6,
  },
  playlisttype: {
    marginTop: 1,
    fontSize: 12,
    color: "lightgrey",
    left: 6,
  },
  cropIcon: {
    height: 30,
    width: 30,
    borderRadius: 30,
    backgroundColor: "rgba(52, 52, 52, 0.8)",
    position: "absolute",
    right: 15,
    bottom: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    marginHorizontal: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "white",
    fontSize: 14,
    marginRight: 8,
  },
  removeIcon: {
    color: "red",
    fontSize: 14,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginHorizontal: 12,
  },
  addButton: {
    marginTop: 10,
    backgroundColor: "#32D74B",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 12,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CreatePlaylist;
