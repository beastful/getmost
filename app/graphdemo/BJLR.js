"use client";

import React from "react";
import {
  Sigma,
  Type,
  ToggleLeft,
  Binary,
  Box,
} from "lucide-react";

/**
 * -----------------------------
 * Registry
 * -----------------------------
 */

export const NODE_REGISTRY = new Map();
export const OP_REGISTRY = new Map();
export const ACTION_REGISTRY = new Map();

export function registerNode(def) {
  NODE_REGISTRY.set(def.name, normalizeNode(def));
}

export function getNode(name) {
  return NODE_REGISTRY.get(name) || null;
}

export function getAllNodes() {
  return Array.from(NODE_REGISTRY.values());
}

export function registerOp(name, fn) {
  OP_REGISTRY.set(name, fn);
}

export function registerAction(name, fn) {
  ACTION_REGISTRY.set(name, fn);
}

/**
 * -----------------------------
 * Helpers
 * -----------------------------
 */

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function flattenChildren(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return [v];
  return v.flatMap(flattenChildren);
}

function getByPath(obj, path, fallback = null) {
  if (!path) return obj ?? fallback;
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return fallback;
    cur = cur[part];
  }
  return cur ?? fallback;
}

function collectRefs(expr, set = new Set()) {
  if (!Array.isArray(expr)) return set;
  const [head, ...args] = expr;

  if (head === "$input" && typeof args[0] === "string") {
    set.add(args[0]);
  }

  if (head === "$input_field" && typeof args[0] === "string") {
    set.add(args[0]);
  }

  for (const arg of args) collectRefs(arg, set);
  return set;
}

function normalizeNode(def) {
  const explicitInputs = def.inputs || [];
  const autoInputs = new Map();

  for (const out of def.outputs || []) {
    const refs = collectRefs(out.template);
    for (const id of refs) {
      autoInputs.set(id, { id, name: id });
    }
  }

  for (const inp of explicitInputs) {
    autoInputs.set(inp.id, inp);
  }

  return {
    name: def.name,
    category: def.category || "General",
    icon: def.icon || "Box",
    width: def.width || 260,
    controlled: def.controlled !== false,
    state: def.state || {},
    inputs: Array.from(autoInputs.values()),
    outputs: def.outputs || [],
    ui: def.ui || null,
  };
}

/**
 * -----------------------------
 * Icons
 * -----------------------------
 */

const ICONS = {
  Sigma,
  Type,
  ToggleLeft,
  Binary,
  Box,
};

export function resolveIcon(name) {
  return ICONS[name] || Box;
}

/**
 * -----------------------------
 * Template engine
 * -----------------------------
 */

const DEFAULT_OPS = {
  sum: (...xs) => xs.reduce((a, b) => Number(a || 0) + Number(b || 0), 0),
  multiply: (...xs) => xs.reduce((a, b) => Number(a || 1) * Number(b || 1), 1),
  divide: (a, b) => Number(a || 0) / Number(b || 1),
  pow: (a, b) => Math.pow(Number(a || 0), Number(b || 0)),
  concat: (...xs) => xs.map((x) => (x == null ? "" : String(x))).join(""),
  array: (...xs) => xs,
  object: (...xs) => {
    const out = {};
    for (let i = 0; i < xs.length; i += 2) out[xs[i]] = xs[i + 1];
    return out;
  },
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  and: (...xs) => xs.every(Boolean),
  or: (...xs) => xs.some(Boolean),
  not: (x) => !x,
  if: (cond, a, b) => (cond ? a : b),
  length: (x) => {
    if (Array.isArray(x) || typeof x === "string") return x.length;
    if (isObject(x)) return Object.keys(x).length;
    return 0;
  },
  tonumber: (x) => {
    if (typeof x === "number") return x;
    if (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x))) {
      return Number(x);
    }
    return 0;
  },
};

for (const [name, fn] of Object.entries(DEFAULT_OPS)) {
  registerOp(name, fn);
}

export function evaluateTemplate(expr, ctx) {
  if (expr == null) return expr;
  if (!Array.isArray(expr)) return expr;

  const [head, ...rawArgs] = expr;

  if (head === "$input") {
    const [inputId, fallback = null] = rawArgs;
    const value = ctx.inputs?.[inputId];
    return value === undefined ? fallback : value;
  }

  if (head === "$state") {
    const [key, fallback = null] = rawArgs;
    const value = ctx.state?.[key];
    return value === undefined ? fallback : value;
  }

  if (head === "$template") {
    const [outputId, fallback = null] = rawArgs;
    const value = ctx.templates?.[outputId];
    return value === undefined ? fallback : value;
  }

  if (head === "$input_field") {
    const [inputId, pathExpr, fallback = null] = rawArgs;
    const source = ctx.inputs?.[inputId];
    const path = Array.isArray(pathExpr) ? evaluateTemplate(pathExpr, ctx) : pathExpr;
    return getByPath(source, path, fallback);
  }

  if (head === "$event") {
    const [path, fallback = null] = rawArgs;
    return getByPath(ctx.event, path, fallback);
  }

  if (head === "$literal") {
    return rawArgs[0];
  }

  const args = rawArgs.map((arg) => evaluateTemplate(arg, ctx));
  const op = OP_REGISTRY.get(head);

  if (!op) return null;
  return op(...args, ctx);
}

