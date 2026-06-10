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
  
 
  
    
];
