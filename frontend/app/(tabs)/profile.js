// import { router } from "expo-router";
// import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";
// import React, { useContext, useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Pressable,
//   FlatList,
//   SectionList,
//   SafeAreaView,
//   Dimensions,
//   TouchableOpacity,
//   TouchableHighlight,
//   ActivityIndicator,
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import * as SecureStore from "expo-secure-store";
// import { Context as AuthContext } from "../../context/auth-context";
// import { Context as PlaylistContext } from "../../context/playlist-context";
// import Toast from "react-native-root-toast";
// import { Linking } from "react-native";
// import moment from "moment";
// import default_avi from "../../assets/images/default_avi.jpg";

// const window = Dimensions.get("window").width;

// const MyProfile = () => {
//   const getUserID = async () => await SecureStore.getItemAsync("user_id", {});
//   const [toast, setToast] = useState("");
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [loadingData, setLoadingData] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const authContext = useContext(AuthContext);
//   const playlistContext = useContext(PlaylistContext);
//   const myProfileData = playlistContext?.state?.myProfileData;
//   const myPlaylistData = playlistContext?.state?.myPlaylistData?.results;
//   const nextPage = playlistContext?.state?.myPlaylistData?.next;
//   const props = {
//     profile_data: playlistContext?.state?.myProfileData,
//     avi_pic: playlistContext?.state?.myProfileData?.avi_pic,
//     bio: playlistContext?.state?.myProfileData?.bio,
//     name: playlistContext?.state?.myProfileData?.name,
//     spotify_url: playlistContext?.state?.myProfileData?.spotify_url,
//     username: playlistContext?.state?.myProfileData?.username,
//   };

//   console.log(myProfileData);

//   useEffect(() => {
//     if (authContext?.state?.errorMessage) {
//       setToast(
//         Toast.show(authContext?.state?.errorMessage, {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.CENTER,
//           onHidden: () =>
//             authContext?.dispatch({ type: "clear_error_message" }),
//         })
//       );
//     } else if (toast) {
//       Toast.hide(toast);
//     }
//   }, [authContext?.state?.errorMessage]);

//   //Call to fetch current users profile data
//   useEffect(() => {
//     playlistContext?.getMyProfileData();
//     playlistContext?.getMyPlaylistData();
//   }, []);

//   const wait = (timeout) => {
//     // Defined the timeout function for testing purpose
//     return new Promise((resolve) => setTimeout(resolve, timeout));
//   };

//   const onRefresh = () => {
//     setIsRefreshing(true);
//     setLoadingData(true);
//     playlistContext?.getMyPlaylistData();
//     playlistContext?.getMyProfileData();
//     loadingData == true ? (
//       <View
//         style={{
//           justifyContent: "flex-start",
//           alignItems: "flex-start",
//         }}
//       >
//         <ActivityIndicator color={"white"} size="large" />
//       </View>
//     ) : null;
//     wait(1000).then(() => setIsRefreshing(false), setLoadingData(false));
//   };

//   //Navigate to playlist detail screen
//   const onPlaylistDetail = async (item) => {
//     router.push({
//       pathname: "playlist-screen",
//       params: {
//         playlist_id: item.id,
//         userToken: authContext?.state.token,
//       },
//     });
//   };

//   const onEditProfile = () => {
//     router.push({
//       pathname: "edit-profile",
//       params: props,
//       merge: true,
//     });
//   };

//   const onProfileSettings = () => {
//     router.push({
//       pathname: "profile-settings",
//       params: { user_id: myProfileData?.id, fromTab: "profile" },
//     });
//   };

//   const onFollowers = async () => {
//     const user_id = await getUserID();
//     router.push({
//       pathname: "followers-list",
//       params: { id: user_id },
//     });
//   };

//   const onFollowing = async () => {
//     const user_id = await getUserID();
//     router.push({ pathname: "following-list", params: { id: user_id } });
//   };

//   const loadMore = async () => {
//     if (nextPage && !loading) {
//       setLoading(true);
//       await playlistContext?.getMyPlaylistData(nextPage);
//       setLoading(false);
//     }
//   };

