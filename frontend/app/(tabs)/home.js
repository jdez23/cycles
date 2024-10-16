// import React, { useEffect, useState, useContext, useRef } from "react";

// import {
//   FlatList,
//   StyleSheet,
//   ScrollView,
//   View,
//   Image,
//   Text,
//   Pressable,
//   SafeAreaView,
//   ImageBackground,
//   RefreshControl,
//   ActivityIndicator,
//   Linking,
//   Dimensions,
//   TouchableOpacity,
// } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// // import envs from '../../../Config/env';
// import ActionSheet from "react-native-actionsheet";
// import Header from "../../components/header";
// import Spotify_Icon_RGB_Green from "../../assets/logos/Spotify_Icon_RGB_Green.png";
// import Toast from "react-native-root-toast";
// import moment from "moment";
// import * as SecureStore from "expo-secure-store";
// import { Context as PlaylistContext } from "../../context/playlist-context";
// import { router } from "expo-router";
// import default_avi from "../../assets/images/default_avi.jpg";

// const window = Dimensions.get("window").width;

// const FollowingFeed = () => {
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [loadingData, setLoadingData] = useState(false); // Refresh
//   const [loading, setLoading] = useState(false); // Load more
//   const optionArray = ["Go to profile", "Go to playlist", "Cancel"];
//   let actionSheet = useRef();
//   const [toast, setToast] = useState(null);
//   const playlistContext = useContext(PlaylistContext);
//   const nextPage = playlistContext?.state?.followingPlaylists?.next;
//   const playlists = playlistContext?.state?.followingPlaylists;
//   const getUserID = async () => await SecureStore.getItemAsync("user_id");

//   useEffect(() => {
//     if (playlistContext?.state?.errorMessage) {
//       setToast(
//         Toast.show(playlistContext?.state?.errorMessage, {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.CENTER,
//           onHidden: () =>
//             playlistContext?.dispatch({ type: "clear_error_message" }),
//         })
//       );
//     } else if (toast) {
//       Toast.hide(toast);
//     }
//   }, [playlistContext?.state?.errorMessage]);

//   // Call API function to fetch following playlists
//   useEffect(() => {
//     playlistContext?.getFollowersPlaylists();
//   }, []);

//   const wait = (timeout) => {
//     // Defined the timeout function for testing purpose
//     return new Promise((resolve) => setTimeout(resolve, timeout));
//   };

//   const onRefresh = () => {
//     setIsRefreshing(true);
//     setLoadingData(true);
//     playlistContext?.getFollowersPlaylists();
//     loadingData == true ? (
//       <View>
//         <ActivityIndicator color="#f0f8ff" />
//       </View>
//     ) : null;
//     wait(2000).then(() => setIsRefreshing(false), setLoadingData(false));
//   };

//   //Navigate to playlist detail screen
//   const onPlaylistDetail = async (item) => {
//     const me = await getUserID();
//     router.navigate({
//       pathname: "playlist-screen",
//       params: { playlist_id: item.id, me: me },
//     });
//   };

//   //Show action sheet
//   const showActionSheet = () => {
//     actionSheet.current.show();
//   };

//   const onActionSelect = (index, item) => {
//     if (index === 0) {
//       onUserPic(item);
//     } else if (index === 1) {
//       onPlaylistDetail(item);
//     }
//   };

//   //Navigate to user profile
//   const onUserPic = async (item) => {
//     const me = await getUserID();
//     router.push({
//       pathname: "user-profile",
//       params: { userID: item.user, playlist_id: item.id, me: me },
//     });
//   };

