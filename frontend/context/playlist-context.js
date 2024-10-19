import * as SecureStore from "expo-secure-store";
import axios from "axios";
import context from "./context";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

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
    case "spotifyAuth":
      return {
        ...state,
        spotifyAuth: action.spotifyAuth,
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
            results: [...state.userPlaylistData, ...action.userPlaylistData],
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
          allPlaylists: {
            ...action.allPlaylists,
            results: [
              ...state.allPlaylists.results,
              ...action.allPlaylists.results,
            ],
          },
        };
      }
      return {
        ...state,
        allPlaylists: action.allPlaylists,
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
            results: [...state.comments, ...action.comments],
          },
        };
      }
      return {
        ...state,
        comments: action.comments,
      };
    case "POST_COMMENT": {
      return { ...state, comments: [action.payload, ...state.comments] };
    }
    case "DELETE_COMMENT": {
      const newComments = state.comments.filter(
        (comment) => comment.id !== action.payload
      );
      return { ...state, comments: newComments };
    }
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
              ...state.spotifyPlaylists.results,
              ...action.spotifyPlaylists.results,
            ],
          },
        };
      }
      return {
        ...state,
        spotifyPlaylists: action.spotifyPlaylists,
      };
    case "selectedSpotifyPlaylist":
      return {
        ...state,
        selectedSpotifyPlaylist: action.selectedSpotifyPlaylist,
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
            results: [...state.following, ...action.following],
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
            results: [...state.followers, ...action.followers],
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

//Fetch current users profile data
const getMyProfileData = (dispatch) => async () => {
  const token = await SecureStore.getItemAsync("token", {});
  const userID = await SecureStore.getItemAsync("user_id", {});
  try {
    await axios
      .get(`${BACKEND_URL}/users/user/${userID}/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      })
      .then((res) => {
        dispatch({
          type: "myProfileData",
          myProfileData: res.data,
        });
      });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

//Fetch my playlists
const getMyPlaylistData =
  (dispatch) =>
  async (nextPage = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url = nextPage ? nextPage : `${BACKEND_URL}/feed/my-playlists/`;
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const data = response.data;
      dispatch({
        type: "myPlaylistData",
        myPlaylistData: data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

// Fetch all playlists
const getAllPlaylists =
  (dispatch) =>
  async (nextFeed = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url = nextFeed ? nextFeed : `${BACKEND_URL}/feed/playlist/`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      if (res.status === 200) {
        dispatch({
          type: "allPlaylists",
          allPlaylists: res?.data,
          append: !!nextFeed,
        });
      }
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

// Get a users profile data
const getProfileData = (dispatch) => async (profileID) => {
  const userID = await SecureStore.getItemAsync("user_id", {});
  const token = await SecureStore.getItemAsync("token", {});
  try {
    const res = await axios.get(`${BACKEND_URL}/users/user/${profileID}/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    if (res.status == 200) {
      const profile_Data = res.data;
      dispatch({ type: "userProfileData", userProfileData: profile_Data });
      const followers = profile_Data.followers;
      const followersID = followers.map((item) => item.user);
      const exists = followersID.some(
        (id) => id.toString() === userID.toString()
      );
      if (exists) {
        return true;
      } else {
        return false;
      }
    } else {
      null;
    }
  } catch (error) {
    playlistContext?.dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

//Fetch a users playlists
const getPlaylistData =
  (dispatch) =>
  async (userID, nextPage = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/feed/user-playlists/?id=${userID}`;
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const data = response.data;
      dispatch({
        type: "userPlaylistData",
        userPlaylistData: data,
        append: !!nextPage,
      });
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

//Fetch followers playlists
const getFollowersPlaylists =
  (dispatch) =>
  async (nextPage = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/feed/following-playlists/`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      if (res.status === 200) {
        dispatch({
          type: "followingPlaylists",
          followingPlaylists: res.data,
          append: !!nextPage,
        });
      }
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

// Post playlist
const postPlaylist = (dispatch) => async (selected_playlist) => {
  const formData = new FormData();
  formData.append("playlist_url", selected_playlist.external_urls.spotify);
  formData.append("playlist_ApiURL", selected_playlist.href);
  formData.append("playlist_id", selected_playlist.id);
  formData.append("playlist_cover", selected_playlist.images[0].url);
  formData.append("playlist_title", selected_playlist.name);
  formData.append("playlist_type", selected_playlist.type);
  formData.append("playlist_uri", selected_playlist.uri);
  formData.append("playlist_tracks", selected_playlist.tracks.href);
  try {
    const res = await axios.post(
      `${BACKEND_URL}/feed/my-playlist/`,
      {
        body: formData,
      },
      {
        headers: {
          Authorization: token,
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (res.status === 201) {
      return 201;
    }
  } catch (e) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

// Fetch playlist data
const fetchPlaylist =
  (dispatch) =>
  async (id, nextPage = null) => {
    const token = await SecureStore.getItemAsync("token");
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/feed/playlist-details/?id=${id}`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const data = res?.data;
      dispatch({
        type: "playlistDetails",
        playlist: res.data?.playlist,
      });
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
    const token = await SecureStore.getItemAsync("token");
    try {
      const res = await axios.get(nextPage, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const data = res?.data;
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

// Delete playlist
const deletePlaylist = (dispatch) => async (id) => {
  const token = await SecureStore.getItemAsync("token", {});
  try {
    const res = await axios.delete(
      `${BACKEND_URL}/feed/my-playlists/?id=${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    return res.status;
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

// Update Spotify Playlist
const updatePlaylist = (dispatch) => async (playlist_id) => {
  const token = await SecureStore.getItemAsync("token", {});
  try {
    await axios
      .put(
        `${BACKEND_URL}/feed/playlist-details/?playlist_id=${playlist_id}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        }
      )
      .then((res) => {
        dispatch({
          type: "playlistDetails",
          playlist: res.data?.playlistDetails,
        });
        dispatch({
          type: "playlistTracks",
          tracks: res.data?.playlistTracks,
        });
      });
  } catch (err) {
    dispatch({
      type: "error_1",
      payload: "Something went wrong. Please try again.",
    });
  }
};

// Get all comments for playlist
const getComments =
  (dispatch) =>
  async (playlist_id, nextPage = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url =
        nextPage || `${BACKEND_URL}/feed/comments-playlist/?id=${playlist_id}`;
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const comments = response.data;
      dispatch({
        type: "comments",
        comments: comments,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

// Comment on playlist
const comment = (dispatch) => async (props) => {
  const token = await SecureStore.getItemAsync("token", {});
  const data = {
    to_user: props.to_user.toString(),
    title: "Cycles",
    image: props.images[0].image,
  };
  try {
    const response = await axios.post(
      `${BACKEND_URL}/feed/comments-playlist/`,
      {
        id: props.playlist_id,
        title: props.title,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    data["body"] = `commented: ${props.title}`;
    data["playlist_id"] = props.playlist_id;
    data["type"] = "comment";
    data["comment"] = response.data.id;
    data["follow"] = null;
    data["like"] = null;
    if (response.status === 201) {
      dispatch({ type: "POST_COMMENT", payload: response.data });
      try {
        axios.post(`${BACKEND_URL}/notifications/message/`, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        });
      } catch (error) {
        null;
      }
    }
  } catch (err) {
    null;
  }
};

const deleteComment = (dispatch) => async (id) => {
  const token = await SecureStore.getItemAsync("token", {});
  try {
    await axios
      .delete(`${BACKEND_URL}/feed/comments-playlist/?id=${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      })
      .then((res) => {
        value = res.data;
        dispatch({ type: "DELETE_COMMENT", payload: id });
      });
  } catch (err) {
    null;
  }
};

const checkIfLiked = (dispatch) => async (id) => {
  const token = await SecureStore.getItemAsync("token", {});
  try {
    const isLiked = await axios.get(`${BACKEND_URL}/feed/like-playlist/`, {
      params: {
        id: id,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    // return isLiked;
    dispatch({
      type: "isLiked",
      isLiked: isLiked,
    });
  } catch (err) {
    null;
  }
};

// Like playlist
const likePlaylist = (dispatch) => async (route) => {
  const playlist_id = route.playlist_id;
  const token = await SecureStore.getItemAsync("token", {});
  const to_user = route.to_user;
  const playlist_cover = route.images;
  const data = {
    to_user: to_user.toString(),
    title: "Cycles",
    image: playlist_cover,
  };
  try {
    const response = await axios.post(
      `${BACKEND_URL}/feed/like-playlist/`,
      {
        id: playlist_id,
        like: "True",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    const isLiked = response.data.like;
    data["like"] = response.data.id;
    data["body"] = `liked your playlist.`;
    data["playlist_id"] = playlist_id;
    data["type"] = "like";
    data["follow"] = null;
    data["comment"] = null;
    if (response.status === 201) {
      try {
        axios.post(`${BACKEND_URL}/notifications/message/`, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        });
      } catch (error) {
        null;
      }
      return isLiked;
    } else {
      return false;
    }
  } catch (err) {
    null;
  }
};

// Unlike playlist
const unlikePlaylist = (dispatch) => async (id) => {
  const userToken = await SecureStore.getItemAsync("token", {});
  try {
    await axios
      .delete(`${BACKEND_URL}/feed/like-playlist/?id=${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: userToken,
        },
      })
      .then((res) => {
        value = res.data;
        return value;
      });
  } catch (err) {
    return false;
  }
};

// Follow user
const followUser = (dispatch) => async (props) => {
  const token = await SecureStore.getItemAsync("token", {});
  const data = {
    to_user: props.to_user,
    title: "Cycles",
    image: null,
  };
  try {
    const response = await axios.post(
      `${BACKEND_URL}/users/following/`,
      { user: props.currentUser, following_user: props.to_user.toString() },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      }
    );
    data["follow"] = response.data.id;
    data["body"] = `started following you.`;
    data["type"] = "follow";
    data["like"] = null;
    data["comment"] = null;
    if (response.status === 201) {
      axios.post(`${BACKEND_URL}/notifications/message/`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
    }
  } catch (err) {
    null;
  }
};

// Unfollow user
const unfollowUser = (dispatch) => async (props) => {
  const userToken = await SecureStore.getItemAsync("token", {});
  try {
    await axios.delete(`${BACKEND_URL}/users/following/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: userToken,
      },
      params: {
        user: props.currentUser,
        following_user: props.to_user,
      },
    });
  } catch (err) {
    null;
  }
};

//Fetch Spotify playlists from API
const getSpotifyPlaylist =
  (dispatch) =>
  async (nextPage = null) => {
    const token = await SecureStore.getItemAsync("token", {});
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/spotify_api/spotify-playlist/`;
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const data = response.data;
      dispatch({
        type: "spotifyPlaylists",
        spotifyPlaylists: data,
        append: !!nextPage,
      });
    } catch (err) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

//Select playlist
const selectPlaylist = (dispatch) => async (item) => {
  dispatch({
    type: "selectedSpotifyPlaylist",
    selectedSpotifyPlaylist: item,
  });
  dispatch({ type: "isSelected", isSelected: item.id });
};

const clearSelectedPlaylist = (dispatch) => async () => {
  dispatch({ type: "selectedSpotifyPlaylist", selectedSpotifyPlaylist: null });
  dispatch({ type: "isSelected", isSelected: null });
};

// Get list of following
const getFollowing =
  (dispatch) =>
  async (to_user, nextPage = null) => {
    const token = await SecureStore.getItemAsync("token");
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/users/user-following/?user_id=${to_user}`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      if (res.status === 200) {
        const data = res?.data;
        dispatch({
          type: "following",
          following: data,
          append: !!nextPage,
        });
      }
    } catch (error) {
      dispatch({
        type: "error_1",
        payload: "Something went wrong. Please try again.",
      });
    }
  };

// Get list of following
const getFollowers =
  (dispatch) =>
  async (to_user, nextPage = null) => {
    const token = await SecureStore.getItemAsync("token");
    try {
      const url = nextPage
        ? nextPage
        : `${BACKEND_URL}/users/user-followers/?user_id=${to_user}`;
      const res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      if (res.status === 200) {
        const data = res?.data;
        dispatch({
          type: "followers",
          following: data,
          append: !!nextPage,
        });
      }
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
    postPlaylist,
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
    selectPlaylist,
    clearSelectedPlaylist,
    getFollowers,
    getFollowing,
  },
  {
    defaultValue,
  }
);