export function evaluateOutputs(nodeDef, ctx) {
  const templates = {};
  for (const output of nodeDef.outputs) {
    templates[output.id] = evaluateTemplate(output.template, {
      ...ctx,
      templates,
    });
  }
  return templates;
}

/**
 * -----------------------------
 * UI engine
 * UI node format:
 * ["div", { className: "..." }, [...children]]
 * Text bindings can be:
 * ["$use_input", "a", "fallback"]
 * ["$use_state", "name", "fallback"]
 * ["$use_template", "out", "fallback"]
 * ["$text", expr]
 * -----------------------------
 */

function resolveUiValue(value, ctx) {
  if (!Array.isArray(value)) return value;

  const [head, ...args] = value;

  if (head === "$use_input") {
    const [id, fallback = ""] = args;
    return ctx.inputs?.[id] ?? fallback;
  }

  if (head === "$use_state") {
    const [key, fallback = ""] = args;
    return ctx.state?.[key] ?? fallback;
  }

  if (head === "$use_template") {
    const [id, fallback = ""] = args;
    return ctx.templates?.[id] ?? fallback;
  }

  if (head === "$text") {
    return evaluateTemplate(args[0], ctx);
  }

  return evaluateTemplate(value, ctx);
}

function resolvePropValue(key, value, ctx) {
  if (key === "className") return value;
  if (key === "placeholder") return resolveUiValue(value, ctx);
  if (key === "value") return resolveUiValue(value, ctx);
  if (key === "checked") return !!resolveUiValue(value, ctx);
  return resolveUiValue(value, ctx);
}

function runAction(action, ctx, e) {
  if (!Array.isArray(action)) return;
  const [head, ...args] = action;

  if (head === "$set_state") {
    const [key, valueExpr] = args;
    const nextValue = evaluateTemplate(valueExpr, { ...ctx, event: e });
    ctx.setState(key, nextValue);
    return;
  }

  if (head === "$toggle_state") {
    const [key] = args;
    ctx.setState(key, !ctx.state?.[key]);
    return;
  }

  if (head === "$patch_state") {
    const [patchExpr] = args;
    const patch = evaluateTemplate(patchExpr, { ...ctx, event: e });
    if (isObject(patch)) {
      for (const [k, v] of Object.entries(patch)) {
        ctx.setState(k, v);
      }
    }
    return;
  }

  if (head === "$alert") {
    const [valueExpr] = args;
    const value = evaluateTemplate(valueExpr, { ...ctx, event: e });
    window.alert(String(value ?? ""));
    return;
  }

  if (head === "$log") {
    const [valueExpr] = args;
    const value = evaluateTemplate(valueExpr, { ...ctx, event: e });
    console.log(value);
    return;
  }

  if (head === "$batch") {
    for (const sub of args) {
      runAction(sub, ctx, e);
    }
    return;
  }

  const custom = ACTION_REGISTRY.get(head);
  if (custom) {
    return custom({ ...ctx, event: e }, ...args);
  }
}

function buildEventHandler(action, ctx) {
  if (!Array.isArray(action)) return undefined;
  return (e) => runAction(action, ctx, e);
}

export function renderUiAst(node, ctx, key = "root") {
  if (node == null) return null;

  if (typeof node === "string" || typeof node === "number") return node;

  if (!Array.isArray(node)) return null;

  const [tag, maybeProps, maybeChildren] = node;

  if (tag === "$use_input") return String(resolveUiValue(node, ctx));
  if (tag === "$use_state") return String(resolveUiValue(node, ctx));
  if (tag === "$use_template") return String(resolveUiValue(node, ctx));
  if (tag === "$text") return String(resolveUiValue(node, ctx) ?? "");

  const props = isObject(maybeProps) ? maybeProps : {};
  const children = isObject(maybeProps) ? maybeChildren : maybeProps;

  const finalProps = { key };

  for (const [propKey, propVal] of Object.entries(props)) {
    if (/^on[A-Z]/.test(propKey)) {
      finalProps[propKey] = buildEventHandler(propVal, ctx);
    } else {
      finalProps[propKey] = resolvePropValue(propKey, propVal, ctx);
    }
  }

  const renderedChildren = flattenChildren(children).map((child, i) =>
    renderUiAst(child, ctx, `${key}.${i}`)
  );

  return React.createElement(tag, finalProps, ...renderedChildren);
}

