/* ================================================================
   GraphCore — React Flow 组件: 节点 / 边 / 布局 / 交互
   ================================================================ */

// Use global ReactFlow UMD
var RF = window.ReactFlow;
var ReactFlow = RF.default;
var Background = RF.Background;
var Controls = RF.Controls;
var MiniMap = RF.MiniMap;
var useNodesState = RF.useNodesState;
var useEdgesState = RF.useEdgesState;
var MarkerType = RF.MarkerType;

// ── Edge colors by relation type ──
var EDGE_COLORS = {
  "亲属": "#d4a574", "朋友": "#5aab8a", "恋人": "#c06060",
  "师徒": "#6b9aed", "敌人": "#c06060", "同事": "#8a8798",
  "上下级": "#d4a574", "组织成员": "#6b6880",
};

// ── Custom Node component ──
function CharacterNode(_ref) {
  var data = _ref.data;
  var selected = _ref.selected;
  var statusColors = { active: "#5aab8a", deceased: "#c06060", archived: "#6b6880", suspended: "#d4a574" };
  var borderColor = statusColors[data.status] || "#5aab8a";
  if (selected) borderColor = "#d4a574";

  return React.createElement("div", {
    className: "cg-node",
    style: {
      background: selected ? "#252336" : "#1e1d30",
      border: "2px solid " + borderColor,
      borderRadius: selected ? "10px" : "8px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: 600,
      color: "#d0cec8",
      cursor: "pointer",
      textAlign: "center",
      minWidth: "60px",
      boxShadow: selected ? "0 0 12px rgba(212,167,116,0.3)" : "none",
      transition: "all 0.2s",
    },
  },
    React.createElement("div", null, data.label),
    data.alias
      ? React.createElement("div", { style: { fontSize: "10px", color: "#d4a574", marginTop: "2px" } }, data.alias)
      : null,
    React.createElement(RF.Handle, { type: "source", position: RF.Position.Right, style: { background: "#555" } }),
    React.createElement(RF.Handle, { type: "target", position: RF.Position.Left, style: { background: "#555" } })
  );
}

var nodeTypes = { characterNode: CharacterNode };

