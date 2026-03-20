import React, { useState, useContext, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Linking,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Context as AuthContext } from "../../context/auth-context";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { router } from "expo-router";
import Toast from "react-native-root-toast";
import api from "../../utils/api";

const CreatePlaylist = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("spotify"); // "spotify" | "apple_music"
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);

  const selected_spotify = playlistContext?.state?.selectedSpotifyPlaylist;
  const selected_apple = playlistContext?.state?.selectedAppleMusicPlaylist;
  const selected_playlist = source === "spotify" ? selected_spotify : selected_apple;
  const continueDisabled = !selected_playlist;

  const [hashtag, setHashtag] = useState("");
  const [hashtags, setHashtags] = useState([]);

  const addHashtag = () => {
    const MAX_LENGTH = 30;
    if (!hashtag.trim()) return;
    const formatted = hashtag.trim().toLowerCase().replace(/\s+/g, "_");
    const finalHashtag = formatted.startsWith("#") ? formatted : `#${formatted}`;
    if (finalHashtag.length > MAX_LENGTH) {
      Toast.show(`Hashtag too long! Max length is ${MAX_LENGTH} characters.`, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
      });
      return;
    }
    if (!hashtags.includes(finalHashtag)) {
      setHashtags([...hashtags, finalHashtag]);
      setHashtag("");
    } else {
      Toast.show("Hashtag already added!", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
      });
    }
  };

  const removeHashtag = (index) => {
    const updated = [...hashtags];
    updated.splice(index, 1);
    setHashtags(updated);
  };

  // Listen for Spotify OAuth callback URL
  useEffect(() => {
    const callback = Linking.addEventListener("url", onSpotifyCallback);
    return () => callback.remove();
  }, [authContext?.state.token]);

  // Show auth errors as toasts
  useEffect(() => {
    if (authContext?.state?.errorMessage) {
      setToast(
        Toast.show(authContext?.state?.errorMessage, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.CENTER,
          onHidden: () => authContext?.setError(""),
        })
      );
    } else if (toast) {
      Toast.hide(toast);
    }
  }, [authContext?.state?.errorMessage]);

  const authenticateSpotify = async () => {
    const isAuth = await authContext?.isSpotifyAuth();
    if (isAuth === "true") {
      router.push("/screens/spotify-playlist");
    } else {
      authContext?.authSpotify();
    }
  };

  const onSpotifyCallback = async (url) => {
    if (!url) return;
    const urlCallback = new URL(url.url);
    const code = urlCallback.searchParams.get("code");
    if (!code) return;
    const tokenResponse = await authContext?.spotifyCallback(code);
    if (!tokenResponse) return;
    const res = await authContext?.spotifyLogin({
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token,
    });
    if (res === "true") {
      router.push("/screens/spotify-playlist");
    }
  };

  const authenticateAppleMusic = async () => {
    router.push("/screens/apple-music-playlist");
  };

  const selectSource = (item) => {
    if (source === "spotify") {
      authenticateSpotify();
    } else {
      authenticateAppleMusic();
    }
  };

  const getSelectedCoverUrl = () => {
    if (!selected_playlist) return null;
    if (source === "spotify") {
      return selected_playlist.images?.[0]?.url;
    }
    const url = selected_playlist.attributes?.artwork?.url;
    if (!url) return null;
    return url.replace("{w}", "60").replace("{h}", "60");
  };

  const getSelectedTitle = () => {
    if (!selected_playlist) return null;
    return source === "spotify"
      ? selected_playlist.name
      : selected_playlist.attributes?.name;
  };

  const postPlaylist = async () => {
    setLoading(true);
    try {
      let data;
      if (source === "spotify") {
        data = {
          hashtags,
          source: "spotify",
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
      } else {
        const artworkUrl = selected_playlist.attributes?.artwork?.url
          ?.replace("{w}", "500")
          .replace("{h}", "500");
        data = {
          hashtags,
          source: "apple_music",
          playlist_id: selected_playlist.id,
          playlist_cover: artworkUrl || "",
          playlist_title: selected_playlist.attributes?.name || "",
          playlist_type: "playlist",
        };
      }

      const response = await api.post("/feed/my-playlists/", data);

      if (response.status === 201) {
        if (source === "spotify") {
          playlistContext?.clearSelectedPlaylist();
        } else {
          playlistContext?.clearSelectedAppleMusicPlaylist();
        }
        setHashtags([]);
        playlistContext?.getFollowersPlaylists();
        playlistContext?.getAllPlaylists();
        router.replace("(tabs)/home");
      } else {
        authContext?.setError("Failed to post playlist.");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Hmmm... Something went wrong. Please try again";
      authContext?.setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    playlistContext?.clearSelectedPlaylist();
    playlistContext?.clearSelectedAppleMusicPlaylist();
    setHashtags([]);
  };

  const coverUrl = getSelectedCoverUrl();
  const selectedTitle = getSelectedTitle();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          disabled={continueDisabled}
          style={styles.headerButton}
          onPress={cancel}
        >
          <Text style={continueDisabled ? styles.disabled_cancel_text : styles.cancel_text}>
            Clear
          </Text>
        </TouchableOpacity>
        <Text style={styles.header_text}>Upload Playlist</Text>
        <TouchableOpacity
          disabled={continueDisabled}
          style={[styles.headerButton, { alignItems: "flex-end" }]}
          onPress={postPlaylist}
        >
          <Text style={continueDisabled ? styles.disabled_share_text : styles.share_text}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Source picker */}
      <View style={styles.sourcePicker}>
        <TouchableOpacity
          style={[styles.sourceButton, source === "spotify" && styles.sourceButtonActive]}
          onPress={() => setSource("spotify")}
        >
          <Text style={[styles.sourceButtonText, source === "spotify" && styles.sourceButtonTextActive]}>
            Spotify
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sourceButton, source === "apple_music" && styles.sourceButtonActive]}
          onPress={() => setSource("apple_music")}
        >
          <Text style={[styles.sourceButtonText, source === "apple_music" && styles.sourceButtonTextActive]}>
            Apple Music
          </Text>
        </TouchableOpacity>
      </View>

      {!selected_playlist ? (
        <TouchableHighlight onPress={selectSource}>
          <View style={styles.uploadplaylist}>
            <Text style={styles.uploadplaylist_text}>Select playlist</Text>
            <Ionicons name="chevron-forward" size={18} color={"lightgrey"} />
          </View>
        </TouchableHighlight>
      ) : (
        <TouchableHighlight onPress={selectSource}>
          <View style={styles.selected_playlist}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.playlistimage} />
              ) : (
                <View style={[styles.playlistimage, { backgroundColor: "#333" }]} />
              )}
              <View style={{ flexDirection: "column", marginLeft: 10 }}>
                <Text style={styles.playlisttitle} numberOfLines={1}>
                  {selectedTitle}
                </Text>
                <Text style={styles.playlisttype} numberOfLines={1}>
                  {source === "spotify" ? "spotify" : "apple music"}
                </Text>
              </View>
            </View>
            <Icon name="angle-right" size={20} style={{ right: 3, color: "white" }} />
          </View>
        </TouchableHighlight>
      )}

      {/* Hashtag chips */}
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

      <TextInput
        style={styles.input}
        value={hashtag}
        onChangeText={setHashtag}
        onSubmitEditing={addHashtag}
        placeholder="Add a hashtag"
        placeholderTextColor="lightgrey"
        selectionColor="white"
      />
      <TouchableOpacity style={styles.addButton} onPress={addHashtag}>
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" />
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
  headerButton: {
    height: 50,
    width: 80,
    justifyContent: "center",
  },
  sourcePicker: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  sourceButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#1E1E1E",
  },
  sourceButtonActive: {
    backgroundColor: "#0C8ECE",
  },
  sourceButtonText: {
    color: "lightgrey",
    fontSize: 13,
    fontWeight: "600",
  },
  sourceButtonTextActive: {
    color: "white",
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
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(12, 12, 12, 0.5)",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});

export default CreatePlaylist;
