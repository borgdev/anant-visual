// The sample figures: shown in the gallery, and pinned as golden SVG files by tests/golden.test.ts.
export const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
export const samples = [
  {
    title: "Review path",
    note: "reveal + trace + flow, with hover focus",
    spec: {
      id: "review-path", label: "How a change is reviewed", caption: CAPTION,
      motion: ["reveal", "trace", "flow"], interactive: true,
      nodes: [
        { id: "author", label: "Author" },
        { id: "review", label: "Independent review", sublabel: "Two people, not the author", role: "emphasis" },
        { id: "ship", label: "Production", role: "terminal", tone: "good" },
        { id: "audit", label: "Auditor", role: "external", group: "outside" },
        { id: "log", label: "Audit log", group: "outside", tone: "watch" },
      ],
      edges: [
        { from: "author", to: "review" },
        { from: "review", to: "ship", label: "approved", style: "emphasis" },
        { from: "review", to: "author", label: "rejected", style: "dashed" },
        { from: "ship", to: "log", style: "dashed" },
        { from: "log", to: "audit" },
      ],
      groups: [{ id: "outside", label: "Outside our control" }],
    },
  },
  {
    title: "Nested groups",
    note: "Cloud › VPC › Private subnet, with an outsider; reveal + flow",
    spec: {
      id: "cloud", label: "Where the service runs", caption: CAPTION, motion: ["reveal", "flow"],
      nodes: [
        { id: "user", label: "User", role: "external" },
        { id: "audit", label: "Auditor", role: "external" },
        { id: "lb", label: "Load balancer", group: "vpc" },
        { id: "api", label: "API", group: "private", role: "emphasis" },
        { id: "db", label: "Database", group: "private" },
      ],
      edges: [
        { from: "user", to: "lb" }, { from: "audit", to: "lb", style: "dashed" },
        { from: "lb", to: "api" }, { from: "api", to: "db" },
      ],
      groups: [
        { id: "cloud", label: "Cloud" },
        { id: "vpc", label: "VPC", parent: "cloud" },
        { id: "private", label: "Private subnet", parent: "vpc" },
      ],
    },
  },
  {
    title: "Swimlanes",
    note: "who does each step; reveal + trace",
    spec: {
      id: "order", label: "Order to cash", caption: CAPTION, motion: ["reveal", "trace"],
      nodes: [
        { id: "place", label: "Place order", lane: "customer" },
        { id: "check", label: "Check stock", lane: "sales" },
        { id: "review", label: "Credit review", lane: "sales", role: "emphasis" },
        { id: "pack", label: "Pack", lane: "warehouse" },
        { id: "pay", label: "Pay", lane: "customer" },
        { id: "ship", label: "Ship", lane: "warehouse", role: "terminal", tone: "good" },
      ],
      edges: [
        { from: "place", to: "check" }, { from: "place", to: "review" }, { from: "check", to: "pack" },
        { from: "review", to: "pack", label: "approved" }, { from: "pack", to: "pay" }, { from: "pay", to: "ship" },
      ],
      lanes: [{ id: "customer", label: "Customer" }, { id: "sales", label: "Sales" }, { id: "warehouse", label: "Warehouse" }],
    },
  },
  {
    title: "Shapes, icons and a legend",
    note: "an architecture: cylinder, queue, diamond, hexagon, cloud, stack, document; reveal + flow",
    spec: {
      id: "arch", label: "How an order is served", caption: CAPTION, direction: "ttb", motion: ["reveal", "flow"],
      nodes: [
        { id: "user", label: "Customer", icon: "user", role: "external", shape: "cloud" },
        { id: "api", label: "API gateway", shape: "hexagon", icon: "globe", role: "emphasis" },
        { id: "auth", label: "Valid token?", shape: "diamond" },
        { id: "svc", label: "Order service", shape: "stack", sublabel: "3 replicas", icon: "gear", size: "lg" },
        { id: "q", label: "Events", shape: "queue", size: "sm" },
        { id: "db", label: "Orders DB", shape: "cylinder", icon: "database", tone: "good" },
        { id: "rep", label: "Daily report", shape: "document", tone: "watch" },
      ],
      edges: [
        { from: "user", to: "api", arrow: "both" }, { from: "api", to: "auth" }, { from: "auth", to: "svc", label: "yes" },
        { from: "svc", to: "q", style: "dashed" }, { from: "svc", to: "db" }, { from: "db", to: "rep", style: "emphasis" },
        { from: "svc", to: "api", style: "dashed" }, { from: "q", to: "rep", arrow: "none" },
      ],
      legend: [{ swatch: "cylinder", label: "Data store" }, { swatch: "queue", label: "Queue" }, { swatch: "dashed", label: "Asynchronous" }, { swatch: "external", label: "Outside our control" }, { swatch: "good", label: "Healthy" }],
    },
  },
  {
    title: "Mind map",
    note: "kind: mindmap; branches take turns being coloured; reveal + trace",
    spec: {
      kind: "mindmap", id: "mm", label: "The visual system", caption: CAPTION, motion: ["reveal", "trace"], interactive: true,
      center: { id: "vis", label: "Visual system", icon: "gear" },
      branches: [
        { id: "tokens", label: "Tokens", children: [{ id: "col", label: "Colour" }, { id: "str", label: "Strokes" }, { id: "mot", label: "Motion" }] },
        { id: "engines", label: "Engines", children: [{ id: "dia", label: "Diagrams", children: [{ id: "lan", label: "Lanes" }, { id: "grp", label: "Groups" }] }, { id: "cha", label: "Charts" }] },
        { id: "export", label: "Export", children: [{ id: "svg", label: "SVG" }, { id: "png", label: "PNG" }] },
        { id: "docs", label: "Docs", children: [{ id: "con", label: "Contract" }, { id: "aut", label: "Authoring" }] },
      ],
    },
  },
  {
    title: "Hierarchy",
    note: "kind: tree; reveal by level",
    spec: {
      kind: "tree", id: "org", label: "How the team is organised", caption: CAPTION, motion: ["reveal", "trace"],
      root: { id: "ceo", label: "Chief executive", children: [
        { id: "cto", label: "Technology", sublabel: "Engineering and data", children: [{ id: "plat", label: "Platform" }, { id: "app", label: "Applications" }, { id: "sec", label: "Security", tone: "warn" }] },
        { id: "cfo", label: "Finance", children: [{ id: "fpa", label: "Planning" }, { id: "ctl", label: "Control" }] },
        { id: "coo", label: "Operations", children: [{ id: "sup", label: "Support" }] },
      ] },
    },
  },
  {
    title: "Sequence",
    note: "kind: sequence; each message plays in order",
    spec: {
      kind: "sequence", id: "sq", label: "How an order is placed", caption: CAPTION, motion: ["reveal", "trace", "flow"],
      participants: [{ id: "u", label: "Browser", icon: "globe" }, { id: "api", label: "API", shape: "hexagon" }, { id: "db", label: "Database", shape: "cylinder" }],
      messages: [
        { from: "u", to: "api", label: "POST /orders" }, { from: "api", to: "api", label: "Validate" },
        { from: "api", to: "db", label: "INSERT order", style: "emphasis" }, { from: "db", to: "api", label: "id", style: "dashed" },
        { from: "api", to: "u", label: "201 Created", style: "dashed" },
      ],
    },
  },
  {
    title: "Timeline",
    note: "kind: timeline; in order, not to scale",
    spec: {
      kind: "timeline", id: "tl", label: "How the library grew", caption: CAPTION, motion: ["reveal", "trace"],
      events: [
        { id: "a", when: "Step 1", label: "Scene model", detail: "One drawing for page and file" }, { id: "b", when: "Step 2", label: "Nested groups", detail: "Cloud, VPC, subnet" },
        { id: "c", when: "Step 3", label: "Swimlanes", tone: "good" }, { id: "d", when: "Step 4", label: "New figure kinds" }, { id: "e", when: "Step 5", label: "Charts on the scene", tone: "watch" },
      ],
      phases: [{ id: "p1", label: "Foundation", from: "a", to: "b" }, { id: "p2", label: "Breadth", from: "c", to: "e" }],
    },
  },
  {
    title: "Matrix",
    note: "kind: matrix; relative standing, not measured",
    spec: {
      kind: "matrix", id: "mx", label: "What to build next", caption: CAPTION, motion: ["reveal"],
      x: { label: "Effort", low: "Low", high: "High" }, y: { label: "Impact", low: "Low", high: "High" }, quadrants: ["Do next", "Plan", "Maybe", "Skip"],
      items: [
        { id: "a", label: "SVG export", x: 0.2, y: 0.9, tone: "good" }, { id: "b", label: "Nested groups", x: 0.3, y: 0.75 }, { id: "c", label: "Network graphs", x: 0.8, y: 0.7 },
        { id: "d", label: "Pan and zoom", x: 0.7, y: 0.35, tone: "watch" }, { id: "e", label: "Icons", x: 0.15, y: 0.3 }, { id: "f", label: "3D charts", x: 0.9, y: 0.1, tone: "bad" },
      ],
    },
  },
  {
    title: "Network",
    note: "kind: network; a seeded layout, so the picture never changes between builds; reveal + hover focus",
    spec: {
      kind: "network", id: "nw", label: "How the services connect", caption: CAPTION, motion: ["reveal"], interactive: true,
      nodes: [
        { id: "a", label: "Gateway", weight: 5, cluster: "edge" }, { id: "b", label: "Auth", weight: 3, cluster: "edge" }, { id: "c", label: "Orders", weight: 4, cluster: "core" },
        { id: "d", label: "Billing", weight: 3, cluster: "core" }, { id: "e", label: "Search", weight: 2, cluster: "data" }, { id: "f", label: "Cache", weight: 2, cluster: "data", tone: "watch" }, { id: "g", label: "Mailer", weight: 1, cluster: "edge" },
      ],
      links: [
        { from: "a", to: "b", directed: true }, { from: "a", to: "c", directed: true }, { from: "c", to: "d", directed: true },
        { from: "c", to: "e" }, { from: "e", to: "f" }, { from: "d", to: "g", style: "dashed" }, { from: "b", to: "g" },
      ],
    },
  },
  {
    title: "Chart",
    note: "kind: chart, type column; reveal, hover a category",
    spec: {
      kind: "chart", id: "stages", label: "Where the time goes", caption: CAPTION, type: "column", basis: "measured",
      source: "the platform benchmark, Ryzen 9 3900X", unit: "ms", motion: ["reveal"], interactive: true, note: "Review is the slowest stage.",
      categories: [{ label: "Intake" }, { label: "Review" }, { label: "Delivery" }, { label: "Archive" }],
      series: [{ id: "a", label: "This quarter", values: [12, 48, 30, null] }, { id: "b", label: "Last quarter", values: [14, 40, 35, 22] }, { id: "c", label: "Target", values: [10, 30, 25, 20] }],
    },
  },
  {
    title: "Line chart",
    note: "kind: chart, type line; the line draws on, and breaks at a missing value",
    spec: {
      kind: "chart", id: "latency", label: "Latency over time", caption: CAPTION, type: "line", basis: "illustrative", unit: "ms", motion: ["reveal", "trace"],
      categories: [{ label: "Jan" }, { label: "Feb" }, { label: "Mar" }, { label: "Apr" }, { label: "May" }],
      series: [{ id: "a", label: "Latency", values: [12, 18, null, 30, 26] }, { id: "b", label: "Target", values: [20, 20, 20, 20, 20] }],
    },
  },
  {
    title: "Orthogonal routing",
    note: "routing: orthogonal",
    spec: {
      id: "ortho", label: "How a request flows", caption: CAPTION, routing: "orthogonal", motion: ["reveal", "trace", "flow"],
      nodes: [{ id: "c", label: "Client" }, { id: "g", label: "Gateway", role: "emphasis" }, { id: "a", label: "Auth service" }, { id: "o", label: "Order service" }, { id: "d", label: "Database", shape: "cylinder" }],
      edges: [{ from: "c", to: "g" }, { from: "g", to: "a" }, { from: "g", to: "o" }, { from: "o", to: "d" }],
    },
  },
  {
    title: "Top to bottom",
    note: "reveal only",
    spec: {
      id: "pipeline", label: "A pipeline", caption: CAPTION, direction: "ttb", motion: ["reveal"],
      nodes: ["Ingest", "Validate", "Transform", "Publish"].map((l) => ({ id: l.toLowerCase(), label: l })),
      edges: [["ingest", "validate"], ["validate", "transform"], ["transform", "publish"]].map(([from, to]) => ({ from, to })),
    },
  },
  {
    title: "Static",
    note: "no motion: what every existing figure still looks like",
    spec: {
      id: "static", label: "A static figure", caption: CAPTION,
      nodes: [{ id: "a", label: "Input" }, { id: "b", label: "Decision", role: "emphasis" }, { id: "c", label: "Result", role: "terminal", tone: "bad" }],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c", label: "blocked", style: "emphasis" }],
    },
  },
];