// ── Main Graph Component (exported as constructor function) ──
function CharacterGraphComponent() {
  var _React$useState = React.useState([]), nodes = _React$useState[0], setNodes = _React$useState[1];
  var _React$useState2 = React.useState([]), edges = _React$useState2[0], setEdges = _React$useState2[1];
  var _React$useState3 = React.useState(null), selectedChar = _React$useState3[0], setSelectedChar = _React$useState3[1];
  var _React$useState4 = React.useState([]), charRels = _React$useState4[0], setCharRels = _React$useState4[1];
  var _React$useState5 = React.useState({}), nameMap = _React$useState5[0], setNameMap = _React$useState5[1];

  // Expose data setters globally
  React.useEffect(function () {
    window._cgSetData = function (chars, rels) {
      setNameMap(chars.reduce(function (m, c) { m[c.id] = c.name; return m; }, {}));

      var ns = chars.map(function (c) {
        return {
          id: c.id,
          type: "characterNode",
          position: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 300 },
          data: {
            label: c.name,
            alias: c.alias || "",
            status: c.status || "active",
            gender: c.gender,
            age: c.age,
            race: c.race,
            occupation: c.occupation || "",
            personality: c.personality || "",
            background: c.background || "",
            goal: c.goal || "",
          },
        };
      });

      var charIds = new Set(chars.map(function (c) { return c.id; }));
      var es = rels
        .filter(function (r) { return charIds.has(r.sourceCharacterId) && charIds.has(r.targetCharacterId); })
        .map(function (r) {
          return {
            id: r.id,
            source: r.sourceCharacterId,
            target: r.targetCharacterId,
            label: r.relationType,
            animated: false,
            style: {
              stroke: EDGE_COLORS[r.relationType] || "#555",
              strokeWidth: 1.5,
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[r.relationType] || "#555" },
          };
        });

      setNodes(ns);
      setEdges(es);
    };

    window._cgHighlightNode = function (nodeId) {
      setNodes(function (prev) {
        return prev.map(function (n) {
          return {
            ...n,
            style: n.id === nodeId
              ? { ...n.style, opacity: 1 }
              : { ...n.style, opacity: 0.15 },
          };
        });
      });
      setEdges(function (prev) {
        return prev.map(function (e) {
          var isConnected = e.source === nodeId || e.target === nodeId;
          return {
            ...e,
            style: {
              ...e.style,
              opacity: isConnected ? 1 : 0.08,
              strokeWidth: isConnected ? 2.5 : e.style.strokeWidth,
            },
          };
        });
      });
    };

    window._cgClearHighlight = function () {
      setNodes(function (prev) { return prev.map(function (n) { return { ...n, style: { ...n.style, opacity: 1 } }; }); });
      setEdges(function (prev) { return prev.map(function (e) { return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 1.5 } }; }); });
    };

    window._cgFitView = function () {
      // Triggered indirectly
    };
  }, []);

  var onNodeClick = React.useCallback(function (_event, node) {
    window._cgHighlightNode(node.id);
    setSelectedChar(node.data);
    // Build relations for this character
    var rels = [];
    edges.forEach(function (e) {
      if (e.source === node.id || e.target === node.id) {
        var otherId = e.source === node.id ? e.target : e.source;
        rels.push({
          relationType: e.label || "",
          otherName: nameMap[otherId] || otherId,
        });
      }
    });
    setCharRels(rels);
  }, [edges, nameMap]);

  var onPaneClick = React.useCallback(function () {
    window._cgClearHighlight();
    setSelectedChar(null);
    setCharRels([]);
  }, []);

  return React.createElement("div", { style: { width: "100%", height: "100%", display: "flex" } },
    React.createElement("div", { style: { flex: 1, position: "relative" } },
      React.createElement(ReactFlow, {
        nodes: nodes,
        edges: edges,
        nodeTypes: nodeTypes,
        onNodeClick: onNodeClick,
        onPaneClick: onPaneClick,
        fitView: true,
        fitViewOptions: { padding: 0.3 },
        defaultEdgeOptions: { type: "smoothstep" },
        style: { background: "#0b0a12" },
      },
        React.createElement(Background, { color: "#1e1d30", gap: 20 }),
        React.createElement(Controls, { style: { background: "#14131e", border: "1px solid #333", borderRadius: "6px" } }),
        React.createElement(MiniMap, { style: { background: "#14131e", border: "1px solid #333" }, maskColor: "#0b0a1288", nodeColor: "#5aab8a" })
      ),
      // Legend
      React.createElement("div", { className: "cg-legend" },
        React.createElement("span", { className: "cg-legend-item" }, React.createElement("span", { className: "cg-legend-line", style: { background: "#5aab8a" } }), "活跃"),
        React.createElement("span", { className: "cg-legend-item" }, React.createElement("span", { className: "cg-legend-line", style: { background: "#c06060" } }), "已故"),
        React.createElement("span", { className: "cg-legend-item" }, React.createElement("span", { className: "cg-legend-line", style: { background: "#6b6880" } }), "归档")
      ),
      // Toolbar
      React.createElement("div", { className: "cg-toolbar" },
        React.createElement("button", { className: "cg-tool-btn", title: "适应窗口", onClick: function () { window._cgClearHighlight(); } }, "⊡"),
        React.createElement("button", { className: "cg-tool-btn", title: "高亮清除", onClick: function () { window._cgClearHighlight(); setSelectedChar(null); setCharRels([]); } }, "✖")
      )
    ),
    // Detail panel
    React.createElement(GraphDetailPanel, {
      charData: selectedChar,
      relations: charRels,
    })
  );
}

// ═══════════════════════════════════════
//  GraphDetailPanel — 右侧滑出详情
// ═══════════════════════════════════════

