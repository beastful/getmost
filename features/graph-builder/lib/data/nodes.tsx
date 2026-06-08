// features/graph-editor/lib/nodes.ts

import React, { useEffect, useState } from "react";
import { JSONLangEngine } from "../JLR/json-lang-engine";

const engine = new JSONLangEngine({ debug: false, trace: false, maxGas: 100000 });

export async function evaluateJSONLang(expr: any): Promise<any> {
    if (expr === null || typeof expr !== "object") return expr;
    return engine.process(expr);
}

export interface NodeInput {
    id: string;
    name: string;
}

export interface NodeOutput {
    id: string;
    name: string;
    template: any; // JSON‑Lang AST or primitive
}

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

// UI primitives
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

// Static node definitions – no $input references, no metaprogramming
export const NODES: NodeDef[] = [
    // --- Primitives ---
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

    // --- Math ---
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
    {
        name: "Scale", category: "Math",
        inputs: [{ id: "valueA", name: "Value A" }, { id: "factor", name: "Factor" }],
        outputs: [{ id: "scaled", name: "Scaled", template: (i) => ["multiply", i.valueA ?? 1, i.factor ?? 1] }],
        defaultState: {},
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
        ),
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 0", fontWeight: 500 }}>Value × Factor</div>
                <Preview value={getTemplate("scaled")} />
            </div>
        ),
    },

    // --- Array ---
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

    // --- API ---
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
    {
        name: "ExecuteOnClick",
        category: "Interactive",
        inputs: [{ id: "expr", name: "Expression" }], // accepts JSON‑Lang AST
        outputs: [{ id: "result", name: "Result", template: (_, s) => s.lastResult }],
        defaultState: {
            lastResult: null,
        },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
        ),
        visual: ({ inputs, state, setState, getTemplate }) => {
            const [evalError, setEvalError] = useState<string | null>(null);
            const [isRunning, setIsRunning] = useState(false);

            const runExpression = async () => {
                setEvalError(null);
                setIsRunning(true);
                try {
                    let expr = inputs.expr; // expression comes from wired input
                    if (expr === undefined) {
                        throw new Error("No expression connected to input");
                    }
                    // If the input is a string that looks like JSON, parse it
                    if (typeof expr === "string") {
                        try {
                            expr = JSON.parse(expr);
                        } catch {
                            // keep as string
                        }
                    }
                    const result = await evaluateJSONLang(expr);
                    setState("lastResult", result);
                } catch (err: any) {
                    setEvalError(err.message || String(err));
                    setState("lastResult", null);
                } finally {
                    setIsRunning(false);
                }
            };

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <L text="Input Expression (AST)" />
                    <Preview value={inputs.expr} />

                    <button
                        onClick={runExpression}
                        disabled={isRunning}
                        style={{
                            padding: "6px 12px",
                            background: isRunning ? "#9ca3af" : "#6366f1",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: isRunning ? "not-allowed" : "pointer",
                            fontSize: 12,
                        }}
                    >
                        {isRunning ? "Running..." : "▶ Run"}
                    </button>

                    {evalError && (
                        <div style={{ color: "#dc2626", fontSize: 11, background: "#fef2f2", padding: 6, borderRadius: 4 }}>
                            {evalError}
                        </div>
                    )}

                    <div>
                        <L text="Last Result" />
                        <Preview value={getTemplate("result")} />
                    </div>
                </div>
            );
        },
    },
    {
        name: "AgentMascot",
        category: "AI Agent",
        inputs: [{ id: "task", name: "Task" }],
        outputs: [{ id: "result", name: "Result", template: (_, s) => s.result ?? null }],
        defaultState: { status: "idle", result: null },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="10" r="1.5" fill="currentColor" /><circle cx="15" cy="10" r="1.5" fill="currentColor" /><path d="M8 15s1.5 2 4 2 4-2 4-2" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            const [dots, setDots] = useState(0);

            useEffect(() => {
                if (inputs.task === undefined) { setState("status", "idle"); return; }
                let alive = true;
                const run = async () => {
                    setState("status", "thinking");
                    try {
                        const ev = await evaluateJSONLang(inputs.task);
                        if (!alive) return;
                        await new Promise(r => setTimeout(r, 1400));
                        if (!alive) return;
                        setState("result", ev);
                        setState("status", "done");
                    } catch {
                        if (!alive) return;
                        setState("status", "error");
                    }
                };
                run();
                return () => { alive = false; };
            }, [inputs.task]);

            useEffect(() => {
                if (state.status !== "thinking") return;
                const iv = setInterval(() => setDots(d => (d + 1) % 4), 350);
                return () => clearInterval(iv);
            }, [state.status]);

            const mood = {
                idle: { color: "#9ca3af", glow: "#9ca3af22", face: "🤖", label: "Waiting…" },
                thinking: { color: "#f59e0b", glow: "#f59e0b44", face: "🤔", label: `Thinking${".".repeat(dots || 1)}` },
                done: { color: "#10b981", glow: "#10b98144", face: "✨", label: "Done!" },
                error: { color: "#ef4444", glow: "#ef444422", face: "💥", label: "Error" },
            }[state.status as string] || mood.idle;

            return (
                <div style={{ minWidth: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 24, background: mood.color,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
                        boxShadow: `0 0 24px ${mood.glow}`, transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        transform: state.status === "thinking" ? "scale(1.05)" : "scale(1)",
                    }}>
                        {mood.face}
                    </div>
                    <div style={{
                        padding: "4px 14px", borderRadius: 20, background: `${mood.color}15`, color: mood.color,
                        fontSize: 11, fontWeight: 800, letterSpacing: 0.5, transition: "all 0.3s",
                    }}>
                        {mood.label}
                    </div>
                    <Preview value={inputs.task} />
                </div>
            );
        },
    },
    {
        name: "ChatStage",
        category: "AI Agent",
        inputs: [{ id: "prompt", name: "Prompt" }],
        outputs: [{ id: "reply", name: "Reply", template: (_, s) => s.reply ?? "" }],
        defaultState: { reply: "", stage: "empty" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            const [visible, setVisible] = useState(false);

            useEffect(() => {
                if (inputs.prompt === undefined) { setState("stage", "empty"); setVisible(false); return; }
                let alive = true;
                const run = async () => {
                    setState("stage", "typing");
                    setVisible(false);
                    try {
                        const ev = await evaluateJSONLang(inputs.prompt);
                        if (!alive) return;
                        await new Promise(r => setTimeout(r, 900));
                        if (!alive) return;
                        setState("reply", String(ev ?? ""));
                        setVisible(true);
                        setState("stage", "sent");
                    } catch {
                        setState("stage", "error");
                    }
                };
                run();
                return () => { alive = false; };
            }, [inputs.prompt]);

            return (
                <div style={{ minWidth: 260, minHeight: 140, position: "relative", overflow: "hidden", borderRadius: 12, background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)", padding: 16 }}>
                    <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 120, height: 120, background: "radial-gradient(circle, #6366f188 0%, transparent 70%)", filter: "blur(20px)" }} />
                    <div style={{ fontSize: 10, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>🎭 Live Stage</div>

                    {/* User bubble */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                        <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px", background: "#6366f1", color: "#fff", fontSize: 12, lineHeight: 1.4, wordBreak: "break-word" }}>
                            {inputs.prompt !== undefined ? "User message" : "…"}
                        </div>
                    </div>

                    {/* Assistant bubble */}
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{
                            maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#e0e7ff", color: "#312e81", fontSize: 12, lineHeight: 1.4,
                            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}>
                            {state.stage === "typing" && (
                                <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: `bounce 1s infinite ${i * 0.15}s` }} />
                                    ))}
                                </div>
                            )}
                            {state.stage === "sent" && state.reply}
                        </div>
                    </div>

                    <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
                </div>
            );
        },
    },
    {
        name: "BrainWave",
        category: "AI Agent",
        inputs: [{ id: "signal", name: "Signal" }],
        outputs: [{ id: "output", name: "Output", template: (_, s) => s.output ?? null }],
        defaultState: { output: null, active: false },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" /><path d="M12 8v8" /><path d="M8 12h8" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            const [tick, setTick] = useState(0);

            useEffect(() => {
                if (inputs.signal === undefined) { setState("active", false); return; }
                let alive = true;
                setState("active", true);
                const run = async () => {
                    try {
                        const ev = await evaluateJSONLang(inputs.signal);
                        if (!alive) return;
                        await new Promise(r => setTimeout(r, 1600));
                        if (!alive) return;
                        setState("output", ev);
                        setState("active", false);
                    } catch {
                        setState("active", false);
                    }
                };
                run();
                return () => { alive = false; };
            }, [inputs.signal]);

            useEffect(() => {
                if (!state.active) return;
                const iv = setInterval(() => setTick(t => t + 1), 80);
                return () => clearInterval(iv);
            }, [state.active]);

            const rings = [0, 1, 2, 3];
            return (
                <div style={{ minWidth: 220, minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {rings.map(i => (
                            <div key={i} style={{
                                position: "absolute", borderRadius: "50%", border: "2px solid #6366f1",
                                width: 40 + i * 28, height: 40 + i * 28,
                                opacity: state.active ? 0.35 + 0.15 * Math.sin((tick + i * 10) / 5) : 0.08,
                                transform: `scale(${state.active ? 1 + 0.03 * Math.sin((tick + i * 15) / 8) : 1})`,
                                transition: "opacity 0.3s", boxShadow: state.active ? "0 0 12px #6366f144" : "none",
                            }} />
                        ))}
                        <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: state.active ? "#6366f1" : "#e5e7eb",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                            boxShadow: state.active ? "0 0 20px #6366f1" : "none", transition: "all 0.4s",
                            zIndex: 2,
                        }}>
                            {state.active ? "⚡" : "💤"}
                        </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: state.active ? "#6366f1" : "#9ca3af", letterSpacing: 0.5 }}>
                        {state.active ? "Processing…" : state.output !== null ? "Complete" : "Idle"}
                    </div>
                    <div style={{ marginTop: 8, width: "100%" }}>
                        <Preview value={state.output} />
                    </div>
                </div>
            );
        },
    },
    {
        name: "ReasoningCards",
        category: "AI Agent",
        inputs: [{ id: "problem", name: "Problem" }],
        outputs: [{ id: "answer", name: "Answer", template: (_, s) => s.answer ?? null }],
        defaultState: { answer: null, cards: [], phase: "idle" },
        icon: () => (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            useEffect(() => {
                if (inputs.problem === undefined) { setState("phase", "idle"); setState("cards", []); return; }
                let alive = true;
                const run = async () => {
                    setState("phase", "thinking");
                    setState("cards", []);
                    try {
                        const ev = await evaluateJSONLang(inputs.problem);
                        const steps = [
                            { icon: "🔍", title: "Understand", text: `Received: ${String(ev).slice(0, 40)}…`, color: "#3b82f6" },
                            { icon: "🧩", title: "Break Down", text: "Splitting into sub-tasks…", color: "#8b5cf6" },
                            { icon: "⚙️", title: "Process", text: "Running inference…", color: "#f59e0b" },
                            { icon: "✅", title: "Conclude", text: "Result ready.", color: "#10b981" },
                        ];
                        for (let i = 0; i < steps.length; i++) {
                            if (!alive) return;
                            await new Promise(r => setTimeout(r, 600));
                            setState("cards", steps.slice(0, i + 1));
                        }
                        if (!alive) return;
                        setState("answer", ev);
                        setState("phase", "done");
                    } catch {
                        setState("phase", "error");
                    }
                };
                run();
                return () => { alive = false; };
            }, [inputs.problem]);

            return (
                <div className="w-full">
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>🧠 Chain of Thought</div>
                    {(state.cards ?? []).map((card: any, idx: number) => (
                        <div key={idx} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                            background: "#fff", borderLeft: `4px solid ${card.color}`, boxShadow: "0 1px 3px #0000000d",
                            animation: `slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.05}s both`,
                        }}>
                            <div style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{card.title}</div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{card.text}</div>
                            </div>
                        </div>
                    ))}
                    {state.phase === "done" && (
                        <div style={{ marginTop: 4, padding: 8, background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 11, color: "#166534", fontWeight: 600 }}>
                            🎉 Answer: <span style={{ fontWeight: 700 }}>{JSON.stringify(state.answer).slice(0, 60)}</span>
                        </div>
                    )}
                    <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }`}</style>
                </div>
            );
        },
    },
    {
        name: "SearchAgent",
        category: "AI Agent",
        inputs: [{ id: "query", name: "Search Query" }],
        outputs: [
            { id: "results", name: "Results", template: (_, s) => s.results ?? [] },
            { id: "queryUsed", name: "Query", template: (_, s) => s.queryUsed ?? "" },
            { id: "sources", name: "Sources", template: (_, s) => (s.results ?? []).map((r: any) => r.source) },
        ],
        defaultState: {
            results: [],
            queryUsed: "",
            phase: "idle", // idle | parsing | searching | structuring | done | error
            logs: [] as { engine: string; status: "pending" | "ok" | "fail"; detail?: string }[],
            error: null as string | null,
        },
        icon: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            const runSearch = async () => {
                if (inputs.query === undefined) {
                    setState("error", "Connect a query input");
                    return;
                }

                // 1. Evaluate input AST to plain text
                let queryText: string;
                try {
                    queryText = String(await evaluateJSONLang(inputs.query) ?? "");
                } catch (e: any) {
                    setState("error", `AST eval failed: ${e.message}`);
                    return;
                }
                if (!queryText.trim()) {
                    setState("error", "Empty query");
                    return;
                }

                setState("queryUsed", queryText);
                setState("phase", "parsing");
                setState("error", null);
                setState("results", []);
                setState("logs", []);

                await new Promise(r => setTimeout(r, 400)); // "thinking" beat
                setState("phase", "searching");

                // Unified result shape: { title, url, snippet, source, meta? }
                let found: any[] = [];
                const engines = [
                    {
                        name: "Wikipedia",
                        url: `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(queryText)}&limit=8&namespace=0&format=json&origin=*`,
                        parse: async (res: Response) => {
                            const json = await res.json();
                            const [, titles, descs, urls] = json;
                            return titles.map((t: string, i: number) => ({
                                title: t, url: urls[i], snippet: descs[i], source: "Wikipedia", meta: { type: "article" },
                            }));
                        },
                    },
                    {
                        name: "GitHub",
                        url: `https://api.github.com/search/repositories?per_page=6&q=${encodeURIComponent(queryText)}`,
                        parse: async (res: Response) => {
                            const json = await res.json();
                            return (json.items ?? []).map((item: any) => ({
                                title: item.full_name,
                                url: item.html_url,
                                snippet: item.description ?? "No description",
                                source: "GitHub",
                                meta: { stars: item.stargazers_count, language: item.language },
                            }));
                        },
                    },
                    {
                        name: "HackerNews",
                        url: `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(queryText)}&tags=story&hitsPerPage=6`,
                        parse: async (res: Response) => {
                            const json = await res.json();
                            return (json.hits ?? []).map((h: any) => ({
                                title: h.title,
                                url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
                                snippet: `by ${h.author} • ${h.points} points`,
                                source: "HackerNews",
                                meta: { author: h.author, points: h.points },
                            }));
                        },
                    },
                ];

                for (const eng of engines) {
                    setState("logs", [...(state.logs ?? []), { engine: eng.name, status: "pending" }]);
                    try {
                        const res = await fetch(eng.url, { method: "GET", headers: { Accept: "application/json" } });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const parsed = await eng.parse(res);
                        if (parsed.length > 0) {
                            found = [...found, ...parsed];
                            setState("logs", prev => prev.map(l => l.engine === eng.name ? { ...l, status: "ok", detail: `${parsed.length} hits` } : l));
                            // Continue to collect more, or break if you want fastest-only
                        } else {
                            setState("logs", prev => prev.map(l => l.engine === eng.name ? { ...l, status: "ok", detail: "0 hits" } : l));
                        }
                    } catch (e: any) {
                        setState("logs", prev => prev.map(l => l.engine === eng.name ? { ...l, status: "fail", detail: e.message } : l));
                    }
                    await new Promise(r => setTimeout(r, 300));
                }

                if (found.length === 0) {
                    setState("phase", "error");
                    setState("error", "All engines returned zero results or failed.");
                    return;
                }

                setState("phase", "structuring");
                await new Promise(r => setTimeout(r, 300));
                setState("results", found);
                setState("phase", "done");
            };

            const phaseMeta: Record<string, { icon: string; label: string; color: string }> = {
                idle: { icon: "◆", label: "Ready", color: "text-slate-400" },
                parsing: { icon: "◈", label: "Parsing query", color: "text-indigo-400" },
                searching: { icon: "◉", label: "Searching", color: "text-amber-400" },
                structuring: { icon: "◆", label: "Structuring", color: "text-indigo-400" },
                done: { icon: "✓", label: "Complete", color: "text-emerald-500" },
                error: { icon: "✕", label: "Failed", color: "text-rose-500" },
            };
            const meta = phaseMeta[state.phase as string] || phaseMeta.idle;

            return (
                <div className="w-80 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono ${meta.color}`}>{meta.icon}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Search Agent</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${state.phase === "done" ? "bg-emerald-950 border-emerald-800 text-emerald-400" : state.phase === "error" ? "bg-rose-950 border-rose-800 text-rose-400" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                            {meta.label}
                        </span>
                    </div>

                    {/* Query preview */}
                    <div className="px-4 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Input AST</div>
                        <div className="font-mono text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 truncate" title={JSON.stringify(inputs.query)}>
                            {JSON.stringify(inputs.query)}
                        </div>
                    </div>

                    {/* Engine log */}
                    {(state.logs ?? []).length > 0 && (
                        <div className="px-4 pb-2 space-y-1.5">
                            {(state.logs ?? []).map((log, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === "ok" ? "bg-emerald-500" : log.status === "fail" ? "bg-rose-500" : "bg-amber-400 animate-pulse"}`} />
                                        <span className="text-slate-300 font-medium">{log.engine}</span>
                                    </div>
                                    <span className={`font-mono text-[10px] ${log.status === "ok" ? "text-emerald-400" : log.status === "fail" ? "text-rose-400" : "text-amber-400"}`}>
                                        {log.status === "pending" ? "…" : log.detail || log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {state.error && (
                        <div className="px-4 pb-3">
                            <div className="text-[11px] text-rose-400 bg-rose-950/50 border border-rose-900 rounded-lg px-3 py-2">
                                {state.error}
                            </div>
                        </div>
                    )}

                    {/* Action */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={runSearch}
                            disabled={state.phase === "searching" || state.phase === "parsing" || state.phase === "structuring"}
                            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold tracking-wide transition-colors"
                        >
                            {state.phase === "searching" || state.phase === "parsing" || state.phase === "structuring" ? "Running…" : "▶ Execute Search"}
                        </button>
                    </div>

                    {/* Results preview */}
                    {state.phase === "done" && (state.results ?? []).length > 0 && (
                        <div className="border-t border-slate-800 bg-slate-950">
                            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                                <span>Preview</span>
                                <span className="text-slate-600">{(state.results ?? []).length} items</span>
                            </div>
                            <div className="px-4 pb-4 max-h-48 overflow-y-auto space-y-2">
                                {(state.results ?? []).slice(0, 4).map((r: any, i: number) => (
                                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 hover:border-slate-700 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-semibold text-slate-200 truncate pr-2">{r.title}</span>
                                            <span className="text-[10px] font-mono text-slate-500 shrink-0">{r.source}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{r.snippet}</div>
                                    </div>
                                ))}
                                {(state.results ?? []).length > 4 && (
                                    <div className="text-center text-[10px] text-slate-600 font-mono">+ {(state.results ?? []).length - 4} more</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        name: "ThinkLog",
        category: "AI Agent",
        inputs: [{ id: "expr", name: "Expression" }],
        outputs: [{ id: "result", name: "Result", template: (_, s) => s.result ?? null }],
        defaultState: { result: null, status: "idle" },
        icon: () => (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
        visual: ({ inputs, state, setState }) => {
            const [logs, setLogs] = useState<{ time: string; msg: string; type: "info" | "ok" | "error" }[]>([]);

            useEffect(() => {
                if (inputs.expr === undefined) {
                    setLogs([]);
                    setState("status", "idle");
                    return;
                }
                let alive = true;

                const tick = async () => {
                    if (!alive) return;
                    setState("status", "running");

                    setLogs(prev => [...prev, {
                        time: new Date().toLocaleTimeString(),
                        msg: "Evaluating AST…",
                        type: "info",
                    }].slice(-12));

                    try {
                        const t0 = performance.now();
                        const ev = await evaluateJSONLang(inputs.expr);
                        const t1 = performance.now();
                        if (!alive) return;

                        const text = JSON.stringify(ev);
                        setLogs(prev => [...prev, {
                            time: new Date().toLocaleTimeString(),
                            msg: `↳ ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}  (${(t1 - t0).toFixed(0)}ms)`,
                            type: "ok",
                        }].slice(-12));

                        setState("result", ev);
                        setState("status", "done");
                    } catch (e: any) {
                        if (!alive) return;
                        setLogs(prev => [...prev, {
                            time: new Date().toLocaleTimeString(),
                            msg: `↳ ${e.message || String(e)}`,
                            type: "error",
                        }].slice(-12));
                        setState("status", "error");
                    }
                };

                tick(); // run immediately, then every 1000 ms
                const iv = setInterval(tick, 1000);
                return () => { alive = false; clearInterval(iv); };
            }, [inputs.expr]);

            return (
                <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Think Log</span>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${state.status === "running" ? "bg-amber-400 animate-pulse" :
                                    state.status === "done" ? "bg-emerald-500" :
                                        state.status === "error" ? "bg-rose-500" : "bg-slate-300"
                                }`} />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">{state.status}</span>
                        </div>
                    </div>

                    <Preview value={inputs.expr} />

                    <div className="bg-slate-950 rounded-md border border-slate-800 p-2 font-mono text-[11px] leading-relaxed h-32 overflow-y-auto space-y-1">
                        {logs.length === 0 && (
                            <span className="text-slate-600 italic">Waiting for expression…</span>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                                <span className={
                                    log.type === "ok" ? "text-emerald-400" :
                                        log.type === "error" ? "text-rose-400" : "text-slate-400"
                                }>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>tick: 1000 ms</span>
                        <button
                            onClick={() => setLogs([])}
                            className="text-slate-500 hover:text-slate-700 font-semibold transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            );
        },
    }
];
