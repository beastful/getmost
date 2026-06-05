export const todoApp = {
  initialState: {
    todos: [
      { id: 1, text: "Learn JSONLang", done: false },
      { id: 2, text: "Build a web app", done: true },
      { id: 3, text: "Ship to production", done: false }
    ],
    nextId: 4,
    input: ""
  },

  actions: {
    addTodo: ["if", ["is", ["get", "input"], ""],
      ["log", "Empty input ignored"],
      ["seq",
        ["set", "todos", ["concat", ["get", "todos"], ["array",
          ["object",
            "id", ["get", "nextId"],
            "text", ["get", "input"],
            "done", false
          ]
        ]]],
        ["set", "nextId", ["sum", ["get", "nextId"], 1]],
        ["set", "input", ""]
      ]
    ],

    toggleTodo: ["lambda", ["todoId"], [
      "set", "todos", ["map", ["get", "todos"], ["lambda", ["t"], [
        "if", ["is", ["get_path", ["get_local", "t"], "id"], ["get_local", "todoId"]],
        ["merge", ["get_local", "t"], ["object", "done", ["not", ["get_path", ["get_local", "t"], "done"]]]],
        ["get_local", "t"]
      ]]]
    ]],

    deleteTodo: ["lambda", ["todoId"], [
      "set", "todos", ["filter", ["get", "todos"], ["lambda", ["t"], [
        "not", ["is", ["get_path", ["get_local", "t"], "id"], ["get_local", "todoId"]]
      ]]]
    ]]
  },

  render: ["div", {
    style: { maxWidth: "480px", margin: "40px auto", fontFamily: "system-ui, sans-serif" }
  },
    ["h1", { style: { color: "#222" } }, "Todo List"],

    ["div", { style: { display: "flex", gap: "8px", marginBottom: "20px" } },
      ["input", {
        type: "text",
        value: ["get", "input"],
        placeholder: "What needs to be done?",
        onChange: ["set", "input", ["get_path", ["get_local", "$event"], "target", "value"]],
        style: { flex: 1, padding: "10px 14px", fontSize: "16px", borderRadius: "6px", border: "1px solid #ddd" }
      }],
      ["button", {
        onClick: ["action", "addTodo"],
        style: { padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }
      }, "Add"]
    ],

    ["ul", { style: { listStyle: "none", padding: 0 } },
      ["map", ["get", "todos"], ["lambda", ["todo"], [
        "li", {
          key: ["get_path", ["get_local", "todo"], "id"],
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #eee"
          }
        },
          ["span", {
            "data-todo-id": ["get_path", ["get_local", "todo"], "id"],
            style: ["if", ["get_path", ["get_local", "todo"], "done"],
              { textDecoration: "line-through", color: "#999", cursor: "pointer" },
              { cursor: "pointer", color: "#333" }
            ],
            onClick: ["then",
              ["to_number", ["get_path", ["get_local", "$event"], "target", "dataset", "todoId"]],
              ["run", ["get", "toggleTodo"]]
            ]
          }, ["get_path", ["get_local", "todo"], "text"]],

          ["button", {
            "data-todo-id": ["get_path", ["get_local", "todo"], "id"],
            onClick: ["then",
              ["to_number", ["get_path", ["get_local", "$event"], "target", "dataset", "todoId"]],
              ["run", ["get", "deleteTodo"]]
            ],
            style: { background: "transparent", border: "none", color: "#dc3545", cursor: "pointer", fontSize: "14px" }
          }, "Delete"]
      ]]]
    ]
  ]
};
