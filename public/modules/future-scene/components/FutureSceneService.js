/* ================================================================
   FutureSceneService — API calls to /api/future-scenes/*
   ================================================================ */

var FutureSceneService = {
  BASE: "/api/future-scenes",

  _get: function (url) { return fetch(url).then(function (r) { return r.json(); }); },
  _post: function (url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function (r) { return r.json(); });
  },
  _patch: function (url, data) {
    return fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function (r) { return r.json(); });
  },
  _delete: function (url) { return fetch(url, { method: "DELETE" }).then(function (r) { return r.json(); }); },

  /** GET /api/future-scenes?projectId=...&status=...&... */
  list: function (params) {
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k] || "");
    }).join("&");
    return this._get(this.BASE + "?" + qs);
  },

  /** GET /api/future-scenes/:id */
  get: function (id) { return this._get(this.BASE + "/" + id); },

  /** POST /api/future-scenes */
  create: function (data) { return this._post(this.BASE, data); },

  /** PATCH /api/future-scenes/:id */
  update: function (id, data) { return this._patch(this.BASE + "/" + id, data); },

  /** DELETE /api/future-scenes/:id */
  delete: function (id) { return this._delete(this.BASE + "/" + id); },

  /** PATCH /api/future-scenes/:id/status */
  updateStatus: function (id, status) {
    return this._patch(this.BASE + "/" + id + "/status", { status: status });
  },

  /** GET /api/future-scenes/timeline?projectId=... */
  getTimeline: function (projectId) {
    return this._get(this.BASE + "/timeline?projectId=" + encodeURIComponent(projectId));
  },

  /** GET /api/future-scenes/entity-names?characterIds=a,b&locationIds=c&... */
  getEntityNames: function (projectId, charIds, locIds, facIds, chIds) {
    var params = "projectId=" + encodeURIComponent(projectId || "");
    if (charIds && charIds.length) params += "&characterIds=" + encodeURIComponent(charIds.join(","));
    if (locIds  && locIds.length)  params += "&locationIds="  + encodeURIComponent(locIds.join(","));
    if (facIds  && facIds.length)  params += "&factionIds="   + encodeURIComponent(facIds.join(","));
    if (chIds   && chIds.length)   params += "&chapterIds="   + encodeURIComponent(chIds.join(","));
    return this._get(this.BASE + "/entity-names?" + params);
  },
};
