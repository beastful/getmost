import React, { useState, useEffect, useRef, useCallback } from "react";
import { JSONLangEngine } from "../JLR/json-lang-engine";
import { Box } from "lucide-react";
import { useGraphStore } from "../../store/graph-store";

const engine = new JSONLangEngine({ debug: false, trace: false, maxGas: 100000 });

/* ---------- Natives ---------- */
engine.registerNative("$input", (args) => args[1]);
engine.registerNative("json_parse", (args: any[]) => JSON.parse(args[0]));
engine.registerNative("json_stringify", (args: any[]) => JSON.stringify(args[0], null, args[1] ?? undefined));
engine.registerNative("build_query", (args: any[]) => new URLSearchParams(args[0]).toString());
engine.registerNative("to_number", (args: any[]) => {
    const val = args[0];
    if (typeof val === "number") return val;
    if (typeof val === "string" && !isNaN(Number(val))) return Number(val);
    return 0;
});
engine.registerNative("fetch_advanced", async (args: any[]) => {
    const [url, options = {}] = args;
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { }
    return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), data, text };
});
engine.registerNative("html_query", (args: any[]) => {
    const [html, selector, mode = "text", attrName = ""] = args;
    if (typeof html !== "string") return null;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const el = doc.querySelector(selector);
    if (!el) return null;
    if (mode === "text") return el.textContent ?? null;
    if (mode === "html") return el.innerHTML ?? null;
    if (mode === "attr") return el.getAttribute(attrName) ?? null;
    return null;
});

engine.registerOpaque(
    "div", "span", "p", "button", "input", "h1", "h2", "h3", "h4", "h5", "h6",
    "img", "a", "ul", "ol", "li", "form", "label", "textarea", "select",
    "option", "section", "article", "header", "footer", "main", "nav",
    "aside", "strong", "em", "code", "pre"
);

/* ---------- Types ---------- */
export interface NodeInput { id: string; name: string; }
export interface NodeOutput { id: string; name: string; template: any; }
export interface NodeDef {
    name: string;
    category: string;
    width?: number;
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
        getInputTemplate?: (inputId: string) => any;
    }>;
}

/* ---------- Registry ---------- */
export const NODE_REGISTRY = new Map<string, NodeDef>();

/* ---------- AST helpers ---------- */
export function substituteInputs(expr: any, inputs: Record<string, any>, seen = new WeakSet<any>()): any {
    if (expr === null || typeof expr !== "object") return expr;
    if (seen.has(expr)) return expr;
    seen.add(expr);

    if (Array.isArray(expr)) {
        const [head, ...args] = expr;
        if (head === "$input" && args.length >= 1 && typeof args[0] === "string") {
            const wireId = args[0];
            if (wireId in inputs) return inputs[wireId];
            if (args.length >= 2) return substituteInputs(args[1], inputs, seen);
            return expr;
        }
        return expr.map((item) => substituteInputs(item, inputs, seen));
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(expr)) {
        out[k] = substituteInputs(v, inputs, seen);
    }
    return out;
}

export function collectInputRefs(expr: any, set: Set<string>, seen = new WeakSet<any>()) {
    if (!Array.isArray(expr) || expr.length === 0) return;
    if (seen.has(expr)) return;
    seen.add(expr);
    const [head, ...args] = expr;
    if (head === "$input" && args.length >= 1 && typeof args[0] === "string") set.add(args[0]);
    for (const arg of args) collectInputRefs(arg, set, seen);
}

/* ---------- Flatten outputs ---------- */
function isTuple(v: any): v is [string, string, any] {
    return Array.isArray(v) && v.length === 3 && typeof v[0] === "string" && typeof v[1] === "string";
}

function flattenOutputs(raw: any[]): [string, string, any][] {
    const result: [string, string, any][] = [];
    const dive = (item: any) => {
        if (item === null || item === undefined) return;
        if (!Array.isArray(item) && typeof item === "object" && item.id && item.name) {
            result.push([item.id, item.name, item.template]);
            return;
        }
        if (!Array.isArray(item)) return;
        if (isTuple(item)) {
            result.push(item);
            return;
        }
        for (const child of item) dive(child);
    };
    for (const item of raw) dive(item);
    return result;
}