//   const _renderItem = ({ item }) => (
//     <View
//       style={{
//         marginVertical: 12,
//         justifyContent: "center",
//         width: window,
//         alignItems: "center",
//       }}
//     >
//       <View
//         style={{
//           paddingHorizontal: 13,
//           width: window,
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//           }}
//         >
//           <TouchableOpacity
//             onPress={() => onUserPic(item)}
//             style={{
//               height: 35,
//               width: 35,
//               borderRadius: 30,
//               backgroundColor: "#1f1f1f",
//             }}
//           >
//             <Image
//               style={{
//                 height: 35,
//                 width: 35,
//                 borderRadius: 30,
//                 backgroundColor: "#1f1f1f",
//               }}
//               source={item.avi_pic ? { uri: item?.avi_pic } : default_avi}
//             />
//           </TouchableOpacity>
//           <View
//             style={{
//               flexDirection: "column",
//               marginLeft: 10,
//               alignContent: "center",
//             }}
//           >
//             <TouchableOpacity onPress={() => onUserPic(item)}>
//               <Text
//                 style={{
//                   textAlign: "left",
//                   color: "white",
//                   fontSize: 13,
//                   fontWeight: "700",
//                 }}
//               >
//                 {"@" + item.username}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//         <TouchableOpacity
//           style={{
//             height: 35,
//             width: 35,
//             justifyContent: "center",
//             alignItems: "center",
//             borderRadius: 20,
//           }}
//           onPress={showActionSheet}
//         >
//           <Ionicons
//             name="ellipsis-horizontal"
//             size={20}
//             color={"white"}
//             style={{ alignSelf: "center" }}
//           />
//           <ActionSheet
//             ref={actionSheet}
//             options={optionArray}
//             onPress={(index) => onActionSelect(index, item)}
//             cancelButtonIndex={2}
//           />
//         </TouchableOpacity>
//       </View>
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
//             marginTop: 8,
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
//                   fontWeight: "600",
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
//               borderRadius: 30,
//               backgroundColor: "#1f1f1f",
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
//           textAlign: "left",
//           color: "lightgrey",
//           fontSize: 12,
//           alignSelf: "flex-start",
//           marginTop: 6,
//           marginLeft: 18,
//         }}
//       >
//         {moment(item.date).fromNow()}
//       </Text>
//     </View>
//   );

//   const loadMorePlaylists = async () => {
//     if (nextPage && !loading) {
//       setLoading(true);
//       await playlistContext?.getSpotifyPlaylist(nextPage);
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.screen}>
//       <Header />
//       {playlists?.[0] && playlists?.[0] != [] ? (
//         <View
//           style={{
//             alignItems: "center",
//             flex: 1,
//           }}
//         >
//           <FlatList
//             showsVerticalScrollIndicator={false}
//             data={playlists}
//             renderItem={_renderItem}
//             refreshing={isRefreshing}
//             onRefresh={onRefresh}
//             onEndReached={() => loadMorePlaylists(nextPage)}
//             onEndReachedThreshold={0.5}
//             ListFooterComponent={
//               loading ? (
//                 <View style={styles.loadingContainer}>
//                   <ActivityIndicator size="small" />
//                 </View>
//               ) : null
//             }
//           ></FlatList>
//         </View>
//       ) : (
//         <ScrollView
//           style={{ flex: 1, width: window }}
//           contentContainerStyle={{ paddingTop: 60 }}
//           refreshControl={
//             <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
//           }
//         >
//           <View style={{ alignItems: "center" }}>
//             <Text
//               style={{
//                 color: "white",
//                 fontSize: 14,
//                 textAlign: "center",
//                 fontFamily: "Futura",
//                 fontWeight: "bold",
//                 width: 200,
//               }}
//             >
//               Find playlists in the discover tab.
//             </Text>
//           </View>
//         </ScrollView>
//       )}
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   screen: {
//     backgroundColor: "#111111",
//     alignItems: "center",
//     flex: 1,
//   },
// });

// export default FollowingFeed;

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
    router.navigate({
      pathname: "/screens/playlist-screen",
      params: { playlist_id: item.id, me },
    });
  };

  const onUserPic = async (item) => {
    const me = await SecureStore.getItemAsync("user_id");
    router.push({
      pathname: "user-profile",
      params: { userID: item.user, playlist_id: item.id, me },
    });
  };

  const onActionSelect = (index, item) => {
    if (index === 0) {
      onUserPic(item);
    } else if (index === 1) {
      onPlaylistDetail(item);
    }
  };

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
          onPress={() => actionSheet.current.show()}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          <ActionSheet
            ref={actionSheet}
            options={["Go to profile", "Go to playlist", "Cancel"]}
            onPress={(index) => onActionSelect(index, item)}
            cancelButtonIndex={2}
          />
        </TouchableOpacity>
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