//   // Render profile data
//   const renderProfileData = () => {
//     return myProfileData ? (
//       <View
//         style={{
//           flexDirection: "column",
//           paddingVertical: 12,
//         }}
//       >
//         <View
//           style={{
//             height: 64,
//             width: 64,
//             borderRadius: 50,
//             alignSelf: "center",
//             backgroundColor: "black",
//             justifyContent: "center",
//           }}
//         >
//           <View
//             style={{
//               height: 60,
//               width: 60,
//               borderRadius: 50,
//               alignSelf: "center",
//               backgroundColor: "#1d1d1d",
//             }}
//           >
//             <Image
//               resizeMode="cover"
//               style={{
//                 height: 60,
//                 width: 60,
//                 borderRadius: 50,
//                 alignSelf: "center",
//               }}
//               source={
//                 myProfileData?.avi_pic
//                   ? { uri: myProfileData.avi_pic }
//                   : default_avi
//               }
//             />
//           </View>
//         </View>
//         {!myProfileData?.name ? null : (
//           <View
//             style={{
//               width: 300,
//               alignSelf: "center",
//               marginTop: 6,
//             }}
//           >
//             <Text
//               style={{
//                 alignSelf: "center",
//                 fontSize: 14,
//                 color: "white",
//                 fontWeight: "600",
//               }}
//             >
//               {myProfileData?.name}
//             </Text>
//           </View>
//         )}
//         {myProfileData?.bio ? (
//           <View
//             style={{
//               width: 300,
//               alignSelf: "center",
//               marginTop: 4,
//             }}
//           >
//             <Text
//               style={{
//                 alignSelf: "center",
//                 fontSize: 13,
//                 fontWeight: "600",
//                 color: "white",
//                 textAlign: "left",
//               }}
//             >
//               {myProfileData?.bio}
//             </Text>
//           </View>
//         ) : null}
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "center",
//             width: 300,
//             alignSelf: "center",
//             marginTop: 6,
//           }}
//         >
//           <TouchableOpacity onPress={() => onFollowing(myProfileData)}>
//             <View
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "center",
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: 13,
//                   color: "white",
//                 }}
//               >
//                 {myProfileData?.following.length}
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 13,
//                   color: "lightgrey",
//                   paddingLeft: 6,
//                 }}
//               >
//                 Following
//               </Text>
//             </View>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => onFollowers(myProfileData)}>
//             <View
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "center",
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: 13,
//                   color: "white",
//                   paddingLeft: 8,
//                 }}
//               >
//                 {myProfileData?.followers.length}
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 13,
//                   color: "lightgrey",
//                   paddingLeft: 6,
//                 }}
//               >
//                 Followers
//               </Text>
//             </View>
//           </TouchableOpacity>
//         </View>
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "center",
//             alignItems: "center",
//             marginVertical: 6,
//           }}
//         >
//           {!myProfileData?.spotify_url ? null : (
//             <TouchableOpacity
//               style={{ paddingRight: 6 }}
//               onPress={() => Linking.openURL(myProfileData?.spotify_url)}
//             >
//               <View
//                 style={{
//                   height: 35,
//                   width: 35,
//                   borderRadius: 30,
//                   backgroundColor: "#181818",
//                   alignItems: "center",
//                   justifyContent: "center",
//                 }}
//               >
//                 <Image
//                   style={{ width: 20, height: 20 }}
//                   source={Spotify_Icon_RGB_Green}
//                 />
//               </View>
//             </TouchableOpacity>
//           )}
//           <TouchableOpacity
//             onPress={() => onEditProfile()}
//             style={{ marginTop: 4, borderRadius: 20 }}
//           >
//             <View
//               style={{
//                 height: 35,
//                 width: 100,
//                 backgroundColor: "#181818",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 borderRadius: 30,
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: 13,
//                   color: "white",
//                 }}
//               >
//                 Edit Profile
//               </Text>
//             </View>
//           </TouchableOpacity>
//         </View>
//       </View>
//     ) : null;
//   };