function GraphDetailPanel(_ref2) {
  var charData = _ref2.charData;
  var relations = _ref2.relations;
  var open = !!charData;

  if (!charData) {
    return React.createElement("div", {
      className: "cg-detail-panel" + (open ? " open" : ""),
      style: { width: "280px", background: "#14131e", borderLeft: "1px solid #333", overflowY: "auto" },
    });
  }

  var statusLabels = { active: "活跃", deceased: "已故", archived: "归档", suspended: "暂停" };
  var statusColors = { active: "#5aab8a", deceased: "#c06060", archived: "#6b6880", suspended: "#d4a574" };

  return React.createElement("div", {
    className: "cg-detail-panel open",
    style: { width: "280px", background: "#14131e", borderLeft: "1px solid #333", overflowY: "auto", padding: "18px" },
  },
    React.createElement("div", { style: { fontSize: "18px", fontWeight: 700, color: "#d0cec8" } }, charData.label),
    charData.alias ? React.createElement("div", { style: { fontSize: "12px", color: "#d4a574", marginTop: "2px" } }, charData.alias) : null,

    React.createElement("div", { style: { marginTop: "14px" } },
      React.createElement(Section, { label: "基础信息" },
        React.createElement(InfoRow, { label: "性别", value: charData.gender !== "未知" ? charData.gender : "—" }),
        React.createElement(InfoRow, { label: "年龄", value: charData.age > 0 ? charData.age + " 岁" : "—" }),
        React.createElement(InfoRow, { label: "种族", value: charData.race || "—" }),
        React.createElement(InfoRow, { label: "职业", value: charData.occupation || "—" }),
        React.createElement(InfoRow, {
          label: "状态",
          value: React.createElement("span", { style: { color: statusColors[charData.status] || "#8a8798" } }, statusLabels[charData.status] || charData.status),
        })
      ),
      charData.personality ? React.createElement(Section, { label: "性格" }, React.createElement("div", { style: { fontSize: "12px", color: "#c4c0d0", lineHeight: 1.7 } }, charData.personality)) : null,
      charData.background ? React.createElement(Section, { label: "背景" }, React.createElement("div", { style: { fontSize: "12px", color: "#c4c0d0", lineHeight: 1.7 } }, charData.background)) : null,
      charData.goal ? React.createElement(Section, { label: "目标" }, React.createElement("div", { style: { fontSize: "12px", color: "#c4c0d0", lineHeight: 1.7 } }, charData.goal)) : null,
      React.createElement(Section, { label: "关联关系 (" + relations.length + ")" },
        relations.length === 0
          ? React.createElement("div", { style: { color: "#555", fontSize: "12px" } }, "暂无关系")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } },
            relations.map(function (r, i) {
              return React.createElement("div", {
                key: i,
                style: { display: "flex", gap: "6px", padding: "5px 8px", borderRadius: "4px", background: "#1e1d30", fontSize: "12px" },
              },
                React.createElement("span", { style: { padding: "1px 6px", borderRadius: "3px", background: "#d4a57422", color: "#d4a574", fontSize: "10px" } }, r.relationType),
                React.createElement("span", { style: { color: "#d0cec8" } }, r.otherName)
              );
            })
          )
      )
    )
  );
}

// ── Sub-components ──

function Section(_ref3) {
  var label = _ref3.label, children = _ref3.children;
  return React.createElement("div", { style: { marginBottom: "14px" } },
    React.createElement("div", { style: { fontSize: "10px", fontWeight: 600, color: "#6b6880", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" } }, label),
    children
  );
}

function InfoRow(_ref4) {
  var label = _ref4.label, value = _ref4.value;
  return React.createElement("div", { style: { display: "flex", gap: "6px", fontSize: "12px", marginBottom: "3px" } },
    React.createElement("span", { style: { color: "#6b6880", minWidth: "36px" } }, label),
    React.createElement("span", { style: { color: "#c4c0d0" } }, value)
  );
}
