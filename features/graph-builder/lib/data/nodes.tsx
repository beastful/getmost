import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";

/* ---------- Engine integration ---------- */
// import { JSONLangEngine } from "./json-lang-engine";
import { JSONLangEngine } from "../JLR/json-lang-engine";
import { Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

const engine = new JSONLangEngine({ debug: false, trace: false, maxGas: 100000 });

export interface NodeInput {
    id: string;
    name: string;
}

export interface NodeOutput {
    id: string;
    name: string;
    template: (inputs: Record<string, any>, state: Record<string, any>) => any;
}


export interface NodeDef {
    // ... existing fields
    width?: number;
    name: string;
    category: string;
    inputs: NodeInput[];
    outputs: NodeOutput[];
    defaultState: Record<string, any>;
    icon: React.FC;
    controlled?: boolean;
    visual: React.FC<{
        state: Record<string, any>;
        setState: (key: string, val: any) => void;
        inputs: Record<string, any>;
        getTemplate: (outputId: string) => any;
        getInputTemplate?: (inputId: string) => any;   // new
    }>;
}

/* Register HTML tags as opaque so React nodes survive evaluation */
engine.registerOpaque(
    "div", "span", "p", "button", "input", "h1", "h2", "h3", "h4", "h5", "h6",
    "img", "a", "ul", "ol", "li", "form", "label", "textarea", "select",
    "option", "section", "article", "header", "footer", "main", "nav",
    "aside", "strong", "em", "code", "pre"
);

/* Register API helpers */
engine.registerNative("json_parse", (args: any[]) => JSON.parse(args[0]));
engine.registerNative("json_stringify", (args: any[]) => JSON.stringify(args[0], null, args[1] ?? undefined));
engine.registerNative("build_query", (args: any[]) => new URLSearchParams(args[0]).toString());
engine.registerNative("to_number", (args: any[]) => {
    const val = args[0];
    if (typeof val === "number") return val;
    if (typeof val === "string" && !isNaN(Number(val))) return Number(val);
    return 0;
});

engine.registerNative("try_compare", async (args: any[]) => {
    const [valueExpr, op, compareValue, trueVal, falseVal, errorVal] = args;
    // valueExpr is a JSON‑Lang expression (array) that we evaluate safely
    let value;
    try {
        value = await engine.process(valueExpr);
    } catch (e: any) {
        return errorVal;
    }
    // Compare
    let cond = false;
    if (op === "is") cond = value == compareValue;
    else if (op === "gt") cond = Number(value) > Number(compareValue);
    else if (op === "lt") cond = Number(value) < Number(compareValue);
    return cond ? trueVal : falseVal;
});

engine.registerNative("fetch_advanced", async (args: any[]) => {
    const [url, options = {}] = args;
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try {
        data = JSON.parse(text);
    } catch {
        /* not JSON */
    }
    return {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        data,
        text,
    };
});

/* ---------- HTML / DOM ---------- */
engine.registerNative("html_query", (args: any[]) => {
    const [html, selector, mode = "text", attrName = ""] = args;
    if (typeof html !== "string") return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const el = doc.querySelector(selector);
    if (!el) return null;
    if (mode === "text") return el.textContent ?? null;
    if (mode === "html") return el.innerHTML ?? null;
    if (mode === "attr") return el.getAttribute(attrName) ?? null;
    return null;
});

/* ---------- String utilities ---------- */
engine.registerNative("regex_extract", (args: any[]) => {
    const [text, pattern, group = 0] = args;
    if (typeof text !== "string" || typeof pattern !== "string") return null;
    const re = new RegExp(pattern);
    const m = text.match(re);
    if (!m) return null;
    return m[Number(group)] ?? null;
});

engine.registerNative("template", (args: any[]) => {
    let [str, ...values] = args;
    str = String(str);
    values.forEach((v, idx) => {
        str = str.replace(new RegExp(`\\{${idx}\\}`, 'g'), String(v ?? ""));
    });
    return str;
});

engine.registerNative("date_format", (args: any[]) => {
    const [timestamp, locale = "en-US", options = {}] = args;
    const date = new Date(Number(timestamp));
    return date.toLocaleString(String(locale), typeof options === "object" ? options : {});
});

/* ---------- Store / Clipboard ---------- */
engine.registerNative("storage_get", (args: any[]) => {
    try { return localStorage.getItem(String(args[0])); } catch { return null; }
});

engine.registerNative("storage_set", (args: any[]) => {
    try { localStorage.setItem(String(args[0]), JSON.stringify(args[1])); return args[1]; } catch { return null; }
});

engine.registerNative("clipboard_copy", async (args: any[]) => {
    try { await navigator.clipboard.writeText(String(args[0])); return true; } catch { return false; }
});

// ADDED: fetch_json native – used by the Fetch node, returns only the JSON data
engine.registerNative("fetch_json", async (args: any[]) => {
    const [url] = args;
    const response = await engine.process(["fetch_advanced", url]);
    return response.data;
});

export async function evaluateJSONLang(expr: any): Promise<any> {
    if (expr === null || typeof expr !== "object") return expr;
    return engine.process(expr);
}

export { engine };

/* ---------- UI primitives (unchanged) ---------- */
const L: React.FC<{ text: string }> = ({ text }) => (
    <div
        style={{
            fontSize: 10,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 4,
            fontWeight: 600,
        }}
    >
        {text}
    </div>
);

const In: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        style={{
            width: "100%",
            background: "#ffffff",
            border: "2px solid #e5e7eb",
            color: "#111827",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            fontWeight: 500,
            transition: "border-color 0.15s, box-shadow 0.15s",
            ...(props.style as any),
        }}
        onFocus={(e) => {
            e.currentTarget.style.borderColor = "#6366f1";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
            props.onFocus?.(e);
        }}
        onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
        }}
    />
);

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        style={{
            width: "100%",
            background: "#ffffff",
            border: "2px solid #e5e7eb",
            color: "#111827",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            outline: "none",
            fontFamily: "inherit",
            cursor: "pointer",
            fontWeight: 500,
        }}
    />
);

const Preview: React.FC<{ value: any }> = ({ value }) => (
    <pre
        style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "#f9fafb",
            borderRadius: 6,
            fontSize: 10,
            color: "#6b7280",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            border: "1px solid #e5e7eb",
        }}
        title={JSON.stringify(value, null, 2)}
    >
        {JSON.stringify(value)}
    </pre>
);