/* ---------- Factories ---------- */
export function createNodeFromExprs(def: {
    name: string;
    category: string;
    width?: number;
    state?: Record<string, any>;
    inputs?: NodeInput[];
    outputs: [string, string, any][];
    visual?: NodeDef["visual"];
    icon?: NodeDef["icon"];
    controlled?: boolean;
}): NodeDef {
    const inputSet = new Set<string>();
    for (const [, , template] of def.outputs) collectInputRefs(template, inputSet);
    const autoInputs = Array.from(inputSet).map((name) => ({ id: name, name }));
    const explicitInputs = def.inputs || [];
    const inputMap = new Map<string, NodeInput>();
    for (const inp of autoInputs) inputMap.set(inp.id, inp);
    for (const inp of explicitInputs) inputMap.set(inp.id, inp);
    const inputs = Array.from(inputMap.values());
    const outputs: NodeOutput[] = def.outputs.map(([id, name, template]) => ({ id, name, template }));
    return {
        name: def.name,
        category: def.category,
        width: def.width,
        inputs,
        outputs,
        defaultState: def.state || {},
        icon: def.icon || (() => null),
        controlled: def.controlled ?? true,
        visual: def.visual || (({ getTemplate, inputs: inputVals }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inputs.length > 0 && (
                    <div>
                        <L text="Inputs" />
                        {inputs.map((inp) => (
                            <div key={inp.id} style={{ marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600 }}>{inp.name}: </span>
                                <span style={{ fontSize: 11, color: "#374151" }}>{JSON.stringify(inputVals[inp.id])}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div>
                    <L text="Outputs" />
                    {outputs.map((out) => (
                        <div key={out.id} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{out.name}: </span>
                            <Preview value={getTemplate(out.id)} />
                        </div>
                    ))}
                </div>
            </div>
        )),
    };
}

export function buildNodeFromPayload(payload: {
    name: string;
    category: string;
    width?: number;
    state?: Record<string, any>;
    inputs?: NodeInput[];
    outputs: any[];
    visual?: NodeDef["visual"];
    icon?: NodeDef["icon"];
    controlled?: boolean;
}): NodeDef {
    const flattenedOutputs = flattenOutputs(payload.outputs);
    const inputSet = new Set<string>();
    for (const [, , template] of flattenedOutputs) collectInputRefs(template, inputSet);
    const autoInputs = Array.from(inputSet).map((name) => ({ id: name, name }));
    const explicitInputs = payload.inputs || [];
    const inputMap = new Map<string, NodeInput>();
    for (const inp of autoInputs) inputMap.set(inp.id, inp);
    for (const inp of explicitInputs) inputMap.set(inp.id, inp);
    const inputs = Array.from(inputMap.values());
    const outputs: NodeOutput[] = flattenedOutputs.map(([id, name, template]) => ({ id, name, template }));
    return {
        name: payload.name,
        category: payload.category,
        width: payload.width,
        inputs,
        outputs,
        defaultState: payload.state || {},
        icon: payload.icon || (() => null),
        controlled: payload.controlled ?? true,
        visual: payload.visual || (({ getTemplate, inputs: inputVals }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inputs.length > 0 && (
                    <div>
                        <L text="Inputs" />
                        {inputs.map((inp) => (
                            <div key={inp.id} style={{ marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600 }}>{inp.name}: </span>
                                <span style={{ fontSize: 11, color: "#374151" }}>{JSON.stringify(inputVals[inp.id])}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div>
                    <L text="Outputs" />
                    {outputs.map((out) => (
                        <div key={out.id} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{out.name}: </span>
                            <Preview value={getTemplate(out.id)} />
                        </div>
                    ))}
                </div>
            </div>
        )),
    };
}

/* ---------- UI primitives ---------- */
const L: React.FC<{ text: string }> = ({ text }) => (
    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontWeight: 600 }}>
        {text}
    </div>
);

const In: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        style={{
            width: "100%", background: "#ffffff", border: "2px solid #e5e7eb", color: "#111827",
            borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", fontWeight: 500, transition: "border-color 0.15s, box-shadow 0.15s",
            ...(props.style as any),
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; props.onFocus?.(e); }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
);

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        style={{
            width: "100%", background: "#ffffff", border: "2px solid #e5e7eb", color: "#111827",
            borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", fontFamily: "inherit",
            cursor: "pointer", fontWeight: 500,
        }}
    />
);

const Preview: React.FC<{ value: any }> = ({ value }) => (
    <pre
        style={{
            marginTop: 8, padding: "6px 10px", background: "#f9fafb", borderRadius: 6, fontSize: 10,
            color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", border: "1px solid #e5e7eb",
        }}
        title={JSON.stringify(value, null, 2)}
    >
        {JSON.stringify(value)}
    </pre>
);

/* ---------- Export evaluation ---------- */
export async function evaluateJSONLang(expr: any): Promise<any> {
    if (expr === null || typeof expr !== "object") return expr;
    return engine.process(expr);
}
export { engine };

const safeJsonParse = (str: string, fallback: any) => {
    try { return JSON.parse(str); } catch { return fallback; }
};

const LucideIcons: Record<string, any> = { Box };

/* ---------- Copy button helper ---------- */
const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = "Copy" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { }
    };
    return (
        <button
            onClick={handleCopy}
            style={{
                padding: "3px 10px", borderRadius: 4, border: "1px solid #e5e7eb",
                background: copied ? "#d1fae5" : "#f9fafb", color: copied ? "#059669" : "#374151",
                fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            }}
        >
            {copied ? "Copied!" : label}
        </button>
    );
};

/* ---------- Nodes ---------- */
export const NODES: NodeDef[] = [
    /* --- Primitives --- */
    {
        name: "Number", category: "Basic", inputs: [],
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
        name: "String", category: "Basic", inputs: [],
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
        name: "Boolean", category: "Basic", inputs: [],
        outputs: [{ id: "out", name: "Bool", template: (_, s) => s.value }],
        defaultState: { value: true },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <In type="checkbox" checked={state.value} onChange={(e) => setState("value", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{state.value ? "true" : "false"}</span>
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
    {
        name: "Color", category: "Basic", inputs: [],
        outputs: [{ id: "out", name: "Hex", template: (_, s) => s.color }],
        defaultState: { color: "#6366f1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <In type="color" value={state.color} onChange={(e) => setState("color", e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "none", background: "none", cursor: "pointer" }} />
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500, color: "#374151" }}>{state.color}</span>
            </div>
        ),
    },

    /* --- Math --- */
    {
        name: "Sum", category: "Math", inputs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
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
        name: "Multiply", category: "Math", inputs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
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
        name: "Divide", category: "Math", inputs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
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
        name: "Pow", category: "Math", inputs: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
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
        name: "Random", category: "Math", inputs: [],
        outputs: [{ id: "out", name: "Value", template: (_, s) => ["random", s.min, s.max] }],
        defaultState: { min: 0, max: 100 },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h6.5a2.5 2.5 0 0 0 0-5H2v-4h6.5a2.5 2.5 0 0 0 0-5H2" /><path d="M2 12h20" />
            </svg>
        ),
        visual: ({ state, setState }) => (
            <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}><L text="Min" /><In type="number" value={state.min} onChange={(e) => setState("min", Number(e.target.value))} /></div>
                <div style={{ flex: 1 }}><L text="Max" /><In type="number" value={state.max} onChange={(e) => setState("max", Number(e.target.value))} /></div>
            </div>
        ),
    },
    {
        name: "ToNumber", category: "Math", inputs: [{ id: "a", name: "Value" }],
        outputs: [{ id: "out", name: "Num", template: (i) => ["to_number", i.a] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        ),
        visual: ({ getTemplate }) => <Preview value={getTemplate("out")} />,
    },

    /* --- Array (for collecting Block Outputs) --- */
    {
        name: "Array", category: "Array",
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

    /* --- API --- */
    {
        name: "HttpAdvanced", category: "API",
        inputs: [
            { id: "body", name: "Body" },
            { id: "query", name: "Query" },
            { id: "headers", name: "Headers" },
        ],
        outputs: [{
            id: "out", name: "Response",
            template: (i, s) => [
                "fetch_advanced",
                ["if", ["gt", ["length", i.query ?? {}], 0], ["concat", s.baseUrl, s.path, "?", ["build_query", i.query ?? {}]], ["concat", s.baseUrl, s.path]],
                ["merge", ["object", "method", s.method], ["if", ["gt", ["length", i.headers ?? {}], 0], ["object", "headers", i.headers], ["object"]], ["if", ["is", s.method, "GET"], ["object"], ["object", "body", ["json_stringify", i.body ?? null]]]]
            ]
        }],
        defaultState: { method: "GET", baseUrl: "https://jsonplaceholder.typicode.com", path: "/posts/1" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
            </svg>
        ),
        visual: ({ state, setState, getTemplate }) => (
            <div style={{ minWidth: 240 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <Sel style={{ flex: 1 }} value={state.method} onChange={(e) => setState("method", e.target.value)}>
                        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                    </Sel>
                </div>
                <In value={state.baseUrl} onChange={(e) => setState("baseUrl", e.target.value)} placeholder="https://api.example.com" style={{ marginBottom: 4 }} />
                <In value={state.path} onChange={(e) => setState("path", e.target.value)} placeholder="/v1/resource" />
                <div style={{ marginTop: 8 }}>
                    <L text="Request AST" />
                    <pre style={{ margin: 0, padding: 8, background: "#1f2937", color: "#e5e7eb", borderRadius: 6, fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "auto", maxHeight: 140, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {JSON.stringify(getTemplate("out"), null, 2)}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        name: "JSONPicker", category: "API", inputs: [{ id: "data", name: "JSON" }],
        outputs: [{
            id: "out", name: "Selected",
            template: (i, s) => {
                const parts = s.selectedPath ? s.selectedPath.split(".").filter(Boolean) : [];
                return ["get_path", i.data ?? null, ...parts];
            },
        }],
        defaultState: { selectedPath: "" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
            </svg>
        ),
        visual: ({ state, setState, getInputTemplate, getTemplate }) => {
            const [jsonData, setJsonData] = useState<any>(undefined);
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState<string | null>(null);
            const [expanded, setExpanded] = useState<string[]>([]);

            const fetchData = async () => {
                const inputTpl = getInputTemplate?.("data");
                if (inputTpl === undefined) return;
                setLoading(true); setError(null);
                try {
                    const data = await evaluateJSONLang(inputTpl);
                    setJsonData(data); setExpanded([""]);
                } catch (e: any) { setError(e.message ?? String(e)); }
                finally { setLoading(false); }
            };

            const toggle = (path: string) => setExpanded((prev) => prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]);
            const select = (path: string) => setState("selectedPath", path);

            const TreeNode: React.FC<{ data: any; pathSegments: string[]; depth: number }> = ({ data, pathSegments, depth }) => {
                const fullPath = pathSegments.join(".");
                const isExpanded = expanded.includes(fullPath);
                const isSelected = state.selectedPath === fullPath;

                if (data === null || data === undefined) return (
                    <div onClick={() => select(fullPath)} style={{ paddingLeft: depth * 16, cursor: "pointer", color: isSelected ? "#6366f1" : "#6b7280", fontWeight: isSelected ? 700 : 400, fontSize: 11 }}>{String(data)}</div>
                );

                if (Array.isArray(data)) return (
                    <div>
                        <div style={{ display: "flex", alignItems: "center", paddingLeft: depth * 16, cursor: "pointer", color: isSelected ? "#6366f1" : "#111827", fontWeight: isSelected ? 700 : 500, fontSize: 12 }} onClick={() => select(fullPath)}>
                            <span onClick={(e) => { e.stopPropagation(); toggle(fullPath); }} style={{ marginRight: 4, fontSize: 10, display: "inline-block", width: 12, color: "#6b7280", userSelect: "none" }}>{isExpanded ? "▼" : "▶"}</span>
                            <span>[{data.length}]</span><span style={{ color: "#6b7280", marginLeft: 4 }}>Array</span>
                        </div>
                        {isExpanded && data.map((item, idx) => <TreeNode key={idx} data={item} pathSegments={[...pathSegments, String(idx)]} depth={depth + 1} />)}
                    </div>
                );

                if (typeof data === "object") {
                    const entries = Object.entries(data);
                    return (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", paddingLeft: depth * 16, cursor: "pointer", color: isSelected ? "#6366f1" : "#111827", fontWeight: isSelected ? 700 : 500, fontSize: 12 }} onClick={() => select(fullPath)}>
                                <span onClick={(e) => { e.stopPropagation(); toggle(fullPath); }} style={{ marginRight: 4, fontSize: 10, display: "inline-block", width: 12, color: "#6b7280", userSelect: "none" }}>{isExpanded ? "▼" : "▶"}</span>
                                <span>{`{${entries.length}}`}</span><span style={{ color: "#6b7280", marginLeft: 4 }}>Object</span>
                            </div>
                            {isExpanded && entries.map(([key, val]) => (
                                <div key={key}>
                                    <div style={{ paddingLeft: (depth + 1) * 16, display: "flex", alignItems: "center", cursor: "pointer", color: state.selectedPath === [...pathSegments, key].join(".") ? "#6366f1" : "#374151", fontWeight: state.selectedPath === [...pathSegments, key].join(".") ? 700 : 400, fontSize: 11 }} onClick={() => select([...pathSegments, key].join("."))}>
                                        <span style={{ color: "#059669", marginRight: 6, fontWeight: 600 }}>{key}:</span>
                                        {typeof val !== "object" || val === null ? <span style={{ color: "#6b7280", fontSize: 11 }}>{JSON.stringify(val)}</span> : <span style={{ color: "#9ca3af", fontSize: 10 }}>{Array.isArray(val) ? `Array(${val.length})` : `Object(${Object.keys(val).length})`}</span>}
                                    </div>
                                    {(typeof val === "object" && val !== null) && <TreeNode data={val} pathSegments={[...pathSegments, key]} depth={depth + 1} />}
                                </div>
                            ))}
                        </div>
                    );
                }

                return (
                    <div onClick={() => select(fullPath)} style={{ paddingLeft: depth * 16, cursor: "pointer", color: isSelected ? "#6366f1" : "#111827", fontWeight: isSelected ? 700 : 400, fontSize: 12 }}>{String(data)}</div>
                );
            };

            const displayPath = state.selectedPath ? `/${state.selectedPath.replace(/\./g, '/')}` : '/';

            return (
                <div style={{ minWidth: 220, maxWidth: 340 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginBottom: 6 }}>JSON Picker</div>
                    <button onClick={fetchData} disabled={loading} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: "none", background: loading ? "#9ca3af" : "#6366f1", color: "#fff", fontWeight: 700, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", marginBottom: 8 }}>{loading ? "Fetching…" : "Fetch Data"}</button>
                    {error && <div style={{ padding: 6, background: "#fef2f2", borderRadius: 4, color: "#dc2626", fontSize: 11, marginBottom: 6 }}>{error}</div>}
                    {jsonData !== undefined && (
                        <>
                            <div style={{ maxHeight: 320, overflowY: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.5, border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 4px", background: "#f9fafb" }}>
                                <TreeNode data={jsonData} pathSegments={[]} depth={0} />
                            </div>
                            <div style={{ marginTop: 8, padding: 6, background: "#f3f4f6", borderRadius: 4, fontSize: 10, color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 600, color: "#4b5563" }}>Path: {displayPath}</span>
                                <span style={{ color: "#6b7280", fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={JSON.stringify(getTemplate("out"))}>{JSON.stringify(getTemplate("out"))}</span>
                            </div>
                        </>
                    )}
                </div>
            );
        },
    },
    {
        name: "HTMLPicker", category: "API", inputs: [{ id: "html", name: "HTML" }],
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
                        <option value="text">textContent</option><option value="html">innerHTML</option><option value="attr">Attribute</option>
                    </Sel>
                </div>
                {state.mode === "attr" && <div style={{ marginTop: 6 }}><L text="Attribute" /><In value={state.attr} onChange={(e) => setState("attr", e.target.value)} placeholder="src, href, data-id" /></div>}
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },

    /* --- Meta / Metaprogramming --- */
    {
        name: "Block Input", category: "Meta",
        inputs: [{ id: "id", name: "ID" }, { id: "fallback", name: "Fallback" }],
        outputs: [{ id: "ast", name: "AST", template: (i) => ["$input", String(i.id ?? "in"), i.fallback ?? 0] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
            </svg>
        ),
        visual: ({ inputs, getTemplate }) => (
            <div style={{ minWidth: 160 }}>
                <L text="ID" /><Preview value={inputs.id} />
                <L text="Fallback" /><Preview value={inputs.fallback} />
                <div style={{ marginTop: 6 }}>
                    <L text="AST" />
                    <div style={{ padding: "4px 8px", background: "#fef3c7", borderRadius: 4, fontSize: 10, color: "#92400e", fontFamily: "monospace" }}>{JSON.stringify(getTemplate("ast"))}</div>
                    <div style={{ marginTop: 6 }}><CopyButton text={JSON.stringify(getTemplate("ast"))} /></div>
                </div>
            </div>
        ),
    },
    {
        name: "Block Output", category: "Meta",
        inputs: [{ id: "id", name: "ID" }, { id: "name", name: "Name" }, { id: "expr", name: "Expr" }],
        outputs: [{
            id: "def", name: "Def",
            template: (i, s) => [
                i.id ?? s.id ?? "out",
                i.name ?? s.name ?? "Result",
                i.expr ?? safeJsonParse(s.expr ?? '["$input","missing",0]', ["$input", "missing", 0]),
            ],
        }],
        defaultState: { id: "out", name: "Result", expr: '["sum", ["$input", "A", 0], ["$input", "B", 0]]' },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
        ),
        visual: ({ state, setState, inputs, getTemplate }) => {
            const tpl = getTemplate("def");
            return (
                <div style={{ minWidth: 180 }}>
                    <L text="ID" /><In value={state.id} onChange={(e) => setState("id", e.target.value)} />
                    <L text="Name" /><In value={state.name} onChange={(e) => setState("name", e.target.value)} />
                    <L text="Expression (JSON‑Lang AST)" />
                    <textarea value={state.expr} onChange={(e) => setState("expr", e.target.value)} style={{ width: "100%", minHeight: 56, fontSize: 11, fontFamily: "monospace", borderRadius: 6, border: "2px solid #e5e7eb", padding: 6, resize: "vertical" }} />
                    <div style={{ marginTop: 6 }}><L text="Wired expr (overrides)" /><Preview value={inputs.expr} /></div>
                    <div style={{ marginTop: 6 }}><L text="Output tuple" /><Preview value={tpl} /></div>
                    <div style={{ marginTop: 6 }}><CopyButton text={JSON.stringify(tpl, null, 2)} label="Copy Tuple" /></div>
                </div>
            );
        },
    },
    {
        name: "Create Block", category: "Meta",
        inputs: [{ id: "outputs", name: "Outputs" }],
        outputs: [{ id: "done", name: "Done", template: () => null }],
        defaultState: { name: "CustomBlock", category: "Custom", icon: "Box" },
        icon: () => <Box size={16} />,
        visual: ({ state, setState, inputs }) => {
            const [status, setStatus] = useState("");
            const { addNode } = useGraphStore();

            const buildDef = (): NodeDef | null => {
                const raw = inputs.outputs;
                const outputsArray = isTuple(raw) ? [raw] : Array.isArray(raw) ? raw : raw ? [raw] : [];
                const flattened = flattenOutputs(outputsArray);
                if (flattened.length === 0) {
                    setStatus("No valid outputs — wire Block Output nodes or Array");
                    return null;
                }
                try {
                    const IconComponent = (LucideIcons as any)[state.icon] || Box;
                    const IconNode = () => <IconComponent size={16} />;
                    IconNode.displayName = `Icon_${state.icon}`;
                    return buildNodeFromPayload({
                        name: state.name,
                        category: state.category,
                        outputs: flattened,
                        icon: IconNode,
                    });
                } catch (err: any) {
                    setStatus(`Build error: ${err.message}`);
                    return null;
                }
            };

            const createAndAdd = () => {
                const def = buildDef();
                if (!def) return;
                NODE_REGISTRY.set(def.name, def);
                // Force store refresh if needed
                const store = useGraphStore.getState?.();
                if (store && 'refreshNodeTypes' in store) {
                    (store as any).refreshNodeTypes();
                }
                addNode(def.name, {
                    x: 200 + Math.random() * 40,
                    y: 200 + Math.random() * 40,
                });
                setStatus(`Created & added "${def.name}"`);
            };

            const createOnly = () => {
                const def = buildDef();
                if (!def) return;
                NODE_REGISTRY.set(def.name, def);
                setStatus(`Registered "${def.name}" — drag from palette`);
            };

            const copyAST = () => {
                const def = buildDef();
                if (!def) return;
                const payload = {
                    name: def.name,
                    category: def.category,
                    inputs: def.inputs.map(i => ({ id: i.id, name: i.name })),
                    outputs: def.outputs.map(o => [o.id, o.name, o.template]),
                };
                navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                setStatus("AST copied to clipboard");
            };

            const astPreview = (() => {
                const raw = inputs.outputs;
                const outputsArray = isTuple(raw) ? [raw] : Array.isArray(raw) ? raw : raw ? [raw] : [];
                const flattened = flattenOutputs(outputsArray);
                if (flattened.length === 0) return "No outputs wired";
                return JSON.stringify(flattened.map(([id, name, tpl]) => ({ id, name, template: tpl })), null, 2);
            })();

            return (
                <div style={{ minWidth: 240 }}>
                    <L text="Block Name" />
                    <In value={state.name} onChange={(e) => setState("name", e.target.value)} placeholder="MyBlock" />
                    <L text="Category" />
                    <In value={state.category} onChange={(e) => setState("category", e.target.value)} placeholder="Custom" />
                    <L text="Icon" />
                    <In value={state.icon} onChange={(e) => setState("icon", e.target.value)} placeholder="Box" />

                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button onClick={createAndAdd} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Create & Add</button>
                        <button onClick={createOnly} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid #6366f1", background: "#fff", color: "#6366f1", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Register Only</button>
                    </div>
                    <button onClick={copyAST} style={{ width: "100%", marginTop: 6, padding: "6px 0", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Copy Block AST</button>

                    <div style={{ marginTop: 10 }}>
                        <L text="Preview" />
                        <pre style={{ margin: 0, padding: 8, background: "#1f2937", color: "#e5e7eb", borderRadius: 6, fontSize: 9, fontFamily: "monospace", maxHeight: 120, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{astPreview}</pre>
                    </div>

                    {status && (
                        <div style={{ marginTop: 8, padding: 6, borderRadius: 4, background: status.includes("Error") || status.includes("No") ? "#fef2f2" : "#ecfdf5", color: status.includes("Error") || status.includes("No") ? "#dc2626" : "#059669", fontSize: 11, fontWeight: 600 }}>
                            {status}
                        </div>
                    )}
                </div>
            );
        },
    },

    /* --- Drag Source (palette item that creates instances) --- */
    {
        name: "Drag Block", category: "Meta",
        inputs: [],
        outputs: [],
        controlled: false,
        defaultState: { name: "NewBlock", category: "Custom", icon: "Box" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11l4-7" /><path d="M19 11l-4-7" /><path d="M2 11h20" /><path d="M3.5 11l1.5 9h14l1.5-9" />
            </svg>
        ),
        visual: ({ state, setState }) => {
            const { addNode } = useGraphStore();
            const dragRef = useRef<HTMLDivElement>(null);

            const handleDragStart = (e: React.DragEvent) => {
                const def = buildNodeFromPayload({
                    name: state.name,
                    category: state.category,
                    outputs: [],
                    icon: () => <Box size={16} />,
                });
                NODE_REGISTRY.set(def.name, def);
                e.dataTransfer.setData("application/json", JSON.stringify({ type: def.name, name: state.name }));
                e.dataTransfer.effectAllowed = "copy";
            };

            const handleClick = () => {
                const def = buildNodeFromPayload({
                    name: state.name,
                    category: state.category,
                    outputs: [],
                    icon: () => <Box size={16} />,
                });
                NODE_REGISTRY.set(def.name, def);
                addNode(def.name, { x: 300, y: 200 });
            };

            return (
                <div style={{ minWidth: 180, padding: 10 }}>
                    <L text="Block Name" />
                    <In value={state.name} onChange={(e) => setState("name", e.target.value)} style={{ marginBottom: 6 }} />
                    <L text="Category" />
                    <In value={state.category} onChange={(e) => setState("category", e.target.value)} style={{ marginBottom: 6 }} />
                    <div
                        ref={dragRef}
                        draggable
                        onDragStart={handleDragStart}
                        onClick={handleClick}
                        style={{
                            padding: "12px 16px", background: "#e0e7ff", borderRadius: 8,
                            border: "2px dashed #6366f1", textAlign: "center", cursor: "grab",
                            fontSize: 12, fontWeight: 700, color: "#4338ca", userSelect: "none",
                        }}
                    >
                        🖐 Drag me to canvas<br />
                        <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 500 }}>or click to place</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
                        Creates: {state.name} ({state.category})
                    </div>
                </div>
            );
        },
    },

    /* --- Factory examples --- */
    createNodeFromExprs({
        name: "Scale", category: "Math",
        outputs: [["scaled", "Scaled", ["multiply", ["$input", "value A", 1], ["$input", "factor", 1]]]],
    }),
];

/* ---------- Register all nodes ---------- */
NODES.forEach((n) => NODE_REGISTRY.set(n.name, n));