/**
 * -----------------------------
 * Sample nodes
 * -----------------------------
 */

registerNode({
  name: "Number",
  category: "Basic",
  icon: "Binary",
  state: { value: 42 },
  outputs: [
    {
      id: "out",
      name: "Value",
      template: ["$state", "value", 0],
    },
  ],
  ui: [
    "div",
    { className: "flex flex-col gap-2" },
    [
      ["label", { className: "text-[11px] font-semibold uppercase tracking-wide text-slate-500" }, ["Value"]],
      [
        "input",
        {
          type: "number",
          className:
            "w-full rounded-md border-2 border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500",
          value: ["$use_state", "value", 0],
          onChange: ["$set_state", "value", ["$event", "target.value"]],
        },
        [],
      ],
      [
        "div",
        { className: "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 font-mono" },
        [["$use_template", "out", ""]],
      ],
    ],
  ],
});

registerNode({
  name: "Text",
  category: "Basic",
  icon: "Type",
  state: { value: "hello" },
  outputs: [
    {
      id: "out",
      name: "Text",
      template: ["$state", "value", ""],
    },
  ],
  ui: [
    "div",
    { className: "flex flex-col gap-2" },
    [
      ["label", { className: "text-[11px] font-semibold uppercase tracking-wide text-slate-500" }, ["Text"]],
      [
        "input",
        {
          type: "text",
          className:
            "w-full rounded-md border-2 border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500",
          value: ["$use_state", "value", ""],
          onChange: ["$set_state", "value", ["$event", "target.value"]],
        },
        [],
      ],
      [
        "div",
        { className: "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 font-mono break-all" },
        [["$use_template", "out", ""]],
      ],
    ],
  ],
});

registerNode({
  name: "Boolean",
  category: "Basic",
  icon: "ToggleLeft",
  state: { value: true },
  outputs: [
    {
      id: "out",
      name: "Bool",
      template: ["$state", "value", false],
    },
  ],
  ui: [
    "div",
    { className: "flex items-center gap-2" },
    [
      [
        "input",
        {
          type: "checkbox",
          className: "h-4 w-4",
          checked: ["$use_state", "value", false],
          onChange: ["$set_state", "value", ["$event", "target.checked"]],
        },
        [],
      ],
      ["span", { className: "text-sm text-slate-700" }, [["$text", ["if", ["$state", "value", false], "true", "false"]]]],
    ],
  ],
});

registerNode({
  name: "Sum",
  category: "Math",
  icon: "Sigma",
  inputs: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
  outputs: [
    {
      id: "out",
      name: "Result",
      template: ["sum", ["$input", "a", 0], ["$input", "b", 0]],
    },
  ],
  ui: [
    "div",
    { className: "flex flex-col gap-2" },
    [
      ["div", { className: "text-xs text-slate-500" }, ["A + B"]],
      [
        "div",
        { className: "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 font-mono" },
        [["$use_template", "out", 0]],
      ],
      [
        "button",
        {
          className: "rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50",
          onClick: ["$alert", ["$template", "out", 0]],
        },
        ["Alert result"],
      ],
    ],
  ],
});

registerNode({
  name: "Field Sum",
  category: "Math",
  icon: "Box",
  state: { field: "x" },
  inputs: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "obj", name: "Object" },
  ],
  outputs: [
    {
      id: "out",
      name: "Result",
      template: [
        "sum",
        ["$input", "a", 0],
        ["$input", "b", 0],
        ["$input_field", "obj", ["$state", "field", "x"], 0],
      ],
    },
  ],
  ui: [
    "div",
    { className: "flex flex-col gap-2" },
    [
      ["label", { className: "text-[11px] font-semibold uppercase tracking-wide text-slate-500" }, ["Object field"]],
      [
        "input",
        {
          type: "text",
          className:
            "w-full rounded-md border-2 border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500",
          value: ["$use_state", "field", "x"],
          onChange: ["$set_state", "field", ["$event", "target.value"]],
        },
        [],
      ],
      [
        "div",
        { className: "text-xs text-slate-500" },
        ["obj[", ["$use_state", "field", "x"], "]"],
      ],
      [
        "div",
        { className: "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 font-mono" },
        [["$use_template", "out", 0]],
      ],
      [
        "button",
        {
          className: "rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50",
          onClick: ["$alert", ["$template", "out", 0]],
        },
        ["Alert result"],
      ],
    ],
  ],
});
