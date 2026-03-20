import api from "../utils/api";
import context from "./context";

const defaultValue = {
  userProfileData: [],
  userPlaylistData: [],
  myProfileData: [],
  myPlaylistData: [],
  allPlaylists: [],
  followingPlaylists: [],
  playlistDetails: [],
  tracks: [],
  pagination: {
    count: 0,
    next: null,
    previous: null,
  },
  isLiked: false,
  comments: [],
  spotifyPlaylists: [],
  appleMusicPlaylists: [],
  errorMessage: "",
};

const playlistReducer = (state, action) => {
  switch (action.type) {
    case "error_1":
      return {
        ...state,
        errorMessage: action.payload,
      };
    case "clear_error_message":
      return {
        ...state,
        errorMessage: "",
      };
    case "userProfileData":
      return {
        ...state,
        userProfileData: action.userProfileData,
      };
    case "userPlaylistData":
      if (action.append) {
        return {
          ...state,
          userPlaylistData: {
            ...action.userPlaylistData,
            results: [
              ...(state.userPlaylistData?.results || []),
              ...(action.userPlaylistData?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        userPlaylistData: action.userPlaylistData,
      };
    case "myProfileData":
      return {
        ...state,
        myProfileData: action.myProfileData,
      };
    case "myPlaylistData":
      if (action.append) {
        return {
          ...state,
          myPlaylistData: {
            ...action.myPlaylistData,
            results: [
              ...(state.myPlaylistData?.results || []),
              ...(action.myPlaylistData?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        myPlaylistData: action.myPlaylistData,
      };
    case "allPlaylists":
      if (action.append) {
        return {
          ...state,
          has_uploaded: action.has_uploaded,
          allPlaylists: {
            ...state.allPlaylists,
            results: [
              ...(state.allPlaylists?.results || []),
              ...(action.allPlaylists?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        allPlaylists: action.allPlaylists,
        has_uploaded: action.has_uploaded,
      };
    case "followingPlaylists":
      if (action.append) {
        return {
          ...state,
          followingPlaylists: {
            ...action.followingPlaylists,
            results: [
              ...(state.followingPlaylists?.results || []),
              ...(action.followingPlaylists?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        followingPlaylists: action.followingPlaylists,
      };
    case "hashtagPlaylists":
      if (action.append) {
        return {
          ...state,
          hashtagPlaylists: {
            ...action.hashtagPlaylists,
            results: [
              ...(state.hashtagPlaylists?.results || []),
              ...(action.hashtagPlaylists?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        hashtagPlaylists: action.hashtagPlaylists,
      };
    case "playlistDetails":
      return {
        ...state,
        playlist: action.playlist,
      };
    case "playlistTracks":
      return {
        ...state,
        tracks: action.tracks,
        pagination: action.pagination,
      };
    case "addTracks":
      return {
        ...state,
        tracks: [...state.tracks, ...action.tracks],
        pagination: action.pagination,
      };
    case "comments":
      if (action.append) {
        return {
          ...state,
          comments: {
            ...action.comments,
            results: [
              ...(state.comments?.results || []),
              ...(action.comments?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        comments: action.comments,
      };
    case "isLiked":
      return {
        ...state,
        isLiked: action.isLiked,
      };
    case "spotifyPlaylists":
      if (action.append) {
        return {
          ...state,
          spotifyPlaylists: {
            ...action.spotifyPlaylists,
            results: [
              ...(state.spotifyPlaylists?.results || []),
              ...(action.spotifyPlaylists?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        spotifyPlaylists: action.spotifyPlaylists,
      };
    case "appleMusicPlaylists":
      if (action.append) {
        return {
          ...state,
          appleMusicPlaylists: {
            ...action.appleMusicPlaylists,
            results: [
              ...(state.appleMusicPlaylists?.results || []),
              ...(action.appleMusicPlaylists?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        appleMusicPlaylists: action.appleMusicPlaylists,
      };
    case "selectedSpotifyPlaylist":
      return {
        ...state,
        selectedSpotifyPlaylist: action.selectedSpotifyPlaylist,
      };
    case "selectedAppleMusicPlaylist":
      return {
        ...state,
        selectedAppleMusicPlaylist: action.selectedAppleMusicPlaylist,
      };
    case "isSelected":
      return {
        ...state,
        isSelected: action.isSelected,
      };
    case "following":
      if (action.append) {
        return {
          ...state,
          following: {
            ...action.following,
            results: [
              ...(state.following?.results || []),
              ...(action.following?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        following: action.following,
      };
    case "followers":
      if (action.append) {
        return {
          ...state,
          followers: {
            ...action.followers,
            results: [
              ...(state.followers?.results || []),
              ...(action.followers?.results || []),
            ],
          },
        };
      }
      return {
        ...state,
        followers: action.followers,
      };
    default:
      return state;
  }
};

const getMyProfileData = (dispatch) => async () => {
  try {
    const res = await api.get("/users/user/me/");
    dispatch({ type: "myProfileData", myProfileData: res.data });
  } catch (error) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const getMyPlaylistData =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const url = nextPage || "/feed/my-playlists/";
      const res = await api.get(url);
      dispatch({
        type: "myPlaylistData",
        myPlaylistData: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getAllPlaylists =
  (dispatch) =>
  async (nextFeed = null) => {
    try {
      const url = nextFeed || "/feed/playlist/";
      const res = await api.get(url);
      dispatch({
        type: "allPlaylists",
        allPlaylists: res.data?.playlists,
        has_uploaded: res.data?.has_uploaded,
        append: !!nextFeed,
      });
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getProfileData = (dispatch) => async (profileID) => {
  try {
    const res = await api.get(`/users/user/${profileID}/`);
    const profileData = res.data;
    dispatch({ type: "userProfileData", userProfileData: profileData });
    // Return whether the current user follows this profile
    // The serializer includes a computed `is_following` field after the refactor
    return profileData.is_following ?? false;
  } catch (error) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const getPlaylistData =
  (dispatch) =>
  async (userID = null, nextPage = null) => {
    try {
      const url = nextPage || `/feed/user-playlists/?id=${userID}`;
      const res = await api.get(url);
      dispatch({
        type: "userPlaylistData",
        userPlaylistData: res.data,
        append: !!nextPage,
      });
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getFollowersPlaylists =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const url = nextPage || "/feed/following-playlists/";
      const res = await api.get(url);
      dispatch({
        type: "followingPlaylists",
        followingPlaylists: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getPlaylistByHashtag =
  (dispatch) =>
  async (hashtag, nextPage = null) => {
    try {
      const url =
        nextPage ||
        `/feed/playlists/hashtag/?hashtag=${encodeURIComponent(hashtag)}`;
      const res = await api.get(url);
      dispatch({
        type: "hashtagPlaylists",
        hashtagPlaylists: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const fetchPlaylist =
  (dispatch) =>
  async (id, nextPage = null) => {
    try {
      const url = nextPage || `/feed/playlist-details/?id=${id}`;
      const res = await api.get(url);
      const data = res.data;
      dispatch({ type: "playlistDetails", playlist: data?.playlist });
      dispatch({
        type: "playlistTracks",
        tracks: data?.tracks,
        pagination: {
          count: data.count,
          next: data.next,
          previous: data.previous,
        },
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const fetchMoreTracks =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const res = await api.get(nextPage);
      const data = res.data;
      dispatch({
        type: "addTracks",
        tracks: data?.tracks,
        pagination: {
          count: data.count,
          next: data.next,
          previous: data.previous,
        },
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const deletePlaylist = (dispatch) => async (id) => {
  try {
    const res = await api.delete(`/feed/my-playlists/?id=${id}`);
    return res.status;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const updatePlaylist = (dispatch) => async (playlist_id) => {
  try {
    const res = await api.put(
      `/feed/playlist-details/?playlist_id=${playlist_id}`,
      {}
    );
    dispatch({ type: "playlistDetails", playlist: res.data?.playlistDetails });
    dispatch({
      type: "playlistTracks",
      tracks: res.data?.playlistTracks,
      pagination: { count: null, next: null, previous: null },
    });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const getComments =
  (dispatch) =>
  async (playlist_id, nextPage = null) => {
    try {
      const url = nextPage || `/feed/comments-playlist/?id=${playlist_id}`;
      const res = await api.get(url);
      dispatch({
        type: "comments",
        comments: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const comment = (dispatch) => async (props) => {
  const notifData = {
    to_user: props.to_user.toString(),
    title: "Cycles",
    image: props.playlist_cover,
  };
  try {
    const res = await api.post("/feed/comments-playlist/", {
      id: props.playlist_id,
      title: props.title,
    });
    if (res.status === 201) {
      notifData.body = `commented: ${props.title}`;
      notifData.playlist_id = props.playlist_id;
      notifData.type = "comment";
      notifData.comment = res.data.id;
      notifData.follow = null;
      notifData.like = null;
      // Best-effort notification — don't surface errors to the user
      api.post("/notifications/message/", notifData).catch(() => {});
    }
  } catch (error) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const deleteComment = (dispatch) => async (id) => {
  try {
    const res = await api.delete(`/feed/comments-playlist/?id=${id}`);
    return res.status;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const checkIfLiked = (dispatch) => async (id) => {
  try {
    const res = await api.get("/feed/like-playlist/", { params: { id } });
    dispatch({ type: "isLiked", isLiked: res.data });
  } catch (err) {
    // Silently ignore — like state will be shown as false
  }
};

const likePlaylist = (dispatch) => async (route) => {
  const { playlist_id, to_user, images: playlist_cover } = route;
  const notifData = {
    to_user: to_user.toString(),
    title: "Cycles",
    image: playlist_cover,
  };
  try {
    const res = await api.post("/feed/like-playlist/", {
      id: playlist_id,
      like: "True",
    });
    const isLiked = res.data.like;
    if (res.status === 201) {
      notifData.like = res.data.id;
      notifData.body = "liked your playlist.";
      notifData.playlist_id = playlist_id;
      notifData.type = "like";
      notifData.follow = null;
      notifData.comment = null;
      api.post("/notifications/message/", notifData).catch(() => {});
      return isLiked;
    }
    return false;
  } catch (err) {
    return false;
  }
};

const unlikePlaylist = (dispatch) => async (id) => {
  try {
    const res = await api.delete(`/feed/like-playlist/?id=${id}`);
    return res.data;
  } catch (err) {
    return false;
  }
};

const followUser = (dispatch) => async (props) => {
  const notifData = {
    to_user: props.to_user,
    title: "Cycles",
    image: null,
  };
  try {
    const res = await api.post("/users/following/", {
      user: props.currentUser,
      following_user: props.to_user.toString(),
    });
    if (res.status === 201) {
      notifData.follow = res.data.id;
      notifData.body = "started following you.";
      notifData.type = "follow";
      notifData.like = null;
      notifData.comment = null;
      api.post("/notifications/message/", notifData).catch(() => {});
    }
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const unfollowUser = (dispatch) => async (props) => {
  try {
    await api.delete("/users/following/", {
      params: {
        user: props.currentUser,
        following_user: props.to_user,
      },
    });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const getSpotifyPlaylist =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const url = nextPage || "/spotify-api/spotify-playlist/";
      const res = await api.get(url);
      dispatch({
        type: "spotifyPlaylists",
        spotifyPlaylists: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getAppleMusicPlaylists =
  (dispatch) =>
  async (nextPage = null) => {
    try {
      const url = nextPage || "/apple-music/playlists/";
      const res = await api.get(url);
      dispatch({
        type: "appleMusicPlaylists",
        appleMusicPlaylists: res.data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const isAppleMusicAuth = (dispatch) => async () => {
  try {
    const res = await api.get("/apple-music/token/");
    return res.data;
  } catch (e) {
    return false;
  }
};

const appleMusicLogin = (dispatch) => async (musicUserToken) => {
  try {
    const res = await api.post("/apple-music/login/", { music_user_token: musicUserToken });
    return res.data.authenticated;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
    return false;
  }
};

const appleMusicLogout = (dispatch) => async () => {
  try {
    await api.delete("/apple-music/logout/");
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

const selectPlaylist = (dispatch) => (item) => {
  dispatch({ type: "selectedSpotifyPlaylist", selectedSpotifyPlaylist: item });
  dispatch({ type: "isSelected", isSelected: item.id });
};

const clearSelectedPlaylist = (dispatch) => () => {
  dispatch({ type: "selectedSpotifyPlaylist", selectedSpotifyPlaylist: null });
  dispatch({ type: "isSelected", isSelected: null });
};

const selectAppleMusicPlaylist = (dispatch) => (item) => {
  dispatch({ type: "selectedAppleMusicPlaylist", selectedAppleMusicPlaylist: item });
  dispatch({ type: "isSelected", isSelected: item.id });
};

const clearSelectedAppleMusicPlaylist = (dispatch) => () => {
  dispatch({ type: "selectedAppleMusicPlaylist", selectedAppleMusicPlaylist: null });
  dispatch({ type: "isSelected", isSelected: null });
};

const getFollowing =
  (dispatch) =>
  async (to_user, nextPage = null) => {
    try {
      const url = nextPage || `/users/user-following/?user_id=${to_user}`;
      const res = await api.get(url);
      dispatch({
        type: "following",
        following: res.data,
        append: !!nextPage,
      });
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

const getFollowers =
  (dispatch) =>
  async (id, nextPage = null) => {
    try {
      const url = nextPage || `/users/user-followers/?user_id=${id}`;
      const res = await api.get(url);
      dispatch({
        type: "followers",
        followers: res.data,
        append: !!nextPage,
      });
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

export const { Provider, Context } = context(
  playlistReducer,
  {
    getMyProfileData,
    getMyPlaylistData,
    getAllPlaylists,
    getProfileData,
    getPlaylistData,
    getFollowersPlaylists,
    getPlaylistByHashtag,
    fetchPlaylist,
    fetchMoreTracks,
    deletePlaylist,
    updatePlaylist,
    getComments,
    comment,
    deleteComment,
    checkIfLiked,
    likePlaylist,
    unlikePlaylist,
    followUser,
    unfollowUser,
    getSpotifyPlaylist,
    getAppleMusicPlaylists,
    isAppleMusicAuth,
    appleMusicLogin,
    appleMusicLogout,
    selectPlaylist,
    clearSelectedPlaylist,
    selectAppleMusicPlaylist,
    clearSelectedAppleMusicPlaylist,
    getFollowers,
    getFollowing,
  },
  defaultValue
);