//   // Render playlist data
//   const renderMyPlaylistData = ({ item }) => (
//     <View
//       style={{
//         justifyContent: "center",
//         width: window,
//         alignItems: "center",
//         marginBottom: 14,
//       }}
//     >
//       {item?.playlist_cover ? (
//         <Pressable
//           onPress={() => onPlaylistDetail(item)}
//           style={{
//             width: window - 18,
//             height: 120,
//             backgroundColor: "#181818",
//             borderRadius: 10,
//             justifyContent: "space-between",
//             flexDirection: "row",
//             alignItems: "center",
//             paddingHorizontal: 9,
//           }}
//         >
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//             }}
//           >
//             <Image
//               style={{
//                 width: 100,
//                 height: 100,
//                 resizeMode: "cover",
//                 backgroundColor: "#1f1f1f",
//               }}
//               source={{ uri: item.playlist_cover }}
//             />
//             <View
//               style={{
//                 flexDirection: "column",
//                 alignSelf: "center",
//                 paddingLeft: 10,
//               }}
//             >
//               <Text
//                 numberOfLines={2}
//                 style={{
//                   color: "white",
//                   fontSize: 13,
//                   fontWeight: "700",
//                   width: window / 2,
//                 }}
//               >
//                 {item.playlist_title}
//               </Text>
//               <Text
//                 style={{
//                   marginTop: 2,
//                   color: "lightgrey",
//                   fontWeight: "500",
//                   fontSize: 13,
//                 }}
//               >
//                 {item.playlist_type}
//               </Text>
//             </View>
//           </View>
//           <Pressable
//             style={{
//               height: 25,
//               width: 25,
//               borderRadius: 40,
//               backgroundColor: "#111111",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//             onPress={() => Linking.openURL(item.playlist_url)}
//           >
//             <Image
//               style={{ width: 15, height: 15 }}
//               source={Spotify_Icon_RGB_Green}
//             />
//           </Pressable>
//         </Pressable>
//       ) : (
//         <View
//           style={{
//             height: window,
//             alignItems: "center",
//             justifyContent: "flex-end",
//             backgroundColor: "#121212",
//           }}
//         />
//       )}
//       <Text
//         style={{
//           alignSelf: "flex-start",
//           textAlign: "left",
//           color: "lightgrey",
//           fontSize: 12,
//           marginTop: 6,
//           marginLeft: 18,
//         }}
//       >
//         {moment(item.date).fromNow()}
//       </Text>
//     </View>
//   );

//   return (
//     <SafeAreaView
//       style={{
//         backgroundColor: "#111111",
//         flex: 1,
//         width: window,
//       }}
//     >
//       <View style={styles.container} blurRadius={1}>
//         <View style={{ height: 50, width: 50 }} />
//         {myProfileData ? (
//           <Text key={(item) => item.id} style={styles.textUser}>
//             {"@" + myProfileData?.username}
//           </Text>
//         ) : null}
//         <TouchableOpacity
//           style={{
//             height: 50,
//             width: 50,
//             justifyContent: "center",
//             borderRadius: 20,
//           }}
//           onPress={() => onProfileSettings()}
//         >
//           <Ionicons
//             name="ellipsis-horizontal"
//             size={25}
//             color={"white"}
//             style={{ alignSelf: "center" }}
//           />
//         </TouchableOpacity>
//       </View>
//       <FlatList
//         data={myPlaylistData}
//         ListHeaderComponent={renderProfileData}
//         renderItem={renderMyPlaylistData}
//         scrollEnabled={true}
//         refreshing={isRefreshing}
//         onRefresh={onRefresh}
//         initialNumToRender={10}
//         onEndReached={loadMore}
//         onEndReachedThreshold={0.5}
//         ListFooterComponent={
//           loading ? (
//             <View style={styles.loadingContainer}>
//               <ActivityIndicator size="small" />
//             </View>
//           ) : null
//         }
//       ></FlatList>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: "#111111",
//     height: 50,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     borderBottomColor: "#252525",
//     borderBottomWidth: 0.3,
//     alignItems: "center",
//   },
//   textUser: {
//     fontSize: 14,
//     color: "white",
//     fontWeight: "700",
//   },
// });

// export default MyProfile;

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
import { useRouter } from "expo-router";
import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";
import default_avi from "../../assets/images/default_avi.jpg";
import { Context as AuthContext } from "../../context/auth-context";
import { Context as PlaylistContext } from "../../context/playlist-context";
import moment from "moment";

