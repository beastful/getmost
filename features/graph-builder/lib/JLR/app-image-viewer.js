// app-image-viewer.js
export const imageViewerApp = {
  initialState: {
    seed: 0,
    loading: false
  },

  render: ["div", {
    style: {
      textAlign: "center",
      padding: "40px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }
  },
    ["h2", { style: { color: "#222", marginBottom: "20px" } }, "Random Image Viewer"],

    ["div", {
      style: {
        marginBottom: "20px",
        padding: "12px",
        background: "#f5f5f5",
        borderRadius: "6px",
        fontFamily: "monospace",
        fontSize: "14px",
        textAlign: "left"
      }
    },
      ["p", { style: { margin: "4px 0" } }, ["concat", "seed: ", ["get", "seed"]]],
      ["p", { style: { margin: "4px 0" } }, ["concat", "loading: ", ["get", "loading"]]]
    ],

    ["div", {
      style: {
        minHeight: "300px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    },
      ["if", ["get", "loading"],
        ["p", { style: { color: "#666", fontSize: "18px" } }, "Loading..."],
        ["img", {
          src: ["concat", "https://picsum.photos/200/300?random=", ["get", "seed"]],
          alt: "Random",
          style: {
            width: "200px",
            height: "300px",
            objectFit: "cover",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
          }
        }],
        ["p", { style: { color: "#000", fontSize: "18px" } }, "Loading..."],
      ]
    ],



    ["button", {
      onClick: ["seq",
        ["set", "loading", true],
        ["set", "seed", ["sum", ["get", "seed"], 1]],
        ["then", ["sleep", 1000], ["lambda", ["_"], ["set", "loading", false]]]
      ],
      style: {
        marginTop: "24px",
        padding: "12px 28px",
        fontSize: "16px",
        cursor: "pointer",
        background: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontWeight: "500"
      }
    }, "Load New Image"]
  ]
};