/* ---------- Registry (all templates return raw AST, no evaluation) ---------- */
export const NODES: NodeDef[] = [
    /* --- Basic --- */
    {
        name: "Number",
        category: "Basic",
        inputs: [],
        outputs: [{ id: "out", name: "Value", template: (_, s) => s.value }],
        defaultState: { value: 42 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Value" />
                <In type="number" value={state.value} onChange={(e) => setState("value", Number(e.target.value))} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "String",
        category: "Basic",
        inputs: [],
        outputs: [{ id: "out", name: "Text", template: (_, s) => s.text }],
        defaultState: { text: "hello" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Text" />
                <In value={state.text} onChange={(e) => setState("text", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Boolean",
        category: "Basic",
        inputs: [],
        outputs: [{ id: "out", name: "Bool", template: (_, s) => s.value }],
        defaultState: { value: true },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <In
                    type="checkbox"
                    checked={state.value}
                    onChange={(e) => setState("value", e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{state.value ? "true" : "false"}</span>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Color",
        category: "Basic",
        inputs: [],
        outputs: [{ id: "out", name: "Hex", template: (_, s) => s.color }],
        defaultState: { color: "#6366f1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <In
                    type="color"
                    value={state.color}
                    onChange={(e) => setState("color", e.target.value)}
                    style={{ width: 32, height: 32, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500, color: "#374151" }}>{state.color}</span>
            </div>
        ),
    },

    /* --- Math --- */
    {
        name: "Sum",
        category: "Math",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Result", template: (i) => ["sum", i.a ?? 0, i.b ?? 0] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>A + B</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Multiply",
        category: "Math",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Result", template: (i) => ["multiply", i.a ?? 1, i.b ?? 1] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>A × B</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Divide",
        category: "Math",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Result", template: (i) => ["divide", i.a ?? 1, i.b ?? 1] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="6" r="1" fill="currentColor" /><path d="M5 12h14" /><circle cx="12" cy="18" r="1" fill="currentColor" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>A ÷ B</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Pow",
        category: "Math",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Result", template: (i) => ["pow", i.a ?? 1, i.b ?? 1] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" /><path d="m17 8-5-5-5 5" /><path d="m17 16-5 5-5-5" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>A ^ B</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Random",
        category: "Math",
        inputs: [],
        outputs: [{ id: "out", name: "Value", template: (_, s) => ["random", s.min, s.max] }],
        defaultState: { min: 0, max: 100 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h6.5a2.5 2.5 0 0 0 0-5H2v-4h6.5a2.5 2.5 0 0 0 0-5H2" /><path d="M2 12h20" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                    <L text="Min" />
                    <In type="number" value={state.min} onChange={(e) => setState("min", Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                    <L text="Max" />
                    <In type="number" value={state.max} onChange={(e) => setState("max", Number(e.target.value))} />
                </div>
            </div>
        ),
    },
    {
        name: "ToNumber",
        category: "Math",
        inputs: [{ id: "a", name: "Value" }],
        outputs: [{ id: "out", name: "Num", template: (i) => ["to_number", i.a] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },

    /* --- Logic --- */
    {
        name: "Compare",
        category: "Logic",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Bool", template: (i, s) => [s.op, i.a ?? 0, i.b ?? 0] }],
        defaultState: { op: "gt" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Operator" />
                <Sel value={state.op} onChange={(e) => setState("op", e.target.value)}>
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="is">Equal</option>
                </Sel>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "If",
        category: "Logic",
        inputs: [
            { id: "cond", name: "Condition" },
            { id: "then", name: "Then" },
            { id: "else", name: "Else" },
        ],
        outputs: [{ id: "out", name: "Result", template: (i) => ["if", i.cond ?? false, i.then ?? null, i.else ?? null] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /><path d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>if / then / else</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "And",
        category: "Logic",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Bool", template: (i) => ["and", i.a ?? true, i.b ?? true] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h3v3h-3z" /><path d="M19 6h3v3h-3z" /><path d="M2 3h3v3H2z" /><path d="M5 6h3v3H5z" /><path d="M8 9h8v3H8z" /><path d="M8 12v8" /><path d="M16 12v8" /><path d="M8 20h8" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Or",
        category: "Logic",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Bool", template: (i) => ["or", i.a ?? false, i.b ?? false] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-5" /><path d="M2 12h5" /><path d="M8 12a4 4 0 0 1 8 0" /><path d="M8 12a4 4 0 0 0 8 0" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Not",
        category: "Logic",
        inputs: [{ id: "a", name: "Value" }],
        outputs: [{ id: "out", name: "Bool", template: (i) => ["not", i.a ?? false] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10H7z" /><path d="M17 7 7 17" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },

    /* --- Array --- */
    {
        name: "Array",
        category: "Array",
        inputs: [
            { id: "a", name: "Item 1" },
            { id: "b", name: "Item 2" },
            { id: "c", name: "Item 3" },
        ],
        outputs: [{ id: "out", name: "Array", template: (i) => ["array", i.a, i.b, i.c] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>[a, b, c]</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Length",
        category: "Array",
        inputs: [{ id: "arr", name: "Array" }],
        outputs: [{ id: "out", name: "Count", template: (i) => ["length", i.arr ?? []] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-1.6 1.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l1.6-1.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5.5.5" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Range",
        category: "Array",
        inputs: [
            { id: "start", name: "Start" },
            { id: "end", name: "End" },
        ],
        outputs: [{ id: "out", name: "Array", template: (i) => ["range", i.start ?? 0, i.end ?? 10] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m7 16 4-4-4-4" /><path d="m17 8-4 4 4 4" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Concat",
        category: "Array",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Joined", template: (i) => ["concat", i.a, i.b] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h3v3h-3z" /><path d="M19 6h3v3h-3z" /><path d="M2 3h3v3H2z" /><path d="M5 6h3v3H5z" /><path d="M8 9h8v3H8z" /><path d="M8 12v8" /><path d="M16 12v8" /><path d="M8 20h8" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Slice",
        category: "Array",
        inputs: [{ id: "arr", name: "Array" }],
        outputs: [{ id: "out", name: "Slice", template: (i, s) => ["slice", i.arr ?? [], s.start, s.end] }],
        defaultState: { start: 0, end: 5 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                    <L text="Start" />
                    <In type="number" value={state.start} onChange={(e) => setState("start", Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                    <L text="End" />
                    <In type="number" value={state.end} onChange={(e) => setState("end", Number(e.target.value))} />
                </div>
            </div>
        ),
    },

    /* --- Object --- */
    {
        name: "Object",
        category: "Object",
        inputs: [
            { id: "v1", name: "Val 1" },
            { id: "v2", name: "Val 2" },
        ],
        outputs: [{ id: "out", name: "Object", template: (i, s) => ["object", s.k1, i.v1, s.k2, i.v2] }],
        defaultState: { k1: "name", k2: "age" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 4 }}>
                    <In style={{ flex: 1 }} value={state.k1} onChange={(e) => setState("k1", e.target.value)} />
                    <In style={{ flex: 1 }} value={state.k2} onChange={(e) => setState("k2", e.target.value)} />
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", fontWeight: 500 }}>keys (inputs are values)</div>
            </div>
        ),
    },
    {
        name: "GetPath",
        category: "Object",
        inputs: [{ id: "obj", name: "Object" }],
        outputs: [{ id: "out", name: "Value", template: (i, s) => ["get_path", i.obj ?? {}, ...s.path.split(".").filter(Boolean)] }],
        defaultState: { path: "user.name" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 3-9.4 9.4" /><path d="m15 9 6 6" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Path (dot)" />
                <In value={state.path} onChange={(e) => setState("path", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Merge",
        category: "Object",
        inputs: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ],
        outputs: [{ id: "out", name: "Merged", template: (i) => ["merge", i.a ?? {}, i.b ?? {}] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },

    /* --- Store --- */
    {
        name: "StateGet",
        category: "Store",
        inputs: [],
        outputs: [{ id: "out", name: "Value", template: (_, s) => ["get", s.key] }],
        defaultState: { key: "count" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Key" />
                <In value={state.key} onChange={(e) => setState("key", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "StateSet",
        category: "Store",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Result", template: (i, s) => ["set", s.key, i.value] }],
        defaultState: { key: "count" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Key" />
                <In value={state.key} onChange={(e) => setState("key", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },

    /* --- IO --- */
    {
        name: "Fetch",
        category: "IO",
        inputs: [],
        outputs: [{ id: "out", name: "JSON", template: (_, s) => ["fetch_json", s.url] }],
        defaultState: { url: "https://jsonplaceholder.typicode.com/todos/1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="URL" />
                <In value={state.url} onChange={(e) => setState("url", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Log",
        category: "IO",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Pass", template: (i) => ["log", i.value] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M21 5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z" /><path d="M18 8v.5" /><path d="M16 9a2 2 0 0 1-4 0" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "Sleep",
        category: "IO",
        inputs: [],
        outputs: [{ id: "out", name: "Done", template: (_, s) => ["sleep", s.ms] }],
        defaultState: { ms: 1000 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div>
                <L text="ms" />
                <In type="number" value={state.ms} onChange={(e) => setState("ms", Number(e.target.value))} />
            </div>
        ),
    },
    {
        name: "Now",
        category: "IO",
        inputs: [],
        outputs: [{ id: "out", name: "Timestamp", template: () => ["now"] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", fontWeight: 500 }}>Date.now()</div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Execute",
        category: "IO",
        inputs: [{ id: "expr", name: "Expression" }],
        outputs: [{ id: "out", name: "Result", template: (i) => i.expr }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
        ),
        visual: ({ getTemplate }) => {
            const template = getTemplate("out");
            const [result, setResult] = useState<any>(undefined);
            const [error, setError] = useState<string | null>(null);

            useEffect(() => {
                let active = true;
                setError(null);
                setResult(undefined);
                evaluateJSONLang(template)
                    .then((r) => {
                        if (active) {
                            setResult(r);
                            setError(null);
                        }
                    })
                    .catch((e) => {
                        if (active) setError(e.message ?? String(e));
                    });
                return () => {
                    active = false;
                };
            }, [template]);

            return (
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            marginBottom: 4,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                        }}
                    >
                        Live Result
                    </div>
                    {error ? (
                        <div
                            style={{
                                padding: 8,
                                background: "#fef2f2",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#dc2626",
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                }}
                            >
                                {error}
                            </div>
                        </div>
                    ) : result !== undefined ? (
                        <div
                            style={{
                                padding: 8,
                                background: "#ecfdf5",
                                borderRadius: 6,
                                border: "1px solid #a7f3d0",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#059669",
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                }}
                            >
                                {JSON.stringify(result)}
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: 8,
                                background: "#f3f4f6",
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    fontFamily: "monospace",
                                }}
                            >
                                Loading…
                            </div>
                        </div>
                    )}
                    <Preview value={template} />
                </div>
            );
        },
    },

    /* --- API --- */
    {
        name: "HttpRequest",
        category: "API",
        inputs: [
            { id: "body", name: "Body" },
            { id: "query", name: "Query" },
        ],
        outputs: [
            {
                id: "out",
                name: "Response",
                template: (i, s) => [
                    "fetch_advanced",
                    [
                        "if",
                        ["gt", ["length", i.query ?? {}], 0],
                        ["concat", s.url, "?", ["build_query", i.query ?? {}]],
                        s.url,
                    ],
                    [
                        "merge",
                        ["object", "method", s.method, "headers", ["object", "Content-Type", "application/json"]],
                        [
                            "if",
                            ["is", s.method, "GET"],
                            ["object"],
                            ["object", "body", ["json_stringify", i.body ?? null]],
                        ],
                    ],
                ],
            },
        ],
        defaultState: { method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <Sel style={{ flex: 1 }} value={state.method} onChange={(e) => setState("method", e.target.value)}>
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                        <option>PATCH</option>
                    </Sel>
                </div>
                <div>
                    <In style={{ flex: 3 }} value={state.url} onChange={(e) => setState("url", e.target.value)} placeholder="https://api.example.com/data" />
                </div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "JSONParse",
        category: "API",
        inputs: [{ id: "text", name: "Text" }],
        outputs: [{ id: "out", name: "Object", template: (i) => ["json_parse", i.text ?? "{}"] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "JSONStringify",
        category: "API",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "JSON", template: (i, s) => ["json_stringify", i.value, s.indent] }],
        defaultState: { indent: 2 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Indent" />
                <In type="number" value={state.indent} onChange={(e) => setState("indent", Number(e.target.value))} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "QueryBuilder",
        category: "API",
        inputs: [{ id: "params", name: "Params" }],
        outputs: [{ id: "out", name: "Query", template: (i) => ["build_query", i.params ?? {}] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },
    {
        name: "StatusCheck",
        category: "API",
        inputs: [{ id: "response", name: "Response" }],
        outputs: [{ id: "out", name: "OK", template: (i, s) => ["is", ["get_path", i.response ?? {}, "status"], s.code] }],
        defaultState: { code: 200 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Expected Status" />
                <In type="number" value={state.code} onChange={(e) => setState("code", Number(e.target.value))} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "BearerAuth",
        category: "API",
        inputs: [],
        outputs: [{ id: "out", name: "Headers", template: (_, s) => ["object", "Authorization", ["concat", "Bearer ", s.token]] }],
        defaultState: { token: "api-token" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2 15 8" /><path d="m3 22 6-6" /><path d="m9 16-3 3 5 5 3-3" /><path d="m6 19-3 3" /><path d="m15 8 5 5" /><path d="m21 2-5 5" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="Token" />
                <In value={state.token} onChange={(e) => setState("token", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },

    /* --- React --- */
    {
        name: "Element",
        category: "React",
        inputs: [{ id: "child", name: "Child" }],
        outputs: [{ id: "out", name: "Element", template: (i, s) => [s.tag, { className: s.className }, i.child] }],
        defaultState: { tag: "div", className: "box" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <In style={{ flex: 1 }} value={state.tag} onChange={(e) => setState("tag", e.target.value)} />
                    <In style={{ flex: 1.5 }} value={state.className} onChange={(e) => setState("className", e.target.value)} />
                </div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Button",
        category: "React",
        inputs: [],
        outputs: [{ id: "out", name: "Element", template: (_, s) => ["button", { onClick: ["action", s.action] }, s.text] }],
        defaultState: { text: "Click me", action: "submit" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M9 12h6" /><path d="M12 9v6" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <In style={{ flex: 1 }} value={state.text} onChange={(e) => setState("text", e.target.value)} />
                    <In style={{ flex: 1 }} value={state.action} onChange={(e) => setState("action", e.target.value)} />
                </div>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Text",
        category: "React",
        inputs: [],
        outputs: [{ id: "out", name: "Text", template: (_, s) => s.text }],
        defaultState: { text: "Hello World" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <In value={state.text} onChange={(e) => setState("text", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Output check",
        category: "Meta",
        inputs: [{ id: "child", name: "Child" }],
        outputs: [],
        defaultState: { text: "Hello World" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => (
            <div>
                <In value={state.text} onChange={(e) => setState("text", e.target.value)} />
                <div style={{ marginTop: 8 }}>
                    <L text="Raw input template" />
                    <pre style={{ background: "#f3f4f6", padding: 6, borderRadius: 6, fontSize: 11 }}>
                        {JSON.stringify(getInputTemplate?.("child"), null, 2)}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        name: "ExecuteOnClick",
        category: "IO",
        inputs: [{ id: "expr", name: "Expression" }],
        outputs: [{ id: "out", name: "Result", template: (i) => i.expr ?? null }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => {
            const [result, setResult] = useState<any>(undefined);
            const [error, setError] = useState<string | null>(null);
            const [busy, setBusy] = useState(false);

            const run = async () => {
                const tpl = getTemplate("out");
                setBusy(true);
                setError(null);
                try {
                    const r = await evaluateJSONLang(tpl);
                    setResult(r);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                } finally {
                    setBusy(false);
                }
            };

            return (
                <div style={{ minWidth: 200 }}>
                    <button
                        onClick={run}
                        disabled={busy}
                        style={{
                            width: "100%",
                            padding: "8px 0",
                            borderRadius: 6,
                            border: "none",
                            background: busy ? "#9ca3af" : "#6366f1",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: busy ? "not-allowed" : "pointer",
                            fontSize: 12,
                            letterSpacing: 0.5,
                        }}
                    >
                        {busy ? "Выполнение…" : "Запустить"}
                    </button>

                    {error && (
                        <div style={{
                            marginTop: 8, padding: 8, background: "#fef2f2",
                            borderRadius: 6, border: "1px solid #fecaca",
                            fontSize: 11, color: "#dc2626",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            wordBreak: "break-all", maxHeight: 100, overflow: "auto"
                        }}>
                            {error}
                        </div>
                    )}

                    {result !== undefined && !error && (
                        <div style={{
                            marginTop: 8, padding: 8, background: "#ecfdf5",
                            borderRadius: 6, border: "1px solid #a7f3d0",
                            fontSize: 11, color: "#059669",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            wordBreak: "break-all", maxHeight: 120, overflow: "auto"
                        }}>
                            {JSON.stringify(result)}
                        </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                        <L text="Raw AST" />
                        <pre style={{
                            margin: 0, padding: 6, background: "#f9fafb",
                            borderRadius: 4, fontSize: 10, color: "#6b7280",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        }}>
                            {JSON.stringify(getTemplate("out"))}
                        </pre>
                    </div>
                </div>
            );
        },
    },
    {
        name: "JSONEditor",
        category: "Object",
        inputs: [{ id: "seed", name: "Seed" }],
        outputs: [{ id: "out", name: "Object", template: (i, s) => ["json_parse", s.json] }],
        defaultState: { json: "{\n  \"name\": \"example\",\n  \"value\": 42\n}" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
        ),
        visual: ({ state, setState }) => {
            const valid = useMemo(() => {
                try { JSON.parse(state.json); return true; } catch { return false; }
            }, [state.json]);

            return (
                <div style={{ width: 280 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
                            JSON
                        </span>
                        <span style={{ fontSize: 10, color: valid ? "#059669" : "#dc2626", fontWeight: 700 }}>
                            {valid ? "Валиден" : "Ошибка"}
                        </span>
                    </div>
                    <textarea
                        value={state.json}
                        onChange={(e) => setState("json", e.target.value)}
                        spellCheck={false}
                        style={{
                            width: "100%",
                            minHeight: 160,
                            maxHeight: 320,
                            maxWidth: 230,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11,
                            lineHeight: 1.5,
                            padding: 10,
                            border: `2px solid ${valid ? "#e5e7eb" : "#fca5a5"}`,
                            borderRadius: 6,
                            outline: "none",
                            resize: "vertical",
                            color: "#111827",
                            background: "#ffffff",
                            boxSizing: "border-box",
                        }}
                    />
                </div>
            );
        },
    },
    {
        name: "HttpAdvanced",
        category: "API",
        inputs: [
            { id: "body", name: "Body" },
            { id: "query", name: "Query" },
            { id: "headers", name: "Headers" },
        ],
        outputs: [{
            id: "out",
            name: "Response",
            template: (i, s) => [
                "fetch_advanced",
                ["if",
                    ["gt", ["length", i.query ?? {}], 0],
                    ["concat", s.baseUrl, s.path, "?", ["build_query", i.query ?? {}]],
                    ["concat", s.baseUrl, s.path]
                ],
                ["merge",
                    ["object", "method", s.method],
                    ["if", ["gt", ["length", i.headers ?? {}], 0], ["object", "headers", i.headers], ["object"]],
                    ["if", ["is", s.method, "GET"], ["object"], ["object", "body", ["json_stringify", i.body ?? null]]]
                ]
            ]
        }],
        defaultState: { method: "GET", baseUrl: "https://jsonplaceholder.typicode.com", path: "/posts/1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ minWidth: 240 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <Sel style={{ flex: 1 }} value={state.method} onChange={(e) => setState("method", e.target.value)}>
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                        <option>PATCH</option>
                    </Sel>
                </div>
                <In value={state.baseUrl} onChange={(e) => setState("baseUrl", e.target.value)} placeholder="https://api.example.com" style={{ marginBottom: 4 }} />
                <In value={state.path} onChange={(e) => setState("path", e.target.value)} placeholder="/v1/resource" />
                <div style={{ marginTop: 8 }}>
                    <L text="Request AST" />
                    <pre style={{
                        margin: 0, padding: 8, background: "#1f2937", color: "#e5e7eb",
                        borderRadius: 6, fontSize: 10,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        overflow: "auto", maxHeight: 140, whiteSpace: "pre-wrap", wordBreak: "break-all"
                    }}>
                        {JSON.stringify(getTemplate("out"), null, 2)}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        name: "Headers",
        category: "API",
        inputs: [
            { id: "v1", name: "Val 1" },
            { id: "v2", name: "Val 2" },
        ],
        outputs: [{ id: "out", name: "Headers", template: (i, s) => ["object", s.k1, i.v1, s.k2, i.v2] }],
        defaultState: { k1: "Content-Type", k2: "Authorization" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <In style={{ flex: 1 }} value={state.k1} onChange={(e) => setState("k1", e.target.value)} placeholder="Key" />
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>← input 1</span>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <In style={{ flex: 1 }} value={state.k2} onChange={(e) => setState("k2", e.target.value)} placeholder="Key" />
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>← input 2</span>
                </div>
            </div>
        ),
    },
    {
        name: "Note",
        category: "Meta",
        inputs: [],
        outputs: [],
        defaultState: { text: "Заметка…", color: "#fef3c7" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M21 5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z" />
                <path d="M18 8v.5" />
            </svg>
        ),
        visual: ({ state, setState }) => {
            const [edit, setEdit] = useState(false);
            return (
                <div
                    onDoubleClick={() => setEdit(true)}
                    style={{
                        background: state.color,
                        padding: 14,
                        borderRadius: 4,
                        minWidth: 200,
                        maxWidth: 280,
                        minHeight: 120,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                        cursor: "text",
                    }}
                >
                    {edit ? (
                        <textarea
                            autoFocus
                            value={state.text}
                            onChange={(e) => setState("text", e.target.value)}
                            onBlur={() => setEdit(false)}
                            style={{
                                width: "100%", minHeight: 90, background: "transparent",
                                border: "none", resize: "none", fontFamily: "inherit",
                                fontSize: 13, color: "#78350f", outline: "none",
                                lineHeight: 1.5,
                            }}
                        />
                    ) : (
                        <div style={{ fontSize: 13, color: "#78350f", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {state.text}
                        </div>
                    )}
                    <div style={{ marginTop: 10, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        {["#fef3c7", "#dbeafe", "#fce7f3", "#d1fae5", "#fee2e2", "#f3f4f6"].map((c) => (
                            <button
                                key={c}
                                onClick={() => setState("color", c)}
                                style={{
                                    width: 16, height: 16, borderRadius: 4,
                                    border: state.color === c ? "2px solid #374151" : "1px solid transparent",
                                    background: c, cursor: "pointer", padding: 0,
                                }}
                            />
                        ))}
                    </div>
                </div>
            );
        },
    },
    {
        name: "ResponseDebug",
        category: "API",
        inputs: [{ id: "res", name: "Response" }],
        outputs: [
            { id: "status", name: "Status", template: (i) => ["get_path", i.res ?? {}, "status"] },
            { id: "ok", name: "OK", template: (i) => ["get_path", i.res ?? {}, "ok"] },
            { id: "data", name: "Data", template: (i) => ["get_path", i.res ?? {}, "data"] },
            { id: "text", name: "Text", template: (i) => ["get_path", i.res ?? {}, "text"] },
            { id: "headers", name: "Headers", template: (i) => ["get_path", i.res ?? {}, "headers"] },
        ],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div style={{ minWidth: 180 }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                    Inspector
                </div>
                {["status", "ok", "data", "text", "headers"].map((k) => (
                    <div key={k} style={{ marginBottom: 3, fontSize: 10, color: "#374151", fontFamily: "monospace" }}>
                        <span style={{ color: "#9ca3af" }}>{k}:</span> {JSON.stringify(getTemplate(k as any))}
                    </div>
                ))}
            </div>
        ),
    },
    {
        name: "AutoUI",
        category: "UI",
        inputs: [{ id: "data", name: "Data" }],
        outputs: [
            {
                id: "out",
                name: "Data",
                template: (_, s) => s.editedData ?? null,
            },
        ],
        defaultState: {
            editedData: null,
            theme: "light",
            maxDepth: 5,
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => {
            const inputData = getTemplate("data");
            const [copied, setCopied] = useState(false);

            // Инициализация editedData при первом рендере
            useEffect(() => {
                if (state.editedData === null && inputData !== undefined) {
                    setState("editedData", deepClone(inputData));
                }
            }, [inputData]);

            // Глубокое клонирование данных
            const deepClone = (obj: any): any => {
                if (obj === null || typeof obj !== "object") return obj;
                if (Array.isArray(obj)) return obj.map(deepClone);
                const cloned: Record<string, any> = {};
                for (const key in obj) {
                    cloned[key] = deepClone(obj[key]);
                }
                return cloned;
            };

            // Копирование в буфер обмена
            const copyToClipboard = async () => {
                try {
                    await navigator.clipboard.writeText(
                        JSON.stringify(state.editedData, null, 2)
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch (e) {
                    console.error("Failed to copy:", e);
                }
            };

            // Обработчик изменения значения
            const handleChange = (path: string[], newValue: any) => {
                const newData = deepClone(state.editedData);
                let current = newData;
                for (let i = 0; i < path.length - 1; i++) {
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = newValue;
                setState("editedData", newData);
            };

            // Рендер значения в зависимости от типа
            const renderValue = (
                value: any,
                path: string[] = [],
                depth = 0
            ): React.ReactNode => {
                if (depth > state.maxDepth) {
                    return (
                        <span style={{ color: "#9ca3af", fontSize: 11 }}>
                            ... (max depth reached)
                        </span>
                    );
                }

                if (value === null) {
                    return (
                        <span style={{ color: "#6b7280", fontSize: 12 }}>null</span>
                    );
                }

                if (typeof value === "boolean") {
                    return (
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) =>
                                handleChange(path, e.target.checked)
                            }
                            style={{ marginRight: 4 }}
                        />
                    );
                }

                if (typeof value === "number") {
                    return (
                        <In
                            type="number"
                            value={value}
                            onChange={(e) =>
                                handleChange(path, Number(e.target.value))
                            }
                            style={{ width: "100%", fontSize: 12 }}
                        />
                    );
                }

                if (typeof value === "string") {
                    // Проверяем, является ли строка URL изображением
                    if (isImageUrl(value)) {
                        return (
                            <div style={{ margin: "8px 0" }}>
                                <img
                                    src={value}
                                    alt="Preview"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: 150,
                                        borderRadius: 4,
                                        border: "1px solid #e5e7eb",
                                    }}
                                />
                                <In
                                    value={value}
                                    onChange={(e) =>
                                        handleChange(path, e.target.value)
                                    }
                                    style={{ marginTop: 4, fontSize: 11 }}
                                />
                            </div>
                        );
                    }
                    return (
                        <In
                            value={value}
                            onChange={(e) => handleChange(path, e.target.value)}
                            style={{ width: "100%", fontSize: 12 }}
                        />
                    );
                }

                if (Array.isArray(value)) {
                    if (value.length === 0) {
                        return (
                            <span style={{ color: "#6b7280", fontSize: 12 }}>
                                []
                            </span>
                        );
                    }
                    return (
                        <div
                            style={{
                                borderLeft: "2px solid #e5e7eb",
                                paddingLeft: 12,
                                marginLeft: 4,
                            }}
                        >
                            {value.map((item, index) => (
                                <div
                                    key={index}
                                    style={{ marginTop: 4, marginBottom: 4 }}
                                >
                                    <span
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 11,
                                            marginRight: 6,
                                        }}
                                    >
                                        [{index}]
                                    </span>
                                    {renderValue(item, [...path, String(index)], depth + 1)}
                                </div>
                            ))}
                        </div>
                    );
                }

                if (typeof value === "object") {
                    const entries = Object.entries(value);
                    if (entries.length === 0) {
                        return (
                            <span style={{ color: "#6b7280", fontSize: 12 }}>

                            </span>
                        );
                    }
                    return (
                        <div
                            style={{
                                borderLeft: "2px solid #e5e7eb",
                                paddingLeft: 12,
                                marginLeft: 4,
                            }}
                        >
                            {entries.map(([key, val]) => (
                                <div
                                    key={key}
                                    style={{ marginTop: 4, marginBottom: 4 }}
                                >
                                    <span
                                        style={{
                                            color: "#059669",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            marginRight: 6,
                                        }}
                                    >
                                        {key}:
                                    </span>
                                    {renderValue(
                                        val,
                                        [...path, key],
                                        depth + 1
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }

                return <span>{String(value)}</span>;
            };

            // Проверка, является ли строка URL изображением
            const isImageUrl = (str: string): boolean => {
                return str.startsWith("http") && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(str);
            };

            // Цвета для тем
            const bgColor = state.theme === "light" ? "#ffffff" : "#1e293b";
            const textColor = state.theme === "light" ? "#111827" : "#e2e8f0";
            const borderColor = state.theme === "light" ? "#e5e7eb" : "#334155";
            const inputBg = state.theme === "light" ? "#ffffff" : "#0f172a";

            return (
                <div
                    style={{
                        minWidth: 240,
                        maxWidth: 320,
                        background: bgColor,
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        padding: 8,
                    }}
                >
                    {/* Заголовок с кнопкой копирования */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 10,
                                color: "#6b7280",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            Auto UI
                        </span>
                        <button
                            onClick={copyToClipboard}
                            title="Copy to clipboard"
                            style={{
                                padding: "2px 6px",
                                fontSize: 10,
                                borderRadius: 4,
                                border: `1px solid ${borderColor}`,
                                background: copied ? "#d1fae5" : inputBg,
                                color: copied ? "#059669" : textColor,
                                cursor: "pointer",
                            }}
                        >
                            {copied ? "✓ Copied!" : "Copy"}
                        </button>
                    </div>

                    {/* Область отображения данных */}
                    <div
                        style={{
                            maxHeight: 300,
                            overflow: "auto",
                            fontSize: 12,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            lineHeight: 1.5,
                        }}
                    >
                        {state.editedData === null ? (
                            <span style={{ color: "#9ca3af" }}>No data</span>
                        ) : (
                            renderValue(state.editedData, [], 0)
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        name: "JSONPicker",
        category: "API",
        inputs: [{ id: "data", name: "JSON" }],
        outputs: [
            {
                id: "out",
                name: "Selected",
                template: (i, s) => {
                    const parts = s.selectedPath
                        ? s.selectedPath.split(".").filter(Boolean)
                        : [];
                    return ["get_path", i.data ?? null, ...parts];
                },
            },
        ],
        defaultState: { selectedPath: "" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate, getTemplate }) => {
            const [jsonData, setJsonData] = useState<any>(undefined);
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState<string | null>(null);
            const [expanded, setExpanded] = useState<string[]>([]);

            // Evaluate the input template when the button is clicked
            const fetchData = async () => {
                const inputTpl = getInputTemplate?.("data");
                if (inputTpl === undefined) return;
                setLoading(true);
                setError(null);
                try {
                    const data = await evaluateJSONLang(inputTpl);
                    setJsonData(data);
                    setExpanded([""]); // auto‑expand root
                } catch (e: any) {
                    setError(e.message ?? String(e));
                } finally {
                    setLoading(false);
                }
            };

            const toggle = (path: string) => {
                setExpanded((prev) =>
                    prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
                );
            };

            const select = (path: string) => {
                setState("selectedPath", path);
            };

            // Recursive tree view component
            const TreeNode: React.FC<{
                data: any;
                pathSegments: string[];
                depth: number;
            }> = ({ data, pathSegments, depth }) => {
                const fullPath = pathSegments.join(".");
                const isExpanded = expanded.includes(fullPath);
                const isSelected = state.selectedPath === fullPath;

                if (data === null || data === undefined) {
                    return (
                        <div
                            onClick={() => select(fullPath)}
                            style={{
                                paddingLeft: depth * 16,
                                cursor: "pointer",
                                color: isSelected ? "#6366f1" : "#6b7280",
                                fontWeight: isSelected ? 700 : 400,
                                fontSize: 11,
                            }}
                        >
                            {String(data)}
                        </div>
                    );
                }

                if (Array.isArray(data)) {
                    return (
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    paddingLeft: depth * 16,
                                    cursor: "pointer",
                                    color: isSelected ? "#6366f1" : "#111827",
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: 12,
                                }}
                                onClick={() => select(fullPath)}
                            >
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggle(fullPath);
                                    }}
                                    style={{
                                        marginRight: 4,
                                        fontSize: 10,
                                        lineHeight: 1,
                                        display: "inline-block",
                                        width: 12,
                                        color: "#6b7280",
                                        userSelect: "none",
                                    }}
                                >
                                    {isExpanded ? "▼" : "▶"}
                                </span>
                                <span>[{data.length}]</span>
                                <span style={{ color: "#6b7280", marginLeft: 4 }}>Array</span>
                            </div>
                            {isExpanded &&
                                data.map((item, idx) => (
                                    <TreeNode
                                        key={idx}
                                        data={item}
                                        pathSegments={[...pathSegments, String(idx)]}
                                        depth={depth + 1}
                                    />
                                ))}
                        </div>
                    );
                }

                if (typeof data === "object") {
                    const entries = Object.entries(data);
                    return (
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    paddingLeft: depth * 16,
                                    cursor: "pointer",
                                    color: isSelected ? "#6366f1" : "#111827",
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: 12,
                                }}
                                onClick={() => select(fullPath)}
                            >
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggle(fullPath);
                                    }}
                                    style={{
                                        marginRight: 4,
                                        fontSize: 10,
                                        lineHeight: 1,
                                        display: "inline-block",
                                        width: 12,
                                        color: "#6b7280",
                                        userSelect: "none",
                                    }}
                                >
                                    {isExpanded ? "▼" : "▶"}
                                </span>
                                <span>{`{${entries.length}}`}</span>
                                <span style={{ color: "#6b7280", marginLeft: 4 }}>Object</span>
                            </div>
                            {isExpanded &&
                                entries.map(([key, val]) => (
                                    <div key={key}>
                                        <div
                                            style={{
                                                paddingLeft: (depth + 1) * 16,
                                                display: "flex",
                                                alignItems: "center",
                                                cursor: "pointer",
                                                color:
                                                    state.selectedPath ===
                                                        [...pathSegments, key].join(".")
                                                        ? "#6366f1"
                                                        : "#374151",
                                                fontWeight:
                                                    state.selectedPath ===
                                                        [...pathSegments, key].join(".")
                                                        ? 700
                                                        : 400,
                                                fontSize: 11,
                                            }}
                                            onClick={() =>
                                                select([...pathSegments, key].join("."))
                                            }
                                        >
                                            <span
                                                style={{
                                                    color: "#059669",
                                                    marginRight: 6,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {key}:
                                            </span>
                                            {typeof val !== "object" || val === null ? (
                                                <span
                                                    style={{
                                                        color: "#6b7280",
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    {JSON.stringify(val)}
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        color: "#9ca3af",
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    {Array.isArray(val)
                                                        ? `Array(${val.length})`
                                                        : `Object(${Object.keys(val).length})`}
                                                </span>
                                            )}
                                        </div>
                                        {(typeof val === "object" && val !== null) && (
                                            <TreeNode
                                                data={val}
                                                pathSegments={[...pathSegments, key]}
                                                depth={depth + 1}
                                            />
                                        )}
                                    </div>
                                ))}
                        </div>
                    );
                }

                // primitive
                return (
                    <div
                        onClick={() => select(fullPath)}
                        style={{
                            paddingLeft: depth * 16,
                            cursor: "pointer",
                            color: isSelected ? "#6366f1" : "#111827",
                            fontWeight: isSelected ? 700 : 400,
                            fontSize: 12,
                        }}
                    >
                        {String(data)}
                    </div>
                );
            };

            // Format the path for display
            const displayPath = state.selectedPath
                ? `/${state.selectedPath.replace(/\./g, '/')}`
                : '/';

            return (
                <div style={{ minWidth: 220, maxWidth: 340 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: "#6b7280",
                            marginBottom: 6,
                        }}
                    >
                        JSON Picker
                    </div>

                    {/* Evaluate button */}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "6px 0",
                            borderRadius: 6,
                            border: "none",
                            background: loading ? "#9ca3af" : "#6366f1",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: loading ? "not-allowed" : "pointer",
                            marginBottom: 8,
                        }}
                    >
                        {loading ? "Fetching…" : "Fetch Data"}
                    </button>

                    {/* Error display */}
                    {error && (
                        <div
                            style={{
                                padding: 6,
                                background: "#fef2f2",
                                borderRadius: 4,
                                color: "#dc2626",
                                fontSize: 11,
                                marginBottom: 6,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Tree view (only after data is fetched) */}
                    {jsonData !== undefined && (
                        <>
                            <div
                                style={{
                                    maxHeight: 320,
                                    overflowY: "auto",
                                    fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    lineHeight: 1.5,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                    padding: "6px 4px",
                                    background: "#f9fafb",
                                }}
                            >
                                <TreeNode data={jsonData} pathSegments={[]} depth={0} />
                            </div>
                            <div
                                style={{
                                    marginTop: 8,
                                    padding: 6,
                                    background: "#f3f4f6",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    color: "#374151",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span style={{ fontWeight: 600, color: "#4b5563" }}>
                                    Path: {displayPath}
                                </span>
                                <span
                                    style={{
                                        color: "#6b7280",
                                        fontFamily: "monospace",
                                        maxWidth: 140,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                    title={JSON.stringify(getTemplate("out"))}
                                >
                                    {JSON.stringify(getTemplate("out"))}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            );
        },
    },
    {
        name: "Conditional",
        category: "Logic",
        inputs: [
            { id: "source", name: "Source" },
            { id: "trueCase", name: "True Case" },
            { id: "falseCase", name: "False Case" },
        ],
        outputs: [
            {
                id: "out",
                name: "Result",
                template: (i, s) => {
                    const pathParts = s.path
                        ? s.path.split(".").filter(Boolean)
                        : [];
                    const extracted = [
                        "get_path",
                        i.source ?? null,
                        ...pathParts,
                    ];
                    const condition = [s.op, extracted, s.compareValue];
                    return ["if", condition, i.trueCase ?? null, i.falseCase ?? null];
                },
            },
        ],
        defaultState: { path: "status", op: "is", compareValue: "200" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9 3 12l3 3" />
                <path d="M18 9l3 3-3 3" />
                <line x1="9" x2="15" y1="15" y2="9" />
                <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => {
            const displayPath = state.path ? `/${state.path.replace(/\./g, '/')}` : '/';

            return (
                <div style={{ minWidth: 220, maxWidth: 340 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: "#6b7280",
                            marginBottom: 8,
                        }}
                    >
                        Conditional
                    </div>

                    {/* Path to value inside source */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Path (dot notation)" />
                        <In
                            value={state.path}
                            onChange={(e) => setState("path", e.target.value)}
                            placeholder="e.g. status"
                        />
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                            {displayPath}
                        </div>
                    </div>

                    {/* Operator & comparison value */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                            <L text="Operator" />
                            <Sel
                                value={state.op}
                                onChange={(e) => setState("op", e.target.value)}
                            >
                                <option value="is">is (==)</option>
                                <option value="gt">gt (&gt;)</option>
                                <option value="lt">lt (&lt;)</option>
                            </Sel>
                        </div>
                        <div style={{ flex: 1 }}>
                            <L text="Compare to" />
                            <In
                                value={state.compareValue}
                                onChange={(e) => setState("compareValue", e.target.value)}
                                placeholder="200"
                            />
                        </div>
                    </div>

                    {/* Condition AST preview */}
                    <div
                        style={{
                            padding: 6,
                            background: "#f3f4f6",
                            borderRadius: 4,
                            fontSize: 10,
                            color: "#374151",
                            marginBottom: 8,
                            fontFamily: "monospace",
                        }}
                    >
                        <span style={{ color: "#6b7280" }}>
                            Condition AST:
                        </span>{" "}
                        {JSON.stringify(
                            (() => {
                                const pathParts = state.path
                                    ? state.path.split(".").filter(Boolean)
                                    : [];
                                const extracted = [
                                    "get_path",
                                    "<source>",
                                    ...pathParts,
                                ];
                                return [state.op, extracted, state.compareValue];
                            })()
                        )}
                    </div>

                    {/* Overall output template */}
                    <div>
                        <L text="Output AST" />
                        <pre
                            style={{
                                margin: 0,
                                padding: 6,
                                background: "#f9fafb",
                                borderRadius: 4,
                                fontSize: 10,
                                color: "#6b7280",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {JSON.stringify(getTemplate("out"))}
                        </pre>
                    </div>
                </div>
            );
        },
    },
    /* -------- ColorPreview Node -------- */
    {
        name: "ColorPreview",
        category: "UI",
        inputs: [{ id: "expr", name: "Expression" }],
        outputs: [{ id: "out", name: "Color", template: (i) => i.expr ?? "#000000" }],
        defaultState: { header: "", pollInterval: "none", lastColor: "#000000" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            const [error, setError] = useState<string | null>(null);
            const intervalRef = useRef<any>(null);

            const evaluateColor = async () => {
                const tpl = getInputTemplate?.("expr");
                if (!tpl) return;
                try {
                    const result = await evaluateJSONLang(tpl);
                    // Accept string or array[0] as color
                    const color = typeof result === "string" ? result : String(result);
                    setState("lastColor", color);
                    setError(null);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                }
            };

            // Polling setup
            useEffect(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (state.pollInterval !== "none") {
                    intervalRef.current = setInterval(evaluateColor, Number(state.pollInterval));
                    // Run once immediately
                    evaluateColor();
                }
                return () => clearInterval(intervalRef.current);
            }, [state.pollInterval, getInputTemplate?.("expr")]);

            return (
                <div style={{ minWidth: 180, maxWidth: 240 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Color name…"
                        style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                    />
                    {/* Polling selector */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <L text="Poll" />
                        <Sel
                            value={state.pollInterval}
                            onChange={(e) => setState("pollInterval", e.target.value)}
                        >
                            <option value="none">Off</option>
                            <option value="1000">1s</option>
                            <option value="3000">3s</option>
                            <option value="5000">5s</option>
                        </Sel>
                    </div>
                    {/* Manual evaluate button */}
                    <button
                        onClick={evaluateColor}
                        style={{
                            width: "100%", padding: "4px 0", borderRadius: 4,
                            border: "none", background: "#6366f1", color: "#fff",
                            fontWeight: 600, fontSize: 11, cursor: "pointer",
                            marginBottom: 6,
                        }}
                    >
                        Evaluate
                    </button>
                    {/* Error display */}
                    {error && (
                        <div style={{ padding: 4, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 10, marginBottom: 6 }}>
                            {error}
                        </div>
                    )}
                    {/* Color square with checkerboard */}
                    <div style={{ position: "relative", width: "100%", paddingBottom: "100%", marginTop: 4 }}>
                        {/* Checkerboard background */}
                        <div style={{
                            position: "absolute", inset: 0,
                            backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "10px 10px",
                            backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                            borderRadius: 6,
                        }} />
                        {/* Color overlay */}
                        <div style={{
                            position: "absolute", inset: 0,
                            backgroundColor: state.lastColor,
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                        }} />
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, textAlign: "center", color: "#6b7280", fontFamily: "monospace" }}>
                        {state.lastColor}
                    </div>
                </div>
            );
        },
    },

    /* -------- TimeSeriesGraph Node -------- */
    {
        name: "TimeSeriesGraph",
        category: "UI",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Number", template: (i) => ["to_number", i.value] }],
        defaultState: { header: "", pollInterval: "1000", storageKey: "" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 20 7 13 11 18 15 6 19 12 23 2" />
                <line x1="1" y1="20" x2="23" y2="20" />
                <line x1="1" y1="2" x2="1" y2="20" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            const [points, setPoints] = useState<{ t: number; v: number }[]>([]);
            const [error, setError] = useState<string | null>(null);
            const intervalRef = useRef<any>(null);
            const containerRef = useRef<HTMLDivElement>(null);
            const MAX_POINTS = 200;

            // Generate unique storageKey once
            useEffect(() => {
                if (!state.storageKey) {
                    setState("storageKey", `ts_${Math.random().toString(36).slice(2, 9)}`);
                }
            }, []);

            // Load existing points from localStorage
            useEffect(() => {
                if (!state.storageKey) return;
                const stored = localStorage.getItem(state.storageKey);
                if (stored) {
                    try {
                        setPoints(JSON.parse(stored));
                    } catch { }
                }
            }, [state.storageKey]);

            // Save points to localStorage whenever they change
            useEffect(() => {
                if (!state.storageKey) return;
                localStorage.setItem(state.storageKey, JSON.stringify(points));
            }, [points, state.storageKey]);

            const evaluateAndAdd = async () => {
                const tpl = getInputTemplate?.("value");
                if (!tpl) return;
                try {
                    const raw = await evaluateJSONLang(tpl);
                    const num = Number(raw);
                    const value = isNaN(num) ? 0 : num;
                    setPoints((prev) => {
                        const next = [...prev, { t: Date.now(), v: value }];
                        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
                    });
                    setError(null);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                }
            };

            // Polling
            useEffect(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (state.pollInterval !== "none") {
                    // Run immediately
                    evaluateAndAdd();
                    intervalRef.current = setInterval(evaluateAndAdd, Number(state.pollInterval));
                }
                return () => clearInterval(intervalRef.current);
            }, [state.pollInterval, getInputTemplate?.("value")]);

            // SVG rendering
            const minV = points.length ? Math.min(...points.map((p) => p.v)) : 0;
            const maxV = points.length ? Math.max(...points.map((p) => p.v)) : 1;
            const rangeV = maxV - minV || 1;
            const tMin = points.length ? points[0].t : 0;
            const tMax = points.length ? points[points.length - 1].t : 0;
            const tRange = tMax - tMin || 1;
            const width = Math.max(200, points.length * 2); // 2px per point, min 200
            const height = 80;
            const padding = 2;

            const polylinePoints = points
                .map((p) => {
                    const x = ((p.t - tMin) / tRange) * (width - 2 * padding) + padding;
                    const y = height - padding - ((p.v - minV) / rangeV) * (height - 2 * padding);
                    return `${x},${y}`;
                })
                .join(" ");

            return (
                <div style={{ minWidth: 220, maxWidth: 360 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Graph title…"
                        style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                    />
                    {/* Poll selector */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <L text="Poll" />
                        <Sel
                            value={state.pollInterval}
                            onChange={(e) => setState("pollInterval", e.target.value)}
                        >
                            <option value="none">Off</option>
                            <option value="1000">1s</option>
                            <option value="3000">3s</option>
                            <option value="5000">5s</option>
                        </Sel>
                    </div>
                    {/* Error */}
                    {error && (
                        <div style={{ padding: 4, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 10, marginBottom: 4 }}>
                            {error}
                        </div>
                    )}
                    {/* Graph with horizontal scroll */}
                    <div
                        ref={containerRef}
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            background: "#f9fafb",
                            overflowX: "auto",
                            overflowY: "hidden",
                            height: height + 4,
                            marginTop: 4,
                        }}
                    >
                        <svg width={width} height={height} style={{ display: "block" }}>
                            {/* Grid lines (optional) */}
                            <line x1={0} y1={height - padding} x2={width} y2={height - padding} stroke="#d1d5db" strokeWidth={1} />
                            {polylinePoints && (
                                <polyline
                                    points={polylinePoints}
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                            )}
                            {/* Y axis min/max labels */}
                            <text x={padding} y={height - padding - 2} fontSize={8} fill="#6b7280">
                                {minV.toFixed(1)}
                            </text>
                            <text x={padding} y={padding + 6} fontSize={8} fill="#6b7280">
                                {maxV.toFixed(1)}
                            </text>
                        </svg>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
                        <span>Points: {points.length}</span>
                        <span>Latest: {points.length ? points[points.length - 1].v.toFixed(2) : "—"}</span>
                    </div>
                </div>
            );
        },
    },
    {
        name: "TryConditional",
        category: "Logic",
        inputs: [
            { id: "value", name: "Value" },           // expression that yields the value to compare
            { id: "trueCase", name: "True" },
            { id: "falseCase", name: "False" },
            { id: "errorCase", name: "Error" },
        ],
        outputs: [
            {
                id: "out",
                name: "Result",
                template: (i, s) => [
                    "try_compare",
                    i.value,           // the raw expression (could be a number, string, or another node’s output)
                    s.op,
                    s.compareValue,
                    i.trueCase ?? null,
                    i.falseCase ?? null,
                    i.errorCase ?? null,
                ],
            },
        ],
        defaultState: { header: "", op: "is", compareValue: "200" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9 3 12l3 3" />
                <path d="M18 9l3 3-3 3" />
                <line x1="9" x2="15" y1="15" y2="9" />
                <line x1="9" x2="15" y1="9" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate, getInputTemplate }) => {
            const [testResult, setTestResult] = useState<string | null>(null);
            const [busy, setBusy] = useState(false);

            const runTest = async () => {
                setBusy(true);
                setTestResult(null);
                try {
                    const tpl = getTemplate("out");
                    const result = await evaluateJSONLang(tpl);
                    setTestResult(JSON.stringify(result, null, 2));
                } catch (e: any) {
                    setTestResult(`Error: ${e.message ?? String(e)}`);
                } finally {
                    setBusy(false);
                }
            };

            const inputTpl = getInputTemplate?.("value");
            const inputPreview = useMemo(() => {
                try {
                    return JSON.stringify(inputTpl);
                } catch {
                    return String(inputTpl);
                }
            }, [inputTpl]);

            return (
                <div style={{ minWidth: 220, maxWidth: 340 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Condition name…"
                        style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                    />
                    {/* Value expression preview */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Value Expression" />
                        <div style={{
                            padding: 4, background: "#f3f4f6", borderRadius: 4,
                            fontSize: 10, fontFamily: "monospace", color: "#374151",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        }}>
                            {inputPreview}
                        </div>
                    </div>
                    {/* Operator & compare value */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                            <L text="Operator" />
                            <Sel
                                value={state.op}
                                onChange={(e) => setState("op", e.target.value)}
                            >
                                <option value="is">is (==)</option>
                                <option value="gt">gt (&gt;)</option>
                                <option value="lt">lt (&lt;)</option>
                            </Sel>
                        </div>
                        <div style={{ flex: 1 }}>
                            <L text="Compare to" />
                            <In
                                value={state.compareValue}
                                onChange={(e) => setState("compareValue", e.target.value)}
                                placeholder="200"
                            />
                        </div>
                    </div>
                    {/* Test button */}
                    <button
                        onClick={runTest}
                        disabled={busy}
                        style={{
                            width: "100%", padding: "6px 0", borderRadius: 6,
                            border: "none", background: busy ? "#9ca3af" : "#6366f1",
                            color: "#fff", fontWeight: 700, fontSize: 12,
                            cursor: busy ? "not-allowed" : "pointer", marginBottom: 8,
                        }}
                    >
                        {busy ? "Testing…" : "Test Condition"}
                    </button>
                    {testResult && (
                        <div style={{
                            padding: 6, background: "#f3f4f6", borderRadius: 4,
                            fontSize: 10, color: "#374151", fontFamily: "monospace",
                            whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 120, overflow: "auto"
                        }}>
                            Result: {testResult}
                        </div>
                    )}
                    {/* Output AST */}
                    <div>
                        <L text="Output AST" />
                        <pre style={{
                            margin: 0, padding: 6, background: "#f9fafb",
                            borderRadius: 4, fontSize: 10, color: "#6b7280",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        }}>
                            {JSON.stringify(getTemplate("out"))}
                        </pre>
                    </div>
                </div>
            );
        },
    },
    {
        name: "TimeSeriesGraphAdvanced 5",
        category: "UI",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Number", template: (i) => ["to_number", i.value] }],
        defaultState: {
            header: "",
            pollInterval: "1000",
            storageKey: "timeseries_default",
            maxPoints: 200,
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 20 7 13 11 18 15 6 19 12 23 2" />
                <line x1="1" y1="20" x2="23" y2="20" />
                <line x1="1" y1="2" x2="1" y2="20" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            // ── 1. Initialise from localStorage immediately ─────────────────────
            const [points, setPoints] = useState<{ t: number; v: number }[]>(() => {
                if (!state.storageKey) return [];
                const raw = localStorage.getItem(state.storageKey);
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            });

            const [error, setError] = useState<string | null>(null);
            const intervalRef = useRef<any>(null);
            const containerRef = useRef<HTMLDivElement>(null);
            const hasSaved = useRef(false);

            // ── 2. Auto-scroll to the end whenever points change ────────────────
            useEffect(() => {
                const el = containerRef.current;
                if (el) {
                    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                }
            }, [points]);

            // ── 3. When storageKey changes externally, load that array ─────────
            useEffect(() => {
                if (!state.storageKey) {
                    setPoints([]);
                    return;
                }
                const raw = localStorage.getItem(state.storageKey);
                if (!raw) {
                    setPoints([]);
                    return;
                }
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) setPoints(parsed);
                } catch {
                    setPoints([]);
                }
            }, [state.storageKey]);

            // ── 4. Save to localStorage only after real changes ────────────────
            useEffect(() => {
                if (!state.storageKey) return;
                if (!hasSaved.current) {
                    hasSaved.current = true;
                    return;
                }
                localStorage.setItem(state.storageKey, JSON.stringify(points));
            }, [points, state.storageKey]);

            // Evaluate expression, convert to number, push to array
            const captureValue = async () => {
                const tpl = getInputTemplate?.("value");
                if (!tpl) return;
                try {
                    const raw = await evaluateJSONLang(tpl);
                    const num = Number(raw);
                    const value = isNaN(num) ? 0 : num;
                    setPoints((prev) => {
                        const next = [...prev, { t: Date.now(), v: value }];
                        const limit = Math.min(state.maxPoints || 200, 1000);
                        return next.length > limit ? next.slice(next.length - limit) : next;
                    });
                    setError(null);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                }
            };

            // Polling setup
            useEffect(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (state.pollInterval !== "none") {
                    intervalRef.current = setInterval(captureValue, Number(state.pollInterval));
                }
                return () => clearInterval(intervalRef.current);
            }, [state.pollInterval, getInputTemplate?.("value")]);

            // Clear all data
            const clearHistory = () => {
                setPoints([]);
                if (state.storageKey) localStorage.removeItem(state.storageKey);
            };

            // ── Stats ──
            const stats = useMemo(() => {
                if (points.length === 0) return { min: 0, max: 0, avg: 0, latest: 0 };
                const values = points.map((p) => p.v);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const latest = values[values.length - 1];
                return { min, max, avg, latest };
            }, [points]);

            // ── SVG Chart ──
            const CHART_HEIGHT = 90;
            const PADDING = 2;

            const width = Math.max(200, points.length * 2);

            // Raw data bounds
            const dataMin = points.length ? Math.min(...points.map((p) => p.v)) : 0;
            const dataMax = points.length ? Math.max(...points.map((p) => p.v)) : 1;
            let dataRange = dataMax - dataMin;

            // ── Proper Y scaling ───────────────────────────────────────────────
            let yMin = dataMin;
            let yMax = dataMax;

            if (dataRange === 0) {
                // Flat line: create an artificial band so the line stays centred
                const band = Math.max(Math.abs(dataMin) * 0.001, 0.01); // 0.1 % or 0.01 min
                yMin = dataMin - band;
                yMax = dataMax + band;
            } else {
                // Normal range: add 5 % padding top & bottom so the line never hugs the edge
                const pad = dataRange * 0.05;
                yMin = dataMin - pad;
                yMax = dataMax + pad;
            }

            let yRange = yMax - yMin || 1;

            // Dynamic decimal places for labels (more digits when zoomed-in)
            const getDecimals = () => {
                if (yRange < 0.01) return 4;
                if (yRange < 0.1) return 3;
                if (yRange < 1) return 2;
                return 2;
            };
            const decimals = getDecimals();
            const fmt = (n: number) => n.toFixed(decimals);

            const tMin = points.length ? points[0].t : 0;
            const tMax = points.length ? points[points.length - 1].t : 1;
            const tRange = tMax - tMin || 1;

            const polylinePoints = points
                .map((p) => {
                    const x = ((p.t - tMin) / tRange) * (width - 2 * PADDING) + PADDING;
                    const y = CHART_HEIGHT - PADDING - ((p.v - yMin) / yRange) * (CHART_HEIGHT - 2 * PADDING);
                    return `${x},${y}`;
                })
                .join(" ");

            return (
                <div style={{ minWidth: 240, maxWidth: 380 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Graph title…"
                        style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                    />

                    {/* Storage key */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Storage Key" />
                        <In
                            value={state.storageKey}
                            onChange={(e) => setState("storageKey", e.target.value)}
                            placeholder="Unique key…"
                        />
                    </div>

                    {/* Poll interval */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <L text="Poll" />
                        <Sel
                            value={state.pollInterval}
                            onChange={(e) => setState("pollInterval", e.target.value)}
                        >
                            <option value="none">Off</option>
                            <option value="1000">1s</option>
                            <option value="3000">3s</option>
                            <option value="5000">5s</option>
                            <option value="10000">10s</option>
                        </Sel>
                    </div>

                    {/* Max points */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Max Points (≤ 1000)" />
                        <In
                            type="number"
                            value={state.maxPoints}
                            onChange={(e) => {
                                const v = Math.min(1000, Math.max(1, Number(e.target.value) || 200));
                                setState("maxPoints", v);
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <button
                            onClick={captureValue}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "none", background: "#6366f1", color: "#fff",
                                fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Add Point
                        </button>
                        <button
                            onClick={clearHistory}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "1px solid #e5e7eb", background: "#f9fafb",
                                color: "#374151", fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: 4, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 10, marginBottom: 6 }}>
                            {error}
                        </div>
                    )}

                    {/* Stats bar */}
                    <div style={{
                        display: "flex", gap: 4, fontSize: 10, color: "#6b7280", marginBottom: 4,
                        justifyContent: "space-between", fontFamily: "monospace"
                    }}>
                        <span>Min: {stats.min.toFixed(2)}</span>
                        <span>Max: {stats.max.toFixed(2)}</span>
                        <span>Avg: {stats.avg.toFixed(2)}</span>
                        <span>Last: {stats.latest.toFixed(2)}</span>
                    </div>

                    {/* Scrollable chart */}
                    <div
                        ref={containerRef}
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            background: "#ffffff",
                            overflowX: "auto",
                            overflowY: "hidden",
                            height: CHART_HEIGHT,
                        }}
                    >
                        <svg width={width} height={CHART_HEIGHT} style={{ display: "block" }}>
                            {/* Baseline */}
                            <line x1={0} y1={CHART_HEIGHT - PADDING} x2={width} y2={CHART_HEIGHT - PADDING} stroke="#e5e7eb" strokeWidth={1} />
                            {/* Polyline */}
                            {polylinePoints && (
                                <polyline
                                    points={polylinePoints}
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                            )}
                            {/* Y-axis labels (padded range) */}
                            <text x={PADDING} y={CHART_HEIGHT - PADDING - 2} fontSize={8} fill="#6b7280">
                                {fmt(yMin)}
                            </text>
                            <text x={PADDING} y={PADDING + 6} fontSize={8} fill="#6b7280">
                                {fmt(yMax)}
                            </text>
                        </svg>
                    </div>

                    {/* Point count */}
                    <div style={{ fontSize: 10, marginTop: 4, color: "#9ca3af", textAlign: "right" }}>
                        {points.length} point{points.length !== 1 ? "s" : ""}
                    </div>
                </div>
            );
        },
    },
    {
        name: "MarketPriceDisplay",
        category: "UI",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Number", template: (i) => ["to_number", i.value] }],
        defaultState: {
            header: "",
            pollInterval: "none",
            storageKey: "marketprice_default",
            precision: 2,
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <text x="2" y="18" fontSize="16" fontWeight="bold" fill="none" stroke="currentColor">$</text>
                <polyline points="14 6 17 9 20 6" />
                <polyline points="14 14 17 11 20 14" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            // pair = { prev: last value, curr: current value }
            const [pair, setPair] = useState<{ prev: number | null; curr: number | null }>(() => {
                if (!state.storageKey) return { prev: null, curr: null };
                const raw = localStorage.getItem(state.storageKey);
                if (!raw) return { prev: null, curr: null };
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.curr === "number") {
                        return { prev: parsed.prev ?? null, curr: parsed.curr };
                    }
                } catch { /* ignore */ }
                return { prev: null, curr: null };
            });

            const [error, setError] = useState<string | null>(null);
            const intervalRef = useRef<any>(null);
            const hasSaved = useRef(false);

            // Save pair to localStorage
            useEffect(() => {
                if (!state.storageKey) return;
                if (!hasSaved.current) {
                    hasSaved.current = true;
                    return;
                }
                localStorage.setItem(state.storageKey, JSON.stringify({ ...pair, t: Date.now() }));
            }, [pair, state.storageKey]);

            // Evaluate input and update pair
            const captureValue = async () => {
                const tpl = getInputTemplate?.("value");
                if (!tpl) return;
                try {
                    const raw = await evaluateJSONLang(tpl);
                    const num = Number(raw);
                    const value = isNaN(num) ? 0 : num;
                    setPair(({ curr: oldCurr }) => ({ prev: oldCurr, curr: value }));
                    setError(null);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                }
            };

            // Polling
            useEffect(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (state.pollInterval !== "none") {
                    intervalRef.current = setInterval(captureValue, Number(state.pollInterval));
                }
                return () => clearInterval(intervalRef.current);
            }, [state.pollInterval, getInputTemplate?.("value")]);

            const clearValue = () => {
                setPair({ prev: null, curr: null });
                if (state.storageKey) localStorage.removeItem(state.storageKey);
            };

            // Formatting
            const precision = Math.min(10, Math.max(0, Number(state.precision) || 2));
            const fmt = (n: number) => n.toFixed(precision);

            const { curr, prev } = pair;
            const change = curr !== null && prev !== null ? curr - prev : null;
            const pctChange = curr !== null && prev !== null && prev !== 0
                ? ((curr - prev) / Math.abs(prev)) * 100
                : null;

            const changeColor = change === null ? "#6b7280" : change > 0 ? "#16a34a" : change < 0 ? "#dc2626" : "#6b7280";
            const changeBg = change === null ? "#f1f5f9" : change > 0 ? "#dcfce7" : change < 0 ? "#fee2e2" : "#f1f5f9";
            const sign = change === null ? "" : change > 0 ? "+" : "";
            const arrow = change === null ? "" : change > 0 ? "▲" : change < 0 ? "▼" : "−";

            return (
                <div style={{ minWidth: 240, maxWidth: 320, fontFamily: "system-ui, sans-serif" }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Asset name…"
                        style={{ marginBottom: 8, fontSize: 12, fontWeight: 600 }}
                    />

                    {/* Storage key */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Storage Key" />
                        <In
                            value={state.storageKey}
                            onChange={(e) => setState("storageKey", e.target.value)}
                            placeholder="Unique key…"
                        />
                    </div>

                    {/* Poll interval */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                        <L text="Poll" />
                        <Sel
                            value={state.pollInterval}
                            onChange={(e) => setState("pollInterval", e.target.value)}
                        >
                            <option value="none">Off</option>
                            <option value="1000">1 s</option>
                            <option value="5000">5 s</option>
                            <option value="10000">10 s</option>
                            <option value="60000">1 m</option>
                        </Sel>
                    </div>

                    {/* Precision */}
                    <div style={{ marginBottom: 8 }}>
                        <L text="Decimals" />
                        <In
                            type="number"
                            value={state.precision}
                            onChange={(e) => {
                                const v = Math.min(10, Math.max(0, Number(e.target.value) || 2));
                                setState("precision", v);
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                        <button
                            onClick={captureValue}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "none", background: "#6366f1", color: "#fff",
                                fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Refresh
                        </button>
                        <button
                            onClick={clearValue}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "1px solid #e5e7eb", background: "#f9fafb",
                                color: "#374151", fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: 6, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 10, marginBottom: 8 }}>
                            {error}
                        </div>
                    )}

                    {/* ═════ HUGE PRICE DISPLAY ═════ */}
                    <div style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "20px 12px",
                        textAlign: "center",
                    }}>
                        {/* Main price */}
                        <div style={{
                            fontSize: 40,
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1,
                            letterSpacing: "-0.03em",
                            fontVariantNumeric: "tabular-nums",
                        }}>
                            {curr !== null ? fmt(curr) : "—"}
                        </div>

                        {/* Change row */}
                        <div style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                        }}>
                            {/* Absolute change */}
                            <span style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: changeColor,
                                background: changeBg,
                                padding: "3px 10px",
                                borderRadius: 14,
                                fontVariantNumeric: "tabular-nums",
                            }}>
                                {arrow} {change === null ? "—" : `${sign}${fmt(Math.abs(change))}`}
                            </span>

                            {/* Percent change */}
                            {pctChange !== null && (
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: changeColor,
                                    background: changeBg,
                                    padding: "3px 8px",
                                    borderRadius: 12,
                                    fontVariantNumeric: "tabular-nums",
                                }}>
                                    {sign}{pctChange.toFixed(2)} %
                                </span>
                            )}
                        </div>

                        {/* Previous value hint */}
                        {prev !== null && (
                            <div style={{
                                marginTop: 8,
                                fontSize: 10,
                                color: "#94a3b8",
                                fontVariantNumeric: "tabular-nums",
                            }}>
                                Prev: {fmt(prev)}
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        name: "History 2",
        category: "UI",
        inputs: [{ id: "value", name: "Value" }],
        outputs: [{ id: "out", name: "Pass", template: (i) => i.value }],
        defaultState: {
            header: "History",
            storageKey: "history_default",
            maxRows: 50,
            pollInterval: "none",
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            // ── 1. Load from localStorage on mount ──────────────────────────────
            const [rows, setRows] = useState(() => {
                if (!state.storageKey) return [];
                const raw = localStorage.getItem(state.storageKey);
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            });

            const [error, setError] = useState<string | null>(null);
            const [popupRow, setPopupRow] = useState<any>(null);
            const [showTable, setShowTable] = useState(false);
            const intervalRef = useRef<any>(null);
            const hasSaved = useRef(false);

            // ── 2. Save to localStorage on every real change ───────────────────
            useEffect(() => {
                if (!state.storageKey) return;
                if (!hasSaved.current) {
                    hasSaved.current = true;
                    return;
                }
                localStorage.setItem(state.storageKey, JSON.stringify(rows));
            }, [rows, state.storageKey]);

            // ── 3. Reload when storageKey is switched ────────────────────────────
            useEffect(() => {
                if (!state.storageKey) {
                    setRows([]);
                    return;
                }
                const raw = localStorage.getItem(state.storageKey);
                if (!raw) {
                    setRows([]);
                    return;
                }
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) setRows(parsed);
                } catch {
                    setRows([]);
                }
            }, [state.storageKey]);

            // ── Helpers ─────────────────────────────────────────────────────────
            const isPlainObject = (v: any) =>
                v !== null && typeof v === "object" && !Array.isArray(v);

            // Evaluate input and append row
            const captureValue = async () => {
                const tpl = getInputTemplate?.("value");
                if (!tpl) return;
                try {
                    let raw = await evaluateJSONLang(tpl);

                    // If the engine returned a JSON-string, try to parse it into an object
                    if (typeof raw === "string") {
                        try {
                            const parsed = JSON.parse(raw);
                            if (parsed !== null && typeof parsed === "object") raw = parsed;
                        } catch {
                            // leave as string
                        }
                    }

                    setRows((prev) => {
                        const next = [...prev, { t: Date.now(), v: raw }];
                        const limit = Math.min(state.maxRows || 50, 500);
                        return next.length > limit ? next.slice(next.length - limit) : next;
                    });
                    setError(null);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                }
            };

            // ── 4. Auto-execute polling ────────────────────────────────────────
            useEffect(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (state.pollInterval !== "none") {
                    intervalRef.current = setInterval(captureValue, Number(state.pollInterval));
                }
                return () => clearInterval(intervalRef.current);
            }, [state.pollInterval, getInputTemplate?.("value")]);

            const clearHistory = () => {
                setRows([]);
                if (state.storageKey) localStorage.removeItem(state.storageKey);
            };

            // ── Column discovery ────────────────────────────────────────────────
            const columns = useMemo(() => {
                const sample = rows.find((r) => isPlainObject(r.v));
                return sample ? Object.keys(sample.v) : ["Value"];
            }, [rows]);

            // ── Last value preview ──────────────────────────────────────────────
            const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

            // ── Render ────────────────────────────────────────────────────────
            return (
                <div style={{ minWidth: 220, maxWidth: 320 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Table title…"
                        style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}
                    />

                    {/* Storage key */}
                    <div style={{ marginBottom: 6 }}>
                        <L text="Storage Key" />
                        <In
                            value={state.storageKey}
                            onChange={(e) => setState("storageKey", e.target.value)}
                            placeholder="Unique key…"
                        />
                    </div>

                    {/* Poll interval */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <L text="Poll" />
                        <Sel
                            value={state.pollInterval}
                            onChange={(e) => setState("pollInterval", e.target.value)}
                        >
                            <option value="none">Off</option>
                            <option value="1000">1 s</option>
                            <option value="3000">3 s</option>
                            <option value="5000">5 s</option>
                            <option value="10000">10 s</option>
                            <option value="30000">30 s</option>
                            <option value="60000">1 m</option>
                        </Sel>
                    </div>

                    {/* Max rows */}
                    <div style={{ marginBottom: 8 }}>
                        <L text="Max Rows (≤ 500)" />
                        <In
                            type="number"
                            value={state.maxRows}
                            onChange={(e) => {
                                const v = Math.min(500, Math.max(1, Number(e.target.value) || 50));
                                setState("maxRows", v);
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <button
                            onClick={captureValue}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "none", background: "#6366f1", color: "#fff",
                                fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Add Row
                        </button>
                        <button
                            onClick={clearHistory}
                            style={{
                                flex: 1, padding: "6px 0", borderRadius: 6,
                                border: "1px solid #e5e7eb", background: "#f9fafb",
                                color: "#374151", fontWeight: 600, fontSize: 11, cursor: "pointer",
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: 4, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 10, marginBottom: 6 }}>
                            {error}
                        </div>
                    )}

                    {/* ═════ Compact summary bar (click to open table popup) ═════ */}
                    <div
                        onClick={() => setShowTable(true)}
                        style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: "10px 12px",
                            cursor: "pointer",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                                {rows.length} row{rows.length !== 1 ? "s" : ""}
                            </span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>Click to open →</span>
                        </div>
                        {lastRow && (
                            <div style={{ marginTop: 4, fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                Last: {isPlainObject(lastRow.v)
                                    ? Object.entries(lastRow.v).map(([k, v]) => `${k}: ${String(v)}`).join("  |  ")
                                    : String(lastRow.v)}
                            </div>
                        )}
                    </div>

                    {/* ═════ Full-screen table popup ═════ */}
                    {showTable && (
                        <div
                            onClick={() => setShowTable(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.5)",
                                zIndex: 9999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(3px)",
                                width: "300px"
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: "#fff",
                                    borderRadius: 12,
                                    padding: 20,
                                    maxWidth: 900,
                                    width: "92%",
                                    maxHeight: "85vh",
                                    display: "flex",
                                    flexDirection: "column",
                                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                                }}
                            >
                                {/* Popup header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                                        {state.header || "History"}
                                    </span>
                                    <button
                                        onClick={() => setShowTable(false)}
                                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8", lineHeight: 1 }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Scrollable table container */}
                                <div style={{ overflow: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
                                        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr style={{ background: "#f8fafc" }}>
                                                <th style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>#</th>
                                                <th style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>Time</th>
                                                {columns.map((col) => (
                                                    <th key={col} style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.length === 0 && (
                                                <tr>
                                                    <td colSpan={2 + columns.length} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                                                        No records yet
                                                    </td>
                                                </tr>
                                            )}
                                            {rows.map((row, idx) => (
                                                <tr
                                                    key={row.t + "-" + idx}
                                                    onClick={() => setPopupRow(row)}
                                                    style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                >
                                                    <td style={{ padding: "7px 10px", color: "#94a3b8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                                        {idx + 1}
                                                    </td>
                                                    <td style={{ padding: "7px 10px", color: "#64748b", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                                        {new Date(row.t).toLocaleTimeString()}
                                                    </td>
                                                    {isPlainObject(row.v) ? (
                                                        columns.map((col) => (
                                                            <td key={col} style={{ padding: "7px 10px", color: "#334155", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {String(row.v[col] ?? "")}
                                                            </td>
                                                        ))
                                                    ) : (
                                                        <td style={{ padding: "7px 10px", color: "#334155", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {String(row.v)}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                        {rows.length} row{rows.length !== 1 ? "s" : ""} stored
                                    </span>
                                    <button
                                        onClick={() => setShowTable(false)}
                                        style={{
                                            padding: "6px 16px", borderRadius: 6, border: "none",
                                            background: "#6366f1", color: "#fff", fontWeight: 600,
                                            fontSize: 12, cursor: "pointer",
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════ Absolute / Full-value row popup ═════ */}
                    {popupRow && (
                        <div
                            onClick={() => setPopupRow(null)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.45)",
                                zIndex: 10000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: "#fff",
                                    borderRadius: 10,
                                    padding: 20,
                                    maxWidth: 420,
                                    width: "90%",
                                    maxHeight: "80vh",
                                    overflow: "auto",
                                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Absolute Record</span>
                                    <button
                                        onClick={() => setPopupRow(null)}
                                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div style={{ marginBottom: 10, fontSize: 10, color: "#64748b" }}>
                                    {new Date(popupRow.t).toLocaleString()}
                                </div>

                                <pre style={{
                                    background: "#f8fafc",
                                    padding: 12,
                                    borderRadius: 6,
                                    fontSize: 11,
                                    overflow: "auto",
                                    margin: 0,
                                    border: "1px solid #e2e8f0",
                                    color: "#334155",
                                }}>
                                    {JSON.stringify(popupRow.v, null, 2)}
                                </pre>

                                <div style={{ marginTop: 12, textAlign: "right" }}>
                                    <button
                                        onClick={() => setPopupRow(null)}
                                        style={{
                                            padding: "6px 14px", borderRadius: 6, border: "none",
                                            background: "#6366f1", color: "#fff", fontWeight: 600,
                                            fontSize: 11, cursor: "pointer",
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        name: "HTMLPicker",
        category: "API",
        inputs: [{ id: "html", name: "HTML" }],
        outputs: [{ id: "out", name: "Value", template: (i, s) => ["html_query", i.html ?? "", s.selector, s.mode, s.attr] }],
        defaultState: { selector: "h1", mode: "text", attr: "href" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                <path d="M8 7h8" /><path d="M8 11h5" /><path d="M8 15h6" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ minWidth: 200 }}>
                <L text="CSS Selector" />
                <In value={state.selector} onChange={(e) => setState("selector", e.target.value)} placeholder="h1, .price, #title" />
                <div style={{ marginTop: 6 }}>
                    <L text="Extract" />
                    <Sel value={state.mode} onChange={(e) => setState("mode", e.target.value)}>
                        <option value="text">textContent</option>
                        <option value="html">innerHTML</option>
                        <option value="attr">Attribute</option>
                    </Sel>
                </div>
                {state.mode === "attr" && (
                    <div style={{ marginTop: 6 }}>
                        <L text="Attribute" />
                        <In value={state.attr} onChange={(e) => setState("attr", e.target.value)} placeholder="src, href, data-id" />
                    </div>
                )}
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },

    {
        name: "HTMLDisplay",
        category: "UI",
        inputs: [{ id: "html", name: "HTML" }],
        outputs: [{ id: "out", name: "Pass", template: (i) => i.html ?? "" }],
        defaultState: { header: "HTML Preview" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                <path d="M8 7h8" /><path d="M8 11h5" /><path d="M8 15h6" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            const [open, setOpen] = useState(false);
            const [html, setHtml] = useState<string>("");
            const [busy, setBusy] = useState(false);
            const [error, setError] = useState<string | null>(null);

            const run = async () => {
                const tpl = getInputTemplate?.("html");
                if (!tpl) {
                    setError("No input connected");
                    return;
                }
                setBusy(true);
                setError(null);
                try {
                    const result = await evaluateJSONLang(tpl);
                    setHtml(String(result ?? ""));
                    setOpen(true);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                } finally {
                    setBusy(false);
                }
            };

            return (
                <div style={{ minWidth: 200, maxWidth: 260 }}>
                    {/* Header */}
                    <In
                        value={state.header}
                        onChange={(e) => setState("header", e.target.value)}
                        placeholder="Title…"
                        style={{ marginBottom: 8, fontSize: 12, fontWeight: 600 }}
                    />

                    {/* Evaluate button */}
                    <button
                        onClick={run}
                        disabled={busy}
                        style={{
                            width: "100%",
                            padding: "8px 0",
                            borderRadius: 6,
                            border: "none",
                            background: busy ? "#9ca3af" : "#6366f1",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: busy ? "not-allowed" : "pointer",
                            letterSpacing: 0.5,
                        }}
                    >
                        {busy ? "Rendering…" : "Show HTML"}
                    </button>

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginTop: 8,
                            padding: 6,
                            background: "#fef2f2",
                            borderRadius: 4,
                            color: "#dc2626",
                            fontSize: 11,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            wordBreak: "break-all",
                        }}>
                            {error}
                        </div>
                    )}

                    {/* ═════ 500 × 300 px Modal ═════ */}
                    {open && (
                        <div
                            onClick={() => setOpen(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.55)",
                                zIndex: 9999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: 500,
                                    height: 300,
                                    background: "#ffffff",
                                    borderRadius: 10,
                                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Modal header */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 14px",
                                    borderBottom: "1px solid #e2e8f0",
                                    flexShrink: 0,
                                    background: "#f8fafc",
                                }}>
                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}>
                                        {state.header || "HTML Preview"}
                                    </span>
                                    <button
                                        onClick={() => setOpen(false)}
                                        style={{
                                            border: "none",
                                            background: "none",
                                            cursor: "pointer",
                                            fontSize: 20,
                                            color: "#94a3b8",
                                            lineHeight: 1,
                                            padding: 0,
                                            width: 24,
                                            height: 24,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* HTML content area */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflow: "auto",
                                        padding: 12,
                                        fontSize: 13,
                                        color: "#111827",
                                        lineHeight: 1.5,
                                    }}
                                    dangerouslySetInnerHTML={{ __html: html }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        name: "Sticker",
        category: "Meta",
        inputs: [],
        outputs: [],
        controlled: false,          // ← free-form
        defaultState: { text: "Sticker", color: "#fef3c7", textColor: "#78350f", fontSize: 14 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
        ),
        visual: ({ state, setState }) => {
            const [edit, setEdit] = useState(false);
            return (
                <div
                    onDoubleClick={() => setEdit(true)}
                    style={{
                        background: state.color,
                        color: state.textColor,
                        padding: "12px 16px",
                        borderRadius: 8,
                        fontSize: state.fontSize,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        minWidth: 120,
                        maxWidth: 320,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        cursor: "text",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {edit ? (
                        <textarea
                            autoFocus
                            value={state.text}
                            onChange={(e) => setState("text", e.target.value)}
                            onBlur={() => setEdit(false)}
                            style={{
                                width: "100%",
                                minHeight: 60,
                                background: "transparent",
                                border: "none",
                                resize: "none",
                                fontFamily: "inherit",
                                fontSize: "inherit",
                                color: "inherit",
                                outline: "none",
                                lineHeight: 1.4,
                            }}
                        />
                    ) : (
                        state.text
                    )}
                </div>
            );
        },
    },
    {
        name: "Header",
        category: "Meta",
        inputs: [],
        outputs: [],
        controlled: false,          // ← free-form
        defaultState: { text: "Section", level: 2, color: "#0f172a" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ state, setState }) => {
            const sizes: Record<number, number> = { 1: 28, 2: 22, 3: 18, 4: 15 };
            return (
                <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setState("text", e.currentTarget.textContent || "")}
                    style={{
                        fontSize: sizes[state.level] || 18,
                        fontWeight: 800,
                        color: state.color,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                        minWidth: 200,
                        padding: "4px 0",
                        outline: "none",
                        borderBottom: state.level === 1 ? "2px solid #e2e8f0" : "none",
                    }}
                >
                    {state.text}
                </div>
            );
        },
    },


    {
        name: "HTML Template Parser",
        category: "Template",
        inputs: [{ id: "data", name: "Array" }],
        outputs: [{ id: "out", name: "HTML", template: (_, s) => s.cachedHtml }],
        defaultState: {
            template: "<div>@[1]</div>",
            pollInterval: "none",
            cachedHtml: "",
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        ),
        width: 500,
        visual: ({ state, setState, getInputTemplate }: any) => {
            const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
            const [error, setError] = useState<string | null>(null);

            // Исправлены типы таймеров для браузера
            const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
            const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
            const textareaRef = useRef<HTMLTextAreaElement>(null);

            // Все изменяемые данные — в refs, чтобы не ломать useCallback
            const templateRef = useRef(state.template);
            const getInputRef = useRef(getInputTemplate);
            const cachedHtmlRef = useRef(state.cachedHtml);
            const processingRef = useRef<boolean>(false);

            // Синхронизация refs при каждом рендере
            templateRef.current = state.template;
            getInputRef.current = getInputTemplate;
            cachedHtmlRef.current = state.cachedHtml;

            // processTemplate теперь стабилен — не пересоздаётся между рендерами
            const processTemplate = useCallback(async () => {
                if (processingRef.current) return;
                processingRef.current = true;

                try {
                    const inputTpl = getInputRef.current?.("data");
                    if (!inputTpl) {
                        setError("No input connected");
                        if (cachedHtmlRef.current !== "") setState("cachedHtml", "");
                        return;
                    }

                    const arr = await evaluateJSONLang(inputTpl);
                    if (!Array.isArray(arr)) {
                        setError("Input is not an array");
                        if (cachedHtmlRef.current !== "") setState("cachedHtml", "");
                        return;
                    }

                    const html = templateRef.current.replace(
                        /@\[(\d+)\]/g,
                        (_: string, idx: string) => {
                            const i = parseInt(idx, 10) - 1;
                            return i >= 0 && i < arr.length ? String(arr[i]) : _;
                        }
                    );

                    // Обновляем состояние только если значение реально изменилось
                    if (html !== cachedHtmlRef.current) {
                        setState("cachedHtml", html);
                    }
                    setError(null);
                } catch (e: any) {
                    if (e?.message?.includes("stack")) {
                        setError("Stack overflow – possible recursion in template or input");
                    } else {
                        setError(e?.message ?? String(e));
                    }
                    if (cachedHtmlRef.current !== "") setState("cachedHtml", "");
                } finally {
                    processingRef.current = false;
                }
                // Пустой массив зависимостей! Всё необходимое — в refs
            }, []);

            // Ref для доступа к актуальной функции из интервала
            const processTemplateRef = useRef(processTemplate);
            processTemplateRef.current = processTemplate;

            // Эффект опроса: зависит ТОЛЬКО от pollInterval
            useEffect(() => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                if (state.pollInterval !== "none") {
                    const tick = () => processTemplateRef.current();
                    tick(); // немедленный первый запуск
                    intervalRef.current = setInterval(tick, Number(state.pollInterval));
                }

                return () => {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                };
                // Убран processTemplate из зависимостей — ключевое исправление!
            }, [state.pollInterval]);

            // Очистка debounce при размонтировании
            useEffect(() => {
                return () => {
                    if (debounceRef.current) {
                        clearTimeout(debounceRef.current);
                        debounceRef.current = null;
                    }
                };
            }, []);

            const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const newValue = e.target.value;
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => {
                    setState("template", newValue);
                }, 250);
            };

            const handleManualUpdate = () => {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                    debounceRef.current = null;
                }
                processTemplate();
            };

            const tabStyle = (tab: string) => ({
                flex: 1,
                padding: "4px 0",
                borderRadius: 4,
                border: "none",
                background: activeTab === tab ? "#6366f1" : "#e5e7eb",
                color: activeTab === tab ? "#fff" : "#374151",
                fontWeight: 550,
                fontSize: 11,
                cursor: "pointer",
            });

            return (
                <div style={{ minWidth: 240 }}>
                    <L text="Период обновления" />
                    <Sel
                        value={state.pollInterval}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setState("pollInterval", e.target.value)
                        }
                    >
                        <option value="none">Выкл</option>
                        <option value="1000">1 с</option>
                        <option value="2000">2 с</option>
                        <option value="3000">3 с</option>
                        <option value="10000">10 с</option>
                    </Sel>

                    <div style={{ display: "flex", gap: 4, marginTop: 8, marginBottom: 8 }}>
                        <button onClick={() => setActiveTab("editor")} style={tabStyle("editor")}>
                            Редактор
                        </button>
                        <button onClick={() => setActiveTab("preview")} style={tabStyle("preview")}>
                            Предпросмотр
                        </button>
                    </div>

                    {activeTab === "editor" && (
                        <div>
                            <L text="HTML-шаблон" />
                            <textarea
                                ref={textareaRef}
                                defaultValue={state.template}
                                onChange={handleTemplateChange}
                                onBlur={() => {
                                    // Сбрасываем debounce
                                    if (debounceRef.current) {
                                        clearTimeout(debounceRef.current);
                                        debounceRef.current = null;
                                    }
                                    // Читаем значение по ref вместо глобального querySelector
                                    const currentValue = textareaRef.current?.value;
                                    if (currentValue !== undefined && currentValue !== templateRef.current) {
                                        setState("template", currentValue);
                                    }
                                }}
                                placeholder="Используйте @[1], @[2] … для значений"
                                style={{
                                    width: "100%",
                                    minHeight: 100,
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    padding: 6,
                                    borderRadius: 4,
                                    border: "1px solid #e5e7eb",
                                    resize: "vertical",
                                    boxSizing: "border-box",
                                }}
                            />
                            <button
                                onClick={handleManualUpdate}
                                style={{
                                    marginTop: 6,
                                    padding: "4px 12px",
                                    borderRadius: 4,
                                    border: "none",
                                    background: "#6366f1",
                                    color: "#fff",
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: "pointer",
                                }}
                            >
                                Обновить
                            </button>
                            {error && (
                                <div style={{ marginTop: 6, color: "#dc2626", fontSize: 10 }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "preview" && (
                        <div
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 6,
                                overflow: "hidden",
                                marginTop: 8,
                            }}
                        >
                            {state.cachedHtml ? (
                                <iframe
                                    key={state.cachedHtml}
                                    srcDoc={state.cachedHtml}
                                    sandbox="allow-same-origin"
                                    style={{
                                        width: "100%",
                                        height: 400,
                                        border: "none",
                                    }}
                                    title="HTML preview"
                                />
                            ) : (
                                <div
                                    style={{
                                        padding: 20,
                                        textAlign: "center",
                                        color: "#6b7280",
                                        fontSize: 12,
                                    }}
                                >
                                    Пока нет вывода. Нажмите «Обновить» или включите опрос.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        name: "HTML to PDF (Direct)",
        category: "Export",
        inputs: [{ id: "html", name: "HTML Source" }],
        outputs: [],
        defaultState: {
            rawHtml: "",
            error: null,
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        width: 300,
        visual: ({ state, setState, getInputTemplate }) => {
            const getInputRef = useRef(getInputTemplate);
            const stateRef = useRef({ rawHtml: state.rawHtml, error: state.error });

            // Синхронизация refs при каждом рендере
            getInputRef.current = getInputTemplate;
            stateRef.current = { rawHtml: state.rawHtml, error: state.error };

            // Функция обновления — стабильная, всё необходимое в refs
            const updateRawHtml = useCallback(() => {
                const raw = getInputRef.current?.("html");

                if (raw && typeof raw === "string") {
                    if (stateRef.current.rawHtml !== raw) setState("rawHtml", raw);
                    if (stateRef.current.error !== null) setState("error", null);
                } else if (raw !== undefined) {
                    const errMsg = "Input must be a string (HTML code)";
                    if (stateRef.current.error !== errMsg) setState("error", errMsg);
                    if (stateRef.current.rawHtml !== "") setState("rawHtml", "");
                } else {
                    const errMsg = "No HTML input connected";
                    if (stateRef.current.error !== errMsg) setState("error", errMsg);
                    if (stateRef.current.rawHtml !== "") setState("rawHtml", "");
                }
            }, [setState]);

            // Запускаем один раз при монтировании (ключевое исправление!)
            useEffect(() => {
                updateRawHtml();
            }, []); // ← пустые зависимости, никаких циклов

            const exportToPDF = () => {
                if (!state.rawHtml) {
                    setState("error", "No HTML content to export");
                    return;
                }

                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                document.body.appendChild(iframe);

                const iframeDoc = iframe.contentWindow?.document;
                if (!iframeDoc) {
                    setState("error", "Cannot create iframe document");
                    document.body.removeChild(iframe);
                    return;
                }

                iframeDoc.open();
                iframeDoc.write(state.rawHtml);
                iframeDoc.close();

                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 200);
            };

            return (
                <div>
                    <div style={{ fontSize: 12, marginBottom: 8, color: "#374151" }}>
                        Получен HTML из входа ↓
                    </div>

                    {state.error ? (
                        <div style={{ color: "#dc2626", fontSize: 11, marginBottom: 8 }}>
                            ⚠️ {state.error}
                        </div>
                    ) : state.rawHtml ? (
                        <div
                            style={{
                                background: "#f3f4f6",
                                padding: 8,
                                borderRadius: 4,
                                fontSize: 10,
                                fontFamily: "monospace",
                                maxHeight: 100,
                                overflow: "auto",
                                marginBottom: 12,
                                wordBreak: "break-all",
                            }}
                        >
                            {state.rawHtml.length > 200
                                ? state.rawHtml.slice(0, 200) + "..."
                                : state.rawHtml}
                        </div>
                    ) : (
                        <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 12 }}>
                            Нет данных. Подключите источник к порту "HTML Source".
                        </div>
                    )}

                    <button
                        onClick={exportToPDF}
                        disabled={!state.rawHtml}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 4,
                            border: "none",
                            background: state.rawHtml ? "#10b981" : "#9ca3af",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: state.rawHtml ? "pointer" : "not-allowed",
                            width: "100%",
                        }}
                    >
                        Экспорт PDF (печать)
                    </button>

                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 8 }}>
                        Откроется диалог печати браузера → выберите «Сохранить как PDF».
                    </div>
                </div>
            );
        },
    },
    {
        name: "OpenRouter API",
        category: "API",
        inputs: [{ id: "prompt", name: "Prompt" }],
        outputs: [
            {
                id: "response",
                name: "HTTP Response",
                /* Pure JSON-Lang — returns the full {status, ok, headers, data, text} object */
                template: (i, s) => [
                    "fetch_advanced",
                    "https://openrouter.ai/api/v1/chat/completions",
                    [
                        "object",
                        "method", "POST",
                        "headers", [
                            "object",
                            "Authorization", ["concat", "Bearer ", s.token],
                            "Content-Type", "application/json",
                            "HTTP-Referer", "https://jsonlang.local",
                            "X-Title", "JSONLang-Node"
                        ],
                        "body", [
                            "json_stringify",
                            [
                                "object",
                                "model", s.model,
                                "messages", [
                                    "array",
                                    ["object", "role", "user", "content", i.prompt ?? ""]
                                ]
                            ]
                        ]
                    ]
                ]
            }
        ],
        defaultState: {
            token: "",
            model: "deepseek/deepseek-v4-flash:free"
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h.01" />
                <path d="M12 10h.01" />
                <path d="M16 10h.01" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate, getInputTemplate }) => {
            const [testResult, setTestResult] = useState<any>(null);
            const [busy, setBusy] = useState(false);

            const runTest = async () => {
                setBusy(true);
                setTestResult(null);
                try {
                    const tpl = getTemplate("response");
                    const result = await evaluateJSONLang(tpl);
                    setTestResult(result);
                } catch (e: any) {
                    setTestResult({ ok: false, status: 0, error: e.message ?? String(e) });
                } finally {
                    setBusy(false);
                }
            };

            const inputPreview = useMemo(() => {
                try {
                    return JSON.stringify(getInputTemplate?.("prompt"));
                } catch {
                    return "—";
                }
            }, [getInputTemplate?.("prompt")]);

            const statusBadge = (status: number, ok: boolean) => {
                const color = ok ? "#059669" : status >= 400 ? "#dc2626" : "#d97706";
                return (
                    <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        background: color,
                        padding: "2px 8px",
                        borderRadius: 4,
                        letterSpacing: 0.3
                    }}>
                        {status ?? "—"}
                    </span>
                );
            };

            return (
                <>
                    {/* ── Header ── */}
                    <CardHeader style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <CardTitle style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                                OpenRouter
                            </CardTitle>
                            <span style={{
                                fontSize: 10,
                                color: "#6b7280",
                                fontWeight: 500,
                                background: "#f3f4f6",
                                padding: "2px 8px",
                                borderRadius: 4
                            }}>
                                {state.model.split("/")[1]?.split(":")[0] ?? state.model}
                            </span>
                        </div>
                        <CardDescription style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0 0" }}>
                            Full HTTP response — free tier AI
                        </CardDescription>
                    </CardHeader>

                    {/* ── Body ── */}
                    <CardContent style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                            <L text="API Token" />
                            <In
                                type="password"
                                value={state.token}
                                onChange={(e) => setState("token", e.target.value)}
                                placeholder="sk-or-v1-..."
                            />
                        </div>

                        <div>
                            <L text="Model" />
                            <Sel value={state.model} onChange={(e) => setState("model", e.target.value)}>
                                <option value="deepseek/deepseek-v4-flash:free">DeepSeek V4 Flash</option>
                                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B</option>
                                <option value="moonshotai/kimi-k2.6:free">Kimi K2.6</option>
                                <option value="openrouter/free">OpenRouter Free (auto)</option>
                                <option value="qwen/qwen3-coder:free">Qwen3 Coder</option>
                                <option value="google/gemma-4-31b-it:free">Gemma 4 31B</option>
                                <option value="nvidia/nemotron-nano-9b-v2:free">nemotron-nano</option>
                            </Sel>
                        </div>

                        <div>
                            <L text="Input Prompt AST" />
                            <pre style={{
                                margin: 0,
                                padding: 6,
                                background: "#f9fafb",
                                borderRadius: 4,
                                fontSize: 10,
                                color: "#6b7280",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                border: "1px solid #e5e7eb"
                            }}>
                                {inputPreview}
                            </pre>
                        </div>

                        {testResult !== null && (
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <L text="Response" />
                                    {testResult?.status !== undefined && statusBadge(testResult.status, testResult.ok)}
                                </div>
                                <pre style={{
                                    margin: 0,
                                    padding: 8,
                                    background: testResult?.ok ? "#f0fdf4" : "#fef2f2",
                                    borderRadius: 6,
                                    fontSize: 10,
                                    color: testResult?.ok ? "#166534" : "#991b1b",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    maxHeight: 180,
                                    overflow: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                    border: `1px solid ${testResult?.ok ? "#bbf7d0" : "#fecaca"}`
                                }}>
                                    {JSON.stringify(testResult, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div>
                            <L text="Output AST" />
                            <Preview value={getTemplate("response")} />
                        </div>
                    </CardContent>

                    {/* ── Footer ── */}
                    <CardFooter style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
                        <Button
                            onClick={runTest}
                            disabled={busy || !state.token}
                            style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                        >
                            {busy ? "Requesting…" : "Test Request"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setTestResult(null)}
                            disabled={busy}
                            style={{ fontSize: 12, fontWeight: 600 }}
                        >
                            Clear
                        </Button>
                    </CardFooter>
                </>
            );
        }
    },
    {
        name: "Excel Loader",
        category: "Data",
        inputs: [],
        outputs: [{ id: "out", name: "Rows", template: (_, s) => s.data ?? [] }],
        defaultState: { data: [], fileName: "No file selected" },
        icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M10 13h4" /><path d="M10 17h4" /></svg>,
        visual: ({ state, setState }) => {
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState<string | null>(null);

            // Dynamically load SheetJS from CDN if not present
            useEffect(() => {
                // @ts-ignore
                if (window.XLSX) return;

                const script = document.createElement("script");
                script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
                script.onload = () => console.log("SheetJS loaded");
                document.body.appendChild(script);
            }, []);

            const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setLoading(true);
                setError(null);
                setState("fileName", file.name);

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        // @ts-ignore
                        const XLSX = window.XLSX;
                        if (!XLSX) throw new Error("SheetJS library not loaded yet. Try again in a second.");

                        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });

                        // Read first sheet
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];

                        // Convert to JSON
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);

                        setState("data", jsonData);
                    } catch (err: any) {
                        setError(err.message);
                    } finally {
                        setLoading(false);
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            return (
                <div style={{ minWidth: 220, maxWidth: 300 }}>
                    <div style={{ marginBottom: 8 }}>
                        <L text="Upload Excel (.xlsx)" />
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFile}
                            disabled={loading}
                            style={{
                                width: "100%",
                                fontSize: 11,
                                padding: 6,
                                border: "1px dashed #6366f1",
                                borderRadius: 6,
                                background: "#f8fafc",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ color: "#dc2626", fontSize: 10, marginBottom: 6 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>File:</span> {state.fileName}
                    </div>

                    <div style={{ fontSize: 11, color: "#374151" }}>
                        <span style={{ fontWeight: 600 }}>Rows:</span> {Array.isArray(state.data) ? state.data.length : 0}
                    </div>

                    <div style={{ marginTop: 8, padding: 6, background: "#f9fafb", borderRadius: 4, maxHeight: 100, overflow: "auto" }}>
                        <L text="Preview (First 3 Rows)" />
                        <pre style={{ fontSize: 10, margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(state.data.slice(0, 3), null, 2)}
                        </pre>
                    </div>
                </div>
            );
        },
    },
    {
        name: "Table Display",
        category: "UI",
        inputs: [{ id: "data", name: "Data Array" }],
        outputs: [{ id: "out", name: "Pass", template: (i) => i.data }], // Passes data through for other nodes
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate }) => {
            const [rows, setRows] = useState<any[]>([]);
            const [headers, setHeaders] = useState<string[]>([]);
            const [loading, setLoading] = useState(true);
            const [error, setError] = useState<string | null>(null);

            // Evaluate the input template to get the actual data
            useEffect(() => {
                const fetchData = async () => {
                    const tpl = getInputTemplate?.("data");
                    if (!tpl) {
                        setRows([]);
                        setHeaders([]);
                        setLoading(false);
                        return;
                    }

                    try {
                        setLoading(true);
                        const result = await evaluateJSONLang(tpl);
                        console.log(result)

                        if (Array.isArray(result)) {
                            setRows(result);
                            // Extract headers from the first object
                            if (result.length > 0 && typeof result[0] === 'object' && result[0] !== null) {
                                setHeaders(Object.keys(result[0]));
                            } else {
                                setHeaders(["Value"]);
                            }
                            setError(null);
                        } else if (result === null) {
                            setRows([]);
                            setHeaders([]);
                        } else {
                            setError("Input is not an array");
                            setRows([]);
                        }
                    } catch (e: any) {
                        setError(e.message);
                        setRows([]);
                    } finally {
                        setLoading(false);
                    }
                };

                fetchData();
            }, [getInputTemplate?.("data")]);

            return (
                <div style={{ minWidth: 300, maxWidth: 450, display: "flex", flexDirection: "column", height: 300 }}>
                    {/* Header Bar */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 10px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb",
                        borderTopLeftRadius: 6, borderTopRightRadius: 6
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Data Preview
                        </span>
                        <span style={{ fontSize: 10, color: "#6b7280" }}>
                            {rows.length} rows
                        </span>
                    </div>

                    {/* Content Area */}
                    <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
                        {loading ? (
                            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                                Loading data...
                            </div>
                        ) : error ? (
                            <div style={{ padding: 10, color: "#dc2626", fontSize: 11 }}>
                                Error: {error}
                            </div>
                        ) : rows.length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                                No data to display
                            </div>
                        ) : (
                            <table style={{
                                width: "100%", borderCollapse: "collapse", fontSize: 11,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
                            }}>
                                <thead style={{
                                    position: "sticky", top: 0, background: "#f3f4f6",
                                    zIndex: 1, boxShadow: "0 1px 0 #e5e7eb"
                                }}>
                                    <tr>
                                        <th style={{
                                            textAlign: "left", padding: "6px 8px", fontWeight: 600,
                                            color: "#4b5563", borderBottom: "1px solid #e5e7eb",
                                            whiteSpace: "nowrap"
                                        }}>#</th>
                                        {headers.map((h) => (
                                            <th key={h} style={{
                                                textAlign: "left", padding: "6px 8px", fontWeight: 600,
                                                color: "#4b5563", borderBottom: "1px solid #e5e7eb",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                            <td style={{ padding: "4px 8px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                                                {idx + 1}
                                            </td>
                                            {headers.map((key) => (
                                                <td key={key} style={{ padding: "4px 8px", color: "#1f2937", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(row[key])}>
                                                    {row[key] !== undefined && row[key] !== null ? String(row[key]) : <span style={{ color: "#d1d5db" }}>-</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            );
        },
    },
];