const windowWidth = Dimensions.get("window").width;

const MyProfile = () => {
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const authContext = useContext(AuthContext);
  const playlistContext = useContext(PlaylistContext);
  const myProfileData = playlistContext?.state?.myProfileData;
  const myPlaylistData = playlistContext?.state?.myPlaylistData?.results;
  const nextPage = playlistContext?.state?.myPlaylistData?.next;
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

  useEffect(() => {
    playlistContext?.getMyProfileData();
    playlistContext?.getMyPlaylistData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    playlistContext
      ?.getMyPlaylistData()
      .then(() => playlistContext?.getMyProfileData())
      .finally(() => setIsRefreshing(false));
  };

  const onEditProfile = () => {
    router.push({
      pathname: "edit-profile",
      params: myProfileData,
    });
  };

  const onProfileSettings = () => {
    router.push({
      pathname: "/screens/profile-settings",
      params: { user_id: myProfileData?.id },
    });
  };

  const onFollowers = () => {
    router.push({
      pathname: "followers-list",
      params: { id: myProfileData?.id },
    });
  };

  const onFollowing = () => {
    router.push({
      pathname: "following-list",
      params: { id: myProfileData?.id },
    });
  };

  const loadMore = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getMyPlaylistData(nextPage);
      setLoading(false);
    }
  };

  const renderProfileData = () =>
    myProfileData && (
      <View style={styles.profileContainer}>
        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={
              myProfileData?.avi_pic
                ? { uri: myProfileData?.avi_pic }
                : default_avi
            }
          />
        </View>
        {myProfileData?.name && (
          <Text style={styles.profileName}>{myProfileData.name}</Text>
        )}
        {myProfileData?.bio && (
          <Text style={styles.profileBio}>{myProfileData.bio}</Text>
        )}
        <View style={styles.followInfoContainer}>
          <TouchableOpacity onPress={onFollowing}>
            <View style={styles.followInfoItem}>
              <Text style={styles.followCount}>
                {myProfileData?.following?.length || 0}
              </Text>
              <Text style={styles.followLabel}>Following</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFollowers}>
            <View style={styles.followInfoItem}>
              <Text style={styles.followCount}>
                {myProfileData?.followers?.length || 0}
              </Text>
              <Text style={styles.followLabel}>Followers</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtonsContainer}>
          {!myProfileData?.spotify_url || "null" ? null : (
            <TouchableOpacity
              onPress={() => Linking.openURL(myProfileData?.spotify_url)}
            >
              <View style={styles.spotifyButton}>
                <Image
                  style={{ width: 15, height: 15 }}
                  source={Spotify_Icon_RGB_Green}
                />
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEditProfile} style={{ zIndex: 1 }}>
            <View style={styles.editProfileButton}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );

  const renderMyPlaylistData = ({ item }) => (
    <View style={styles.playlistContainer}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "playlist-screen",
            params: { playlist_id: item.id },
          })
        }
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
            style={{ height: 15, width: 15 }}
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
        <Text style={styles.textUser}>@{myProfileData?.username}</Text>
        <TouchableOpacity
          onPress={onProfileSettings}
          style={styles.settingsButton}
        >
          <Ionicons name="ellipsis-horizontal" size={25} color="white" />
        </TouchableOpacity>
      </View>
      <SectionList
        sections={[
          { title: "Profile", data: [myProfileData] },
          { title: "My Playlists", data: myPlaylistData || [] },
        ]}
        keyExtractor={(item, index) =>
          item?.id ? item.id.toString() : index.toString()
        }
        renderItem={({ item, section }) =>
          section.title === "Profile"
            ? renderProfileData()
            : renderMyPlaylistData({ item })
        }
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loading && <ActivityIndicator style={styles.loadingIndicator} />
        }
      />
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
    alignItems: "center",
    paddingHorizontal: 16,
  },
  textUser: {
    fontSize: 14,
    color: "white",
    fontWeight: "700",
  },
  settingsButton: {
    height: 50,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  profileContainer: {
    flexDirection: "column",
    paddingVertical: 12,
    alignItems: "center",
  },
  avatarContainer: {
    height: 64,
    width: 64,
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
    textAlign: "center",
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

export default MyProfile;
