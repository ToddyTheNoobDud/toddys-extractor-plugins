var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { Soundcloud } from "soundcloud.ts";
import { DisTubeError, ExtractorPlugin, Playlist, Song, checkInvalidKey } from "distube";
import { isURL } from "distube";
var isTruthy = /* @__PURE__ */ __name((x) => Boolean(x), "isTruthy");
var SearchType = /* @__PURE__ */ ((SearchType2) => {
  SearchType2["Track"] = "track";
  SearchType2["Playlist"] = "playlist";
  return SearchType2;
})(SearchType || {});
var SoundCloudPlugin = class extends ExtractorPlugin {
  static {
    __name(this, "SoundCloudPlugin");
  }
  soundcloud;
  constructor(options = {}) {
    super();
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new DisTubeError("INVALID_TYPE", ["object", "undefined"], options, "SoundCloudPluginOptions");
    }
    checkInvalidKey(options, ["clientId", "oauthToken"], "SoundCloudPluginOptions");
    if (options.clientId && typeof options.clientId !== "string") {
      throw new DisTubeError("INVALID_TYPE", "string", options.clientId, "clientId");
    }
    if (options.oauthToken && typeof options.oauthToken !== "string") {
      throw new DisTubeError("INVALID_TYPE", "string", options.oauthToken, "oauthToken");
    }
    this.soundcloud = new Soundcloud({
      clientId: options.clientId,
      oauthToken: options.oauthToken
    });
  }
  async search(query, type = "track" /* Track */, limit = 10, options = {}) {
    if (typeof query !== "string") {
      throw new DisTubeError("INVALID_TYPE", "string", query, "query");
    }
    const searchType = Object.values(SearchType);
    if (!searchType.includes(type)) {
      throw new DisTubeError("INVALID_TYPE", searchType, type, "type");
    }
    if (typeof limit !== "number" || limit < 1 || !Number.isInteger(limit)) {
      throw new DisTubeError("INVALID_TYPE", "natural number", limit, "limit");
    }
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new DisTubeError("INVALID_TYPE", "object", options, "ResolveOptions");
    }
    if (isURL(query)) {
      try {
        const song = await this.resolve(query, options);
        return [song];
      } catch (e) {
        if (e instanceof DisTubeError) {
          throw new DisTubeError("SOUNDCLOUD_PLUGIN_NOT_SUPPORTED", "Only public tracks and playlists are supported.");
        }
        throw e;
      }
    }
    const data = await (type === SearchType.Track ? this.searchTracks(query, limit) : this.searchPlaylists(query, limit));
    return data.map((t) => new (type === SearchType.Track ? SoundCloudSong : SoundCloudPlaylist)(this, t, options));
  }
  async searchTracks(query, limit) {
    const data = await this.soundcloud.tracks.searchV2({ q: query, limit });
    if (!data?.collection?.length) {
      throw new DisTubeError("SOUNDCLOUD_PLUGIN_NO_RESULT", `Cannot find any "${query}" ${type} on SoundCloud!`);
    }
    return data.collection;
  }
  async searchPlaylists(query, limit) {
    const data = await this.soundcloud.playlists.searchV2({ q: query, limit });
    const playlists = data.collection;
    return (await Promise.all(playlists.map((p) => this.soundcloud.playlists.fetch(p)))).filter(isTruthy);
  }
  validate(url) {
    return /^https?:\/\/(?:(?:www|m)\.)?soundcloud\.com\/(.*)$/.test(url);
  }
  async resolve(url, options) {
    const opt = { ...options, source: "soundcloud" };
    url = url.replace(/:\/\/(m|www)\./g, "://");
    const data = await this.soundcloud.resolve.getV2(url, true).catch((e) => {
      throw new DisTubeError("SOUNDCLOUD_PLUGIN_RESOLVE_ERROR", e.message);
    });
    if (!data || !["track", "playlist"].includes(data.kind)) {
      throw new DisTubeError("SOUNDCLOUD_PLUGIN_NOT_SUPPORTED", "Only public tracks and playlists are supported.");
    }
    return data.kind === "playlist"
      ? new SoundCloudPlaylist(this, await this.soundcloud.playlists.fetch(data), opt)
      : new SoundCloudSong(this, data, opt);
  }
  async getRelatedSongs(song) {
    if (!song.url) {
      throw new DisTubeError("SOUNDCLOUD_PLUGIN_INVALID_SONG", "Cannot get related songs from invalid song.");
    }
    const related = await this.soundcloud.tracks.relatedV2(song.url, 10);
    return related.filter((t) => t.title).map((t) => new SoundCloudSong(this, t));
  }
  async getStreamURL(song) {
    if (!song.url) {
      throw new DisTubeError("SOUNDCLOUD_PLUGIN_INVALID_SONG", "Cannot get stream url from invalid song.");
    }
    const stream = await this.soundcloud.util.streamLink(song.url);
    if (!stream) {
      throw new DisTubeError(
        "SOUNDCLOUD_PLUGIN_RATE_LIMITED",
        "Reached SoundCloud rate limits\nSee more: https://developers.soundcloud.com/docs/api/rate-limits#play-requests"
      );
    }
    return stream;
  }
  async searchSong(query, options) {
    const songs = await this.search(query, "track" /* Track */, 1, options);
    return songs[0];
  }
};
var SoundCloudSong = class extends Song {
  static {
    __name(this, "SoundCloudSong");
  }
  constructor(plugin, info, options = {}) {
    super(
      {
        plugin,
        source: "soundcloud",
        playFromSource: true,
        id: info.id.toString(),
        name: info.title,
        url: info.permalink_url,
        thumbnail: info.artwork_url,
        duration: info.duration / 1e3,
        views: info.playback_count,
        uploader: {
          name: info.user?.username,
          url: info.user?.permalink_url
        },
        likes: info.likes_count,
        reposts: info.reposts_count
      },
      options
    );
  }
};
var SoundCloudPlaylist = class extends Playlist {
  static {
    __name(this, "SoundCloudPlaylist");
  }
  constructor(plugin, info, options = {}) {
    super(
      {
        source: "soundcloud",
        id: info.id.toString(),
        name: info.title,
        url: info.permalink_url,
        thumbnail: info.artwork_url ?? void 0,
        songs: info.tracks.map((s) => new SoundCloudSong(plugin, s, options))
      },
      options
    );
  }
};
var src_default = SoundCloudPlugin;
export {
  SearchType,
  SoundCloudPlugin,
  src_default as default
};
//# sourceMappingURL=index.mjs.map
