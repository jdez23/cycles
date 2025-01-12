import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Context as AuthContext } from "../../context/auth-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Context as PlaylistContext } from "../../context/playlist-context";
import { router, useLocalSearchParams } from "expo-router";
import Toast from "react-native-root-toast";
import * as SecureStore from "expo-secure-store";
import default_avi from "../../assets/images/default_avi.jpg";

const window = Dimensions.get("window").width;

const HashtagPlaylists = () => {
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = React.useState(null);
  const params = useLocalSearchParams();
  const hashtag = params?.hashtag;
  const getUserID = async () => await SecureStore.getItemAsync("user_id");

  const playlistContext = useContext(PlaylistContext);
  const nextPage = playlistContext?.state?.hashtagPlaylists?.next;
  const hashtagPlaylists = playlistContext?.state?.hashtagPlaylists?.results;

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

  //Call fetch hashtag playlists function
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    playlistContext?.getPlaylistByHashtag(hashtag);
  }, [authContext?.state?.token]);

  const loadMorePlaylists = async () => {
    if (nextPage && !loading) {
      setLoading(true);
      await playlistContext?.getPlaylistByHashtag(nextPage);
      setLoading(false);
    }
  };

  const wait = (timeout) => {
    // Defined the timeout function for testing purpose
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  //Navigate to playlist detail screen
  const onPlaylistDetail = async (item) => {
    const me = await getUserID();
    router.push({
      pathname: "/screens/playlist-screen",
      params: { playlist_id: item.id, me: me },
    });
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setLoadingData(true);
    playlistContext?.getPlaylistByHashtag(hashtag, nextPage);
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

  const onUserPic = async (item) => {
    const me = await getUserID();
    router.push({
      pathname: "/screens/user-profile",
      params: { userID: item.user.id, playlist_id: item.id, me: me },
    });
  };

  //Navigate back to previous screen
  const onBack = () => {
    router.back();
  };

  // const renderHashtagPlaylist = ({ item }) => (
  //   <View
  //     style={{
  //       marginTop: 6,
  //       marginHorizontal:
  //         playlistContext?.state?.hashtagPlaylists?.results[0]?.length > 1
  //           ? 2
  //           : 12,
  //       marginBottom: 12,
  //       width: window / 2 - 12,
  //       alignItems: "center",
  //     }}
  //   >
  //     <Pressable
  //       onPress={() => onPlaylistDetail(item)}
  //       style={{
  //         flexDirection: "column",
  //         justifyContent: "center",
  //         width: window / 2 - 22,
  //       }}
  //     >
  //       {item.playlist_cover ? (
  //         <Image
  //           style={{
  //             width: window / 2 - 22,
  //             height: window / 2 - 22,
  //             backgroundColor: "#1f1f1f",
  //           }}
  //           source={{ uri: item.playlist_cover }}
  //         />
  //       ) : null}
  //     </Pressable>
  //     <View
  //       style={{
  //         flexDirection: "row",
  //         alignItems: "center",
  //         marginTop: 10,
  //         width: window / 2 - 22,
  //       }}
  //     >
  //       <Pressable
  //         onPress={() => onUserPic(item)}
  //         style={{
  //           height: 30,
  //           width: 30,
  //           borderRadius: 30,
  //           backgroundColor: "#1f1f1f",
  //         }}
  //       >
  //         <Image
  //           style={{ height: 30, width: 30, borderRadius: 30 }}
  //           source={
  //             item?.user?.avi_pic ? { uri: item?.user?.avi_pic } : default_avi
  //           }
  //         />
  //       </Pressable>
  //       <View
  //         style={{
  //           flexDirection: "column",
  //           marginLeft: 8,
  //           width: window / 2 - 60,
  //         }}
  //       >
  //         <Pressable onPress={() => onUserPic(item)}>
  //           <Text
  //             style={{
  //               textAlign: "left",
  //               color: "white",
  //               fontSize: 13,
  //             }}
  //             numberOfLines={1}
  //           >
  //             {item?.user?.username}
  //           </Text>
  //         </Pressable>

  //         <Text
  //           style={{
  //             textAlign: "left",
  //             color: "lightgrey",
  //             fontSize: 12,
  //             marginTop: 1,
  //           }}
  //           numberOfLines={1}
  //         >
  //           {item.playlist_title}
  //         </Text>
  //       </View>
  //     </View>
  //   </View>
  // );

  // if (isLoading) {
  //   return (
  //     <View
  //       style={{
  //         flex: 1,
  //         justifyContent: "center",
  //         backgroundColor: "#151515",
  //         alignItems: "center",
  //       }}
  //     >
  //       <ActivityIndicator size="small" />
  //     </View>
  //   );
  // }

  // return (
  //   <View style={StyleSheet.create({ backgroundColor: "#111111", flex: 1 })}>
  //     <SafeAreaView style={styles.header}>
  //       <TouchableOpacity onPress={onBack}>
  //         <View style={styles.icon_box}>
  //           <Ionicons name="chevron-back" size={20} color={"white"} />
  //         </View>
  //       </TouchableOpacity>
  //       <Text style={styles.header_text}>{hashtag}</Text>
  //       <View style={styles.icon_box} />
  //     </SafeAreaView>
  //     {!hashtagPlaylists ? null : (
  //       <View
  //         style={{
  //           alignItems: "center",
  //           flex: 1,
  //         }}
  //       >
  //         <FlatList
  //           data={hashtagPlaylists}
  //           initialNumToRender={10}
  //           renderItem={renderHashtagPlaylist}
  //           keyExtractor={(item) => item.id}
  //           numColumns={2}
  //           onEndReached={loadMorePlaylists}
  //           onEndReachedThreshold={0.5}
  //           refreshing={isRefreshing}
  //           onRefresh={onRefresh}
  //           ListFooterComponent={
  //             loading ? (
  //               <View style={styles.loadingContainer}>
  //                 <ActivityIndicator size="small" />
  //               </View>
  //             ) : null
  //           }
  //         />
  //       </View>
  //     )}
  //   </View>
  // );

  const renderHashtagPlaylist = ({ item }) => (
    <View
      style={{
        margin: 12,
        marginHorizontal: 6,
        width: (window - 36) / 2, // Adjust for consistent spacing
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={() => onPlaylistDetail(item)}
        style={{
          width: window / 2 - 18,
        }}
      >
        {item.playlist_cover && (
          <Image
            style={{
              width: "100%",
              height: window / 2 - 18,
              backgroundColor: "#1f1f1f",
            }}
            source={{ uri: item.playlist_cover }}
          />
        )}
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
          width: "100%",
        }}
      >
        <Pressable
          onPress={() => onUserPic(item)}
          style={{
            height: 30,
            width: 30,
            borderRadius: 15,
            backgroundColor: "#1f1f1f",
          }}
        >
          <Image
            style={{
              height: 30,
              width: 30,
              borderRadius: 15,
            }}
            source={
              item?.user?.avi_pic ? { uri: item?.user?.avi_pic } : default_avi
            }
          />
        </Pressable>
        <View
          style={{
            flexDirection: "column",
            marginLeft: 8,
            flex: 1, // Allow text to grow within available space
          }}
        >
          <Pressable onPress={() => onUserPic(item)}>
            <Text
              style={{
                color: "white",
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {item?.user?.username}
            </Text>
          </Pressable>
          <Text
            style={{
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
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <View style={styles.iconBox}>
            <Ionicons name="chevron-back" size={20} color={"white"} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerText}>{hashtag}</Text>
        <View style={styles.iconBox} />
      </SafeAreaView>
      <FlatList
        data={hashtagPlaylists}
        initialNumToRender={10}
        renderItem={renderHashtagPlaylist}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        onEndReached={loadMorePlaylists}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: hashtagPlaylists?.length > 1 ? "center" : null,
          paddingHorizontal: 12, // Ensure 12px padding on both sides
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#151515",
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#232323",
  },
  headerText: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
  iconBox: {
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#151515",
  },
});

// const styles = StyleSheet.create({
//   header_text: {
//     fontSize: 14,
//     color: "white",
//     fontWeight: "600",
//   },
//   header: {
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#232323",
//   },
//   icon_box: {
//     height: 50,
//     width: 50,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   card_selected: {
//     marginHorizontal: 6,
//     backgroundColor: "#2f2f2f",
//     paddingVertical: 14,
//     paddingHorizontal: 8,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   card_not_selected: {
//     marginHorizontal: 6,
//     backgroundColor: "#1f1f1f",
//     paddingVertical: 14,
//     paddingHorizontal: 8,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   loadingContainer: {
//     paddingTop: 30,
//     paddingBottom: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });

export default HashtagPlaylists;
