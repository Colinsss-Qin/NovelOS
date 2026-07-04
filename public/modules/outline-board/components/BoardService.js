/* ================================================================
   BoardService — API calls to /api/outline/*
   ================================================================ */

var BoardService = {
  BASE: "/api/outline",

  _get: function (url) { return fetch(url).then(function (r) { return r.json(); }); },
  _post: function (url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function (r) { return r.json(); });
  },
  _put: function (url, data) {
    return fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function (r) { return r.json(); });
  },
  _delete: function (url) { return fetch(url, { method: "DELETE" }).then(function (r) { return r.json(); }); },

  // Stories
  listStories: function (pid) { return this._get(this.BASE + "/stories?projectId=" + encodeURIComponent(pid || "")); },
  createStory: function (d) { return this._post(this.BASE + "/stories", d); },
  getTree: function (id) { return this._get(this.BASE + "/stories/" + id + "/tree"); },
  getStats: function (id) { return this._get(this.BASE + "/stories/" + id + "/stats"); },

  // Volumes
  listVolumes: function (sid) { return this._get(this.BASE + "/volumes?storyId=" + sid); },
  createVolume: function (d) { return this._post(this.BASE + "/volumes", d); },
  updateVolume: function (id, d) { return this._put(this.BASE + "/volumes/" + id, d); },
  deleteVolume: function (id) { return this._delete(this.BASE + "/volumes/" + id); },

  // Chapters
  listChapters: function (vid) { return this._get(this.BASE + "/chapters?volumeId=" + vid); },
  createChapter: function (d) { return this._post(this.BASE + "/chapters", d); },
  updateChapter: function (id, d) { return this._put(this.BASE + "/chapters/" + id, d); },
  deleteChapter: function (id) { return this._delete(this.BASE + "/chapters/" + id); },

  // Scenes
  listScenes: function (cid) { return this._get(this.BASE + "/scenes?chapterId=" + cid); },
  createScene: function (d) { return this._post(this.BASE + "/scenes", d); },
  updateScene: function (id, d) { return this._put(this.BASE + "/scenes/" + id, d); },
  deleteScene: function (id) { return this._delete(this.BASE + "/scenes/" + id); },
};
