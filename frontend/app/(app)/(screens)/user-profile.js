import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  SectionList,
  SafeAreaView,
  Dimensions,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-root-toast";
import Ionicons from "react-native-vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import Spotify_Icon_RGB_Green from "../../../assets/logos/Spotify_Icon_RGB_Green.png";
import default_avi from "../../../assets/images/default_avi.jpg";
import { Context as AuthContext } from "../../../context/auth-context";
import { Context as PlaylistContext } from "../../../context/playlist-context";
import moment from "moment";

const windowWidth = Dimensions.get("window").width;

const ProfileScreen = () => {
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const params = useLocalSearchParams();
  const { userID } = params;
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);
  const profileData = playlistContext?.state?.userProfileData;
  const playlistData = playlistContext?.state?.userPlaylistData?.results;
  const nextPage = playlistContext?.state?.userPlaylistData?.next;

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

  console.log(playlistData);

  useEffect(() => {
    const fetchData = async () => {
      const user = await authContext?.getCurrentUser();
      setCurrentUser(user);
      await playlistContext?.getPlaylistData(userID);
      const isUserFollowing = await playlistContext?.getProfileData(userID);
      setIsFollowing(isUserFollowing);
    };
    fetchData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    playlistContext
      ?.getPlaylistData(userID)
      .then(() => playlistContext?.getProfileData(userID))
      .then((res) => setIsFollowing(res))
      .finally(() => setIsRefreshing(false));
  };

  //Navigate to playlist detail screen
  const onPlaylistDetail = async (item) => {
    router.push({
      pathname: "playlist-screen",
      params: {
        playlist_id: item.id,
        userToken: authContext?.state.token,
        fromTab: "user-profile",
      },
    });
  };

  const onBack = () => router.back();

  const onEditProfile = () =>
    router.push({
      pathname: "edit-profile",
      params: profileData,
    });

  const onFollowUser = () => {
    playlistContext?.followUser({ to_user: userID, currentUser });
    setIsFollowing(true);
  };

  const onUnfollowUser = () => {
    playlistContext?.unfollowUser({ to_user: userID, currentUser });
    setIsFollowing(false);
  };

  const onFollowers = () => {
    router.navigate({
      pathname: "followers-list",
      params: { user_id: currentUser },
    });
  };

  const onFollowing = (item) => {
    router.navigate({
      pathname: "following-list",
      params: item,
    });
  };

  const loadMore = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getPlaylistData(userID, nextPage);
      setLoading(false);
    }
  };

  const renderProfileData = () => {
    return !profileData ? null : (
      <View style={styles.profileContainer}>
        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={
              profileData?.avi_pic ? { uri: profileData?.avi_pic } : default_avi
            }
          />
        </View>
        {profileData?.name && (
          <Text style={styles.profileName}>
            {profileData?.name ? profileData.name : null}
          </Text>
        )}
        {profileData?.bio && (
          <Text style={styles.profileBio}>{profileData.bio}</Text>
        )}
        <View style={styles.followInfoContainer}>
          <TouchableOpacity onPress={() => onFollowing()}>
            <View style={styles.followInfoItem}>
              <Text style={styles.followCount}>
                {profileData?.following.length}
              </Text>
              <Text style={styles.followLabel}>Following</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onFollowers()}>
            <View style={styles.followInfoItem}>
              <Text style={styles.followCount}>
                {profileData?.followers.length}
              </Text>
              <Text style={styles.followLabel}>Followers</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtonsContainer}>
          {!profileData?.spotify_url || "null" ? null : (
            <TouchableOpacity
              onPress={() => Linking.openURL(profileData?.spotify_url)}
            >
              <View style={styles.spotifyButton}>
                <Image
                  style={{ width: 15, height: 15 }}
                  source={Spotify_Icon_RGB_Green}
                />
              </View>
            </TouchableOpacity>
          )}
          {currentUser === userID ? (
            <TouchableOpacity onPress={() => onEditProfile()}>
              <View style={styles.editProfileButton}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </View>
            </TouchableOpacity>
          ) : isFollowing ? (
            <TouchableOpacity onPress={onUnfollowUser}>
              <View style={styles.unfollowButton}>
                <Text style={styles.unfollowText}>Unfollow</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onFollowUser}>
              <View style={styles.followButton}>
                <Text style={styles.followText}>Follow</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPlaylistData = ({ item }) => (
    <View style={styles.playlistContainer}>
      <Pressable
        onPress={() => onPlaylistDetail(item)}
        style={styles.playlistCard}
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
        <Pressable
          style={styles.spotifyButton}
          onPress={() => Linking.openURL(item.playlist_url)}
        >
          <Image
            style={{ width: 15, height: 15 }}
            source={Spotify_Icon_RGB_Green}
          />
        </Pressable>
      </Pressable>
      <Text style={styles.timestamp}>{moment(item.date).fromNow()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Pressable onPress={onBack}>
          <View style={styles.backButtonContainer}>
            <Ionicons name="chevron-back" size={25} color="white" />
          </View>
        </Pressable>
        {profileData && (
          <Text style={styles.textUser}>@{profileData.username}</Text>
        )}
        <View style={{ height: 50, width: 50 }} />
      </View>
      {!profileData ? null : (
        <SectionList
          sections={[
            { title: "Profile", data: [profileData] },
            { title: "Playlists", data: playlistData || [] },
          ]}
          keyExtractor={(item, index) =>
            item?.id ? item.id.toString() : index.toString()
          }
          renderItem={({ item, section }) =>
            section.title === "Profile"
              ? renderProfileData()
              : renderPlaylistData({ item })
          }
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && <ActivityIndicator style={styles.loadingIndicator} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#111111",
    flex: 1,
  },
  container: {
    backgroundColor: "#111111",
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#252525",
    borderBottomWidth: 0.3,
    alignItems: "center",
  },
  backButtonContainer: {
    height: 50,
    width: 50,
    paddingLeft: 12,
    justifyContent: "center",
  },
  textUser: {
    fontSize: 14,
    color: "white",
    fontWeight: "700",
  },
  profileContainer: {
    flexDirection: "column",
    paddingVertical: 12,
    alignItems: "center",
  },
  avatarContainer: {
    height: 64,
    width: 64,
    borderRadius: 50,
    backgroundColor: "black",
    justifyContent: "center",
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 50,
    backgroundColor: "#1d1d1d",
    alignSelf: "center",
  },
  profileName: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    marginTop: 6,
  },
  profileBio: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
    textAlign: "left",
    marginTop: 4,
  },
  followInfoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: 300,
    marginTop: 6,
  },
  followInfoItem: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  followCount: {
    fontSize: 13,
    color: "white",
  },
  followLabel: {
    fontSize: 13,
    color: "lightgrey",
    paddingLeft: 6,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 6,
  },
  spotifyButton: {
    height: 35,
    width: 35,
    borderRadius: 30,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
  },
  editProfileButton: {
    height: 35,
    width: 100,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
  },
  editProfileText: {
    fontSize: 13,
    color: "white",
  },
  unfollowButton: {
    height: 35,
    width: 100,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
  },
  unfollowText: {
    fontSize: 13,
    color: "white",
  },
  followButton: {
    height: 35,
    width: 100,
    backgroundColor: "#246EE9",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
  },
  followText: {
    fontSize: 13,
    color: "white",
  },
  playlistContainer: {
    justifyContent: "center",
    width: windowWidth,
    alignItems: "center",
    marginBottom: 14,
  },
  playlistCard: {
    width: windowWidth - 18,
    height: 120,
    backgroundColor: "#181818",
    borderRadius: 10,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
  },
  playlistCover: {
    width: 100,
    height: 100,
    resizeMode: "cover",
    backgroundColor: "#1f1f1f",
  },
  playlistInfoContainer: {
    flexDirection: "column",
    paddingLeft: 10,
  },
  playlistTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    width: windowWidth / 2,
  },
  playlistType: {
    color: "lightgrey",
    fontWeight: "500",
    fontSize: 13,
    marginTop: 2,
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
});

export default ProfileScreen;
