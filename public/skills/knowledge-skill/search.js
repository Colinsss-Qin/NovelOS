/* ================================================================
   Knowledge Skill / Search
   Client-side search engine for KnowledgeItems.
   ================================================================ */

// ================================================================
//  SCORING WEIGHTS
// ================================================================
var WEIGHTS = {
  nameExact:     100,
  nameContains:   80,
  aliasExact:     60,
  aliasContains:  50,
  tagsMatch:      40,
  summaryMatch:   20,
  descMatch:      10
};

// ================================================================
//  SEARCH
// ================================================================

/**
 * Score a single item against a query term.
 * @param {object} item — KnowledgeItem
 * @param {string} term — single search term (lowercased)
 * @returns {number}
 */
function _scoreItem(item, term) {
  var score = 0;

  // Name exact
  if (item.name === term) {
    score += WEIGHTS.nameExact;
  } else if (item.name.indexOf(term) !== -1) {
    score += WEIGHTS.nameContains;
  }

  // Aliases
  (item.aliases || []).forEach(function (alias) {
    if (alias === term) {
      score += WEIGHTS.aliasExact;
    } else if (alias.indexOf(term) !== -1) {
      score += WEIGHTS.aliasContains;
    }
  });

  // Tags
  (item.tags || []).forEach(function (tag) {
    if (tag === term || tag.indexOf(term) !== -1) {
      score += WEIGHTS.tagsMatch;
    }
  });

  // Summary
  if (item.summary && item.summary.indexOf(term) !== -1) {
    score += WEIGHTS.summaryMatch;
  }

  // Description
  if (item.description && item.description.indexOf(term) !== -1) {
    score += WEIGHTS.descMatch;
  }

  return score;
}

/**
 * Search items by query string.
 * @param {object[]} items — array of KnowledgeItem
 * @param {string} query — space-separated search terms
 * @returns {object[]} — scored and sorted items
 */
function search(items, query) {
  if (!query || !query.trim()) return items.slice(); // no query → return all

  var terms = query.trim().toLowerCase().split(/\s+/);

  var scored = items.map(function (item) {
    var total = 0;
    terms.forEach(function (term) {
      total += _scoreItem(item, term);
    });
    return { item: item, score: total };
  });

  return scored
    .filter(function (r) { return r.score > 0; })
    .sort(function (a, b) { return b.score - a.score; })
    .map(function (r) { return r.item; });
}

/**
 * Filter items by tag.
 * @param {object[]} items
 * @param {string|string[]} tags — single tag or array of tags
 * @param {string} [mode="any"] — "any" (OR) or "all" (AND)
 * @returns {object[]}
 */
function filterByTag(items, tags, mode) {
  if (!tags || (Array.isArray(tags) && tags.length === 0)) return items.slice();
  mode = mode || "any";

  var tagList = Array.isArray(tags) ? tags : [tags];

  return items.filter(function (item) {
    var itemTags = (item.tags || []).map(function (t) { return t.toLowerCase(); });
    if (mode === "all") {
      return tagList.every(function (t) {
        return itemTags.indexOf(t.toLowerCase()) !== -1;
      });
    }
    // mode === "any"
    return tagList.some(function (t) {
      return itemTags.indexOf(t.toLowerCase()) !== -1;
    });
  });
}

/**
 * Full query: search + tag filter + type filter + pagination.
 * @param {object[]} items
 * @param {object} opts — { query?, tags?, mode?, limit?, offset? }
 * @returns {{ items: object[], total: number }}
 */
function query(items, opts) {
  opts = opts || {};
  var result = items.slice();

  // 1. Search
  if (opts.query) {
    result = search(result, opts.query);
  }

  // 2. Tag filter
  if (opts.tags && opts.tags.length > 0) {
    result = filterByTag(result, opts.tags, opts.mode);
  }

  // 3. Pagination
  var total = result.length;
  var limit = opts.limit || 50;
  var offset = opts.offset || 0;
  result = result.slice(offset, offset + limit);

  return { items: result, total: total, limit: limit, offset: offset };
}
