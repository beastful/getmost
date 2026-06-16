// features/graph-editor/lib/nodes.ts

import React, { useEffect, useMemo, useState } from "react";
import { JSONLangEngine } from "../JLR/json-lang-engine";
import { AlertTriangle, Boxes, Building2, Command, GitMerge, PlayIcon, ScanSearch, ShieldCheck, ShieldIcon, Table, Table2, Text } from "lucide-react";
import {
    Send,
    Bot,
    Brain,
    MessageCircle,
    Mail,
    Sheet,
    Filter,
    Split,
    Merge,
    FileJson,
    Type,
    Globe,
    LayoutTemplate,
    FileText,
    Workflow,
    Database,
    ArrowRightLeft,
    Rows3,
} from "lucide-react";

const engine = new JSONLangEngine({
    debug: false,
    trace: false,
    maxGas: 100000,
});

type JSONValue =
    | null
    | string
    | number
    | boolean
    | JSONValue[]
    | { [key: string]: JSONValue };

type TemplateFn = (
    inputs: Record<string, any>,
    state: Record<string, any>
) => any;

type TemplateValue = any;
type NodeTemplate = TemplateValue | TemplateFn;


const GmailIcon = ({
    size = 1,
    color = '#000000',
    strokeWidth = 2,
    background = 'transparent',
    opacity = 1,
    rotation = 0,
    shadow = 0,
    flipHorizontal = false,
    flipVertical = false,
    padding = 0
}) => {
    const transforms = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (flipHorizontal) transforms.push('scaleX(-1)');
    if (flipVertical) transforms.push('scaleY(-1)');

    const viewBoxSize = 24 + (padding * 2);
    const viewBoxOffset = -padding;
    const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={viewBox}
            width={size}
            height={size}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                opacity,
                filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
                backgroundColor: background !== 'transparent' ? background : undefined
            }}
        >
            <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z" /><path fill="#34A853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837l-27.026 25.798z" /><path fill="#EA4335" d="m58.182 93.14l-4.174-38.647l4.174-36.989L128 69.868l69.818-52.364l4.669 34.992l-4.669 40.644L128 145.504z" /><path fill="#FBBC04" d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z" /><path fill="#C5221F" d="m0 49.504l26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z" />
        </svg>
    );
};

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
    template: NodeTemplate;
}

export interface NodeVisualProps {
    state: Record<string, any>;
    setState: (key: string, val: any) => void;
    inputs: Record<string, any>;
    getTemplate: (outputId: string) => any;
    getInputTemplate?: (inputId: string) => any;
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
    visual: React.FC<NodeVisualProps>;
}

type AnalysisIssue = {
    level: "info" | "warning" | "error";
    code: string;
    message: string;
    path: string;
};

type FunctionDoc = {
    name: string;
    summary: string;
    args?: string[];
    returns?: string;
    category: string;
    example?: any;
};

const FUNCTION_DOCS: FunctionDoc[] = [];

function addFunctionDoc(doc: FunctionDoc) {
    if (!FUNCTION_DOCS.some((d) => d.name === doc.name)) {
        FUNCTION_DOCS.push(doc);
    }
}

let extraFunctionsRegistered = false;

function registerExtraJSONLangFunctions() {
    if (extraFunctionsRegistered) return;
    extraFunctionsRegistered = true;

    engine.registerNative(
        "merge",
        (args) => args.reduce((acc, obj) => ({ ...acc, ...(obj ?? {}) }), {}),
        { args: ["object"], ret: "object", variadic: true }
    );
    addFunctionDoc({
        name: "merge",
        summary: "Merge any number of objects from left to right.",
        args: ["...object"],
        returns: "object",
        category: "Object",
        example: ["merge", ["object", "a", 1], ["object", "b", 2]],
    });

    engine.registerNative(
        "build_query",
        (args) => {
            const input = args[0] ?? {};
            const params = new URLSearchParams();

            const appendValue = (key: string, value: any) => {
                if (value === undefined || value === null) return;
                if (Array.isArray(value)) {
                    for (const item of value) appendValue(key, item);
                    return;
                }
                params.append(key, String(value));
            };

            for (const [key, value] of Object.entries(input)) {
                appendValue(key, value);
            }
            return params.toString();
        },
        { args: ["object"], ret: "string" }
    );
    addFunctionDoc({
        name: "build_query",
        summary: "Build a URL query string from an object.",
        args: ["object"],
        returns: "string",
        category: "HTTP",
        example: ["build_query", ["object", "page", 1, "q", "hello"]],
    });

    engine.registerNative(
        "http_request",
        async (args) => {
            const config = args[0] ?? {};
            const method = String(config.method ?? "GET").toUpperCase();
            const responseType = String(config.responseType ?? "json");
            const query = config.query ?? {};
            const headersInput = config.headers ?? {};
            const body = config.body;

            const url = new URL(String(config.url ?? ""), typeof window !== "undefined" ? window.location.origin : "http://localhost");
            const queryString = new URLSearchParams();

            const appendQuery = (key: string, value: any) => {
                if (value === undefined || value === null) return;
                if (Array.isArray(value)) {
                    for (const item of value) appendQuery(key, item);
                    return;
                }
                queryString.append(key, String(value));
            };

            for (const [key, value] of Object.entries(query)) {
                appendQuery(key, value);
            }

            const builtQuery = queryString.toString();
            if (builtQuery) {
                const existing = url.search ? url.search.slice(1) + "&" : "";
                url.search = existing + builtQuery;
            }

            const headers = new Headers();
            for (const [k, v] of Object.entries(headersInput)) {
                if (v !== undefined && v !== null) headers.set(k, String(v));
            }

            const init: RequestInit = {
                method,
                headers,
            };

            if (method !== "GET" && method !== "HEAD" && body !== undefined) {
                const isStringBody = typeof body === "string";
                const hasContentType = headers.has("content-type");

                if (isStringBody) {
                    init.body = body;
                } else {
                    if (!hasContentType) headers.set("content-type", "application/json");
                    init.body = JSON.stringify(body);
                }
            }

            const response = await fetch(url.toString(), init);

            const responseHeaders = Object.fromEntries(response.headers.entries());

            let data: any;
            if (responseType === "text") {
                data = await response.text();
            } else if (responseType === "blob") {
                data = await response.blob();
            } else if (responseType === "arrayBuffer") {
                data = await response.arrayBuffer();
            } else {
                const text = await response.text();
                try {
                    data = text ? JSON.parse(text) : null;
                } catch {
                    data = text;
                }
            }

            if (!response.ok) {
                const err: any = new Error(`HTTP ${response.status} ${response.statusText}`);
                err.status = response.status;
                err.statusText = response.statusText;
                err.url = url.toString();
                err.headers = responseHeaders;
                err.data = data;
                throw err;
            }

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                headers: responseHeaders,
                data,
            };
        },
        { args: ["object"], ret: "object" }
    );
    addFunctionDoc({
        name: "http_request",
        summary: "Execute an HTTP request with query, headers, body, and parsed response.",
        args: ["object"],
        returns: "object",
        category: "HTTP",
        example: [
            "http_request",
            [
                "object",
                "url",
                "https://jsonplaceholder.typicode.com/posts",
                "method",
                "GET",
                "query",
                ["object", "userId", 1],
            ],
        ],
    });

    engine.registerNative(
        "json_stringify_pretty",
        (args) => JSON.stringify(args[0], null, Number(args[1] ?? 2)),
        { args: ["any", "number"], ret: "string" }
    );
    addFunctionDoc({
        name: "json_stringify_pretty",
        summary: "Stringify a value as formatted JSON.",
        args: ["value", "space"],
        returns: "string",
        category: "JSON",
        example: ["json_stringify_pretty", ["object", "a", 1], 2],
    });

    engine.registerNative(
        "json_parse_safe",
        (args) => {
            try {
                return JSON.parse(String(args[0] ?? ""));
            } catch {
                return null;
            }
        },
        { args: ["string"], ret: "any" }
    );
    addFunctionDoc({
        name: "json_parse_safe",
        summary: "Parse JSON and return null on failure.",
        args: ["string"],
        returns: "any",
        category: "JSON",
        example: ["json_parse_safe", "{\"a\":1}"],
    });

    engine.registerNative(
        "coalesce",
        (args) => {
            for (const arg of args) {
                if (arg !== null && arg !== undefined) return arg;
            }
            return null;
        },
        { args: ["any"], ret: "any", variadic: true }
    );
    addFunctionDoc({
        name: "coalesce",
        summary: "Return the first non-null and non-undefined argument.",
        args: ["...any"],
        returns: "any",
        category: "Logic",
        example: ["coalesce", null, undefined, "fallback"],
    });

    engine.registerNative(
        "pick",
        (args) => {
            const obj = args[0] ?? {};
            const keys = args.slice(1);
            const out: Record<string, any> = {};
            for (const key of keys) {
                if (key in obj) out[key] = obj[key];
            }
            return out;
        },
        { args: ["object"], ret: "object", variadic: true }
    );
    addFunctionDoc({
        name: "pick",
        summary: "Pick selected keys from an object.",
        args: ["object", "...keys"],
        returns: "object",
        category: "Object",
        example: ["pick", ["object", "a", 1, "b", 2], "a"],
    });

    engine.registerNative(
        "omit",
        (args) => {
            const obj = { ...(args[0] ?? {}) };
            const keys = new Set(args.slice(1));
            for (const key of keys) delete obj[key];
            return obj;
        },
        { args: ["object"], ret: "object", variadic: true }
    );
    addFunctionDoc({
        name: "omit",
        summary: "Return a copy of an object without selected keys.",
        args: ["object", "...keys"],
        returns: "object",
        category: "Object",
        example: ["omit", ["object", "a", 1, "b", 2], "b"],
    });

    engine.registerNative(
        "template",
        (args) => {
            const raw = String(args[0] ?? "");
            const vars = (args[1] ?? {}) as Record<string, any>;
            return raw.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
                const parts = key.split(".");
                let current: any = vars;
                for (const part of parts) current = current?.[part];
                return current == null ? "" : String(current);
            });
        },
        { args: ["string", "object"], ret: "string" }
    );
    addFunctionDoc({
        name: "template",
        summary: "Interpolate {{path}} placeholders from an object.",
        args: ["string", "object"],
        returns: "string",
        category: "Text",
        example: ["template", "Hello {{user.name}}", ["object", "user", ["object", "name", "Ada"]]],
    });

    engine.registerNative(
        "to_json_schema",
        (args) => {
            const infer = (value: any): any => {
                if (value === null) return { type: "null" };
                if (Array.isArray(value)) {
                    return {
                        type: "array",
                        items: value.length ? infer(value[0]) : {},
                    };
                }
                const t = typeof value;
                if (t === "string" || t === "number" || t === "boolean") return { type: t };
                if (t === "object") {
                    const properties: Record<string, any> = {};
                    const required: string[] = [];
                    for (const [k, v] of Object.entries(value)) {
                        properties[k] = infer(v);
                        if (v !== undefined) required.push(k);
                    }
                    return { type: "object", properties, required };
                }
                return { type: "string" };
            };
            return infer(args[0]);
        },
        { args: ["any"], ret: "object" }
    );
    addFunctionDoc({
        name: "to_json_schema",
        summary: "Infer a simple JSON schema from a sample value.",
        args: ["value"],
        returns: "object",
        category: "Analysis",
        example: ["to_json_schema", ["object", "name", "Ada", "age", 10]],
    });

    engine.registerNative(
        "analyze_expr",
        (args) => {
            const expr = args[0];
            const issues: AnalysisIssue[] = [];

            const knownFunctions = new Set<string>([
                ...Object.keys((engine as any).functions ?? {}),
                ...Object.keys((engine as any).specialForms ?? {}),
            ]);

            const visit = (node: any, path: string) => {
                if (node === null || typeof node !== "object") return;

                if (Array.isArray(node)) {
                    if (node.length === 0) {
                        issues.push({
                            level: "error",
                            code: "empty-expression",
                            message: "Empty expression.",
                            path,
                        });
                        return;
                    }

                    const head = node[0];
                    if (typeof head !== "string") {
                        issues.push({
                            level: "error",
                            code: "invalid-head",
                            message: "Expression head must be a string.",
                            path,
                        });
                    } else if (!knownFunctions.has(head)) {
                        issues.push({
                            level: "warning",
                            code: "unknown-function",
                            message: `Unknown function or special form "${head}".`,
                            path,
                        });
                    }

                    if (head === "if" && node.length < 4) {
                        issues.push({
                            level: "error",
                            code: "if-arity",
                            message: `"if" expects condition, then, else.`,
                            path,
                        });
                    }

                    if (head === "http_request" && typeof node[1] !== "object") {
                        issues.push({
                            level: "warning",
                            code: "http-config",
                            message: `"http_request" should receive a config object.`,
                            path,
                        });
                    }

                    node.forEach((child, i) => visit(child, `${path}/${i}`));
                    return;
                }

                for (const [k, v] of Object.entries(node)) {
                    visit(v, `${path}/${k}`);
                }
            };

            visit(expr, "");
            return {
                ok: !issues.some((i) => i.level === "error"),
                issues,
                issueCount: issues.length,
            };
        },
        { args: ["any"], ret: "object" }
    );
    addFunctionDoc({
        name: "analyze_expr",
        summary: "Perform static analysis on a JSON-Lang expression.",
        args: ["expression"],
        returns: "object",
        category: "Analysis",
        example: ["analyze_expr", ["sum", 1, 2]],
    });

    engine.registerNative(
        "generate_docs",
        (args) => {
            const title = String(args[0] ?? "JSON-Lang Docs");
            const includeExamples = args[1] !== false;

            const groups = new Map<string, FunctionDoc[]>();
            for (const doc of FUNCTION_DOCS) {
                const arr = groups.get(doc.category) ?? [];
                arr.push(doc);
                groups.set(doc.category, arr);
            }

            const lines: string[] = [];
            lines.push(`# ${title}`);
            lines.push("");
            lines.push(`Generated function documentation.`);
            lines.push("");

            for (const [category, docs] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
                lines.push(`## ${category}`);
                lines.push("");
                for (const doc of docs.sort((a, b) => a.name.localeCompare(b.name))) {
                    lines.push(`### ${doc.name}`);
                    lines.push("");
                    lines.push(doc.summary);
                    lines.push("");
                    if (doc.args?.length) lines.push(`- Args: ${doc.args.join(", ")}`);
                    if (doc.returns) lines.push(`- Returns: ${doc.returns}`);
                    if (includeExamples && doc.example !== undefined) {
                        lines.push(`- Example: \`${JSON.stringify(doc.example)}\``);
                    }
                    lines.push("");
                }
            }

            return lines.join("\n");
        },
        { args: ["string", "boolean"], ret: "string" }
    );
    addFunctionDoc({
        name: "generate_docs",
        summary: "Generate Markdown documentation for registered helper functions.",
        args: ["title", "includeExamples"],
        returns: "string",
        category: "Analysis",
        example: ["generate_docs", "My DSL Docs", true],
    });

    engine.registerNative(
        "llm_prompt_pack",
        (args) => {
            const system = args[0] ?? "";
            const user = args[1] ?? "";
            const context = args[2] ?? null;
            return {
                system,
                user,
                context,
                prompt: [system, context ? `Context: ${JSON.stringify(context)}` : "", user]
                    .filter(Boolean)
                    .join("\n\n"),
            };
        },
        { args: ["string", "string", "any"], ret: "object" }
    );
    addFunctionDoc({
        name: "llm_prompt_pack",
        summary: "Build a structured AI prompt payload from system, user, and context.",
        args: ["system", "user", "context"],
        returns: "object",
        category: "AI",
        example: ["llm_prompt_pack", "You are helpful", "Summarize this", ["object", "topic", "Graph"]],
    });

    engine.registerNative(
        "agent_result",
        (args) => ({
            ok: true,
            model: args[0] ?? "unknown",
            prompt: args[1] ?? null,
            tools: args[2] ?? [],
            memory: args[3] ?? null,
            outputMode: args[4] ?? "text",
        }),
        { args: ["string", "any", "any", "any", "string"], ret: "object" }
    );
    addFunctionDoc({
        name: "agent_result",
        summary: "Create a structured agent request/result envelope.",
        args: ["model", "prompt", "tools", "memory", "outputMode"],
        returns: "object",
        category: "AI",
        example: ["agent_result", "gpt-4o-mini", "Hello", ["array"], null, "text"],
    });
}

registerExtraJSONLangFunctions();



// UI primitives
const L: React.FC<{ text: string }> = ({ text }) => (
    <div
        style={{
            fontSize: 10,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 4,
            fontWeight: 700,
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
            borderRadius: 8,
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

const Txt: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        style={{
            width: "100%",
            minHeight: 72,
            background: "#ffffff",
            border: "2px solid #e5e7eb",
            color: "#111827",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            fontWeight: 500,
            resize: "vertical",
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
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            outline: "none",
            fontFamily: "inherit",
            cursor: "pointer",
            fontWeight: 500,
            ...(props.style as any),
        }}
    />
);

const GoogleSheetsIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path fill="#0F9D58" d="M29 4H14a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V13L29 4Z" />
        <path fill="#fff" fillRule="evenodd" d="M29 4v9h9L29 4Z" clipRule="evenodd" opacity="0.9" />
        <rect x="16" y="18" width="16" height="14" rx="1.5" fill="#fff" opacity="0.95" />
        <path stroke="#0F9D58" strokeWidth="1.8" d="M16 23h16M16 28h16M21.33 18v14M26.66 18v14" />
    </svg>
);

const GPTLiteIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
            <linearGradient id="gptLiteGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
        </defs>
        <rect x="6" y="6" width="36" height="36" rx="12" fill="url(#gptLiteGrad)" />
        <path
            d="M24 14c3.2 0 5.8 2.6 5.8 5.8v.5h.5c3.2 0 5.7 2.6 5.7 5.7 0 3.2-2.5 5.8-5.7 5.8h-1.1l-.5.9a5.8 5.8 0 0 1-10.1 0l-.5-.9h-1.1A5.8 5.8 0 0 1 11.3 26c0-3.1 2.5-5.7 5.7-5.7h.5v-.5A5.8 5.8 0 0 1 24 14Z"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M19 19.5 29 28.5M29 19.5l-10 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

const Card: React.FC<{ tone?: "default" | "ai" | "warn"; children: React.ReactNode }> = ({
    tone = "default",
    children,
}) => {
    const palette =
        tone === "ai"
            ? {
                bg: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
                border: "#c7d2fe",
            }
            : tone === "warn"
                ? {
                    bg: "#fff7ed",
                    border: "#fdba74",
                }
                : {
                    bg: "#f9fafb",
                    border: "#e5e7eb",
                };

    return (
        <div
            style={{
                padding: 10,
                borderRadius: 12,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
            }}
        >
            {children}
        </div>
    );
};

const Preview: React.FC<{ value: any }> = ({ value }) => (
    <pre
        style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 10,
            color: "#6b7280",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            border: "1px solid #e5e7eb",
            maxHeight: 180,
        }}
        title={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    >
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
);

engine.registerNative(
    "google_sheets_action",
    (args) => ({
        kind: "google-sheets-action",
        app: "google-sheets",
        action: args[0] ?? "append",
        spreadsheetId: args[1] ?? "",
        range: args[2] ?? "Sheet1!A:Z",
        values: args[3] ?? [],
        valueInputOption: args[4] ?? "USER_ENTERED",
        majorDimension: args[5] ?? "ROWS",
    }),
    { args: ["string", "string", "string", "any", "string", "string"], ret: "object" }
);
addFunctionDoc({
    name: "google_sheets_action",
    summary: "Create a Google Sheets action payload for append or update operations.",
    args: ["action", "spreadsheetId", "range", "values", "valueInputOption", "majorDimension"],
    returns: "object",
    category: "Apps",
    example: ["google_sheets_action", "append", "sheet-id", "Sheet1!A:C", [["a", "b", "c"]], "USER_ENTERED", "ROWS"],
});

engine.registerNative(
    "rows_from_object_array",
    (args) => {
        const list = Array.isArray(args[0]) ? args[0] : [];
        const includeHeader = args[1] !== false;
        if (!list.length) return includeHeader ? [] : [];

        const keys = Array.from(
            list.reduce((set, item) => {
                if (item && typeof item === "object" && !Array.isArray(item)) {
                    Object.keys(item).forEach((k) => set.add(k));
                }
                return set;
            }, new Set<string>())
        );

        const rows = list.map((item) => keys.map((key) => item?.[key] ?? ""));
        return includeHeader ? [keys, ...rows] : rows;
    },
    { args: ["array", "boolean"], ret: "array" }
);
addFunctionDoc({
    name: "rows_from_object_array",
    summary: "Convert an array of objects into Google Sheets row arrays.",
    args: ["items", "includeHeader"],
    returns: "array",
    category: "Apps",
    example: ["rows_from_object_array", [["object", "name", "Ada", "age", 10]], true],
});

engine.registerNative(
    "model_def",
    (args) => ({
        kind: "model",
        provider: args[0] ?? "openai",
        model: args[1] ?? "gpt-4o-mini",
        temperature: args[2] ?? 0.2,
        maxTokens: args[3] ?? 1024,
        label: args[4] ?? "Light Model",
    }),
    { args: ["string", "string", "number", "number", "string"], ret: "object" }
);
addFunctionDoc({
    name: "model_def",
    summary: "Create a lightweight AI model descriptor.",
    args: ["provider", "model", "temperature", "maxTokens", "label"],
    returns: "object",
    category: "AI",
    example: ["model_def", "openai", "gpt-4o-mini", 0.2, 1024, "GPT Light"],
});

const SparkIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7Z" />
    </svg>
);

const BrainIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5V7a3 3 0 0 0-2 2.83A3 3 0 0 0 6 12.68V14a3 3 0 0 0 3 3h1" />
        <path d="M14.5 2A3.5 3.5 0 0 1 18 5.5V7a3 3 0 0 1 2 2.83A3 3 0 0 1 18 12.68V14a3 3 0 0 1-3 3h-1" />
        <path d="M12 2v20" />
        <path d="M9 10h.01M15 10h.01" />
    </svg>
);

const DocIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
);

const ApiIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
);

const FunctionIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17c0-2.5 2-4 4.5-4H11V7.5C11 5 13 3 15.5 3S20 5 20 7.5 18 12 15.5 12H13" />
        <path d="M4 7h6M4 12h3M4 17h6" />
    </svg>
);

const CATEGORY_STYLES = {
    Trigger: { bg: "#eff6ff", border: "#bfdbfe", badge: "#1d4ed8" },
    "AI Models": { bg: "#f5f3ff", border: "#d8b4fe", badge: "#6d28d9" },
    Apps: { bg: "#f0fdf4", border: "#bbf7d0", badge: "#166534" },
    Logic: { bg: "#fff7ed", border: "#fed7aa", badge: "#c2410c" },
    Data: { bg: "#f9fafb", border: "#e5e7eb", badge: "#374151" },
};

const NodeCard: React.FC<{
    title: string;
    category: keyof typeof CATEGORY_STYLES;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, category, icon, children }) => {
    const tone = CATEGORY_STYLES[category];
    return (
        <div
            style={{
                minWidth: 240,
                borderRadius: 14,
                border: `1px solid ${tone?.border}`,
                background: "#fff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: tone?.bg,
                    borderBottom: `1px solid ${tone?.border}`,
                }}
            >
                {icon}
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{title}</div>
                <div
                    style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: 700,
                        color: tone?.badge,
                        background: "#fff",
                        border: `1px solid ${tone?.border}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                    }}
                >
                    {category}
                </div>
            </div>
            <div style={{ padding: 12 }}>{children}</div>
        </div>
    );
};

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: 999,
    background: bg,
    color,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
});

export const NODES: NodeDef[] = [
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
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
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
        name: "Object",
        category: "Basic",
        width: 250,
        inputs: [],
        outputs: [
            {
                id: "out",
                name: "Object",
                template: (_, s) => ["json_parse_safe", s.jsonText],
            },
        ],
        defaultState: { jsonText: '{ "name": "hello", "count": 1 }' },
        icon: FunctionIcon,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <L text="JSON Object" />
                <Txt value={state.jsonText} onChange={(e) => setState("jsonText", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </div>
        ),
    },
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
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
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
        name: "TemplateText",
        category: "Text",
        inputs: [{ id: "vars", name: "Vars" }],
        outputs: [{ id: "out", name: "Text", template: (i, s) => ["template", s.template, i.vars ?? {}] }],
        defaultState: { template: "Hello {{name}}" },
        icon: SparkIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="default">
                <L text="Template" />
                <Txt value={state.template} onChange={(e) => setState("template", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "PromptTemplate",
        category: "AI",
        width: 280,
        inputs: [
            { id: "context", name: "Context" },
            { id: "user", name: "User" },
        ],
        outputs: [
            {
                id: "out",
                name: "Prompt Pack",
                template: (i, s) => ["llm_prompt_pack", s.system, i.user ?? s.userFallback, i.context ?? null],
            },
        ],
        defaultState: {
            system: "You are a helpful AI assistant.",
            userFallback: "Summarize this input.",
        },
        icon: BrainIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={badgeStyle("#ddd6fe", "#5b21b6")}>
                    <SparkIcon />
                    AI Prompt
                </div>
                <div style={{ height: 8 }} />
                <L text="System" />
                <Txt value={state.system} onChange={(e) => setState("system", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Fallback User Prompt" />
                <Txt value={state.userFallback} onChange={(e) => setState("userFallback", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "ChatModel",
        category: "AI",
        inputs: [],
        outputs: [
            {
                id: "out",
                name: "Model",
                template: (_, s) => s.model,
            },
        ],
        defaultState: { model: "gpt-4o-mini" },
        icon: BrainIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={badgeStyle("#e0e7ff", "#3730a3")}>Model</div>
                <div style={{ height: 8 }} />
                <Sel value={state.model} onChange={(e) => setState("model", e.target.value)}>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                    <option value="claude-sonnet">claude-sonnet</option>
                    <option value="local-model">local-model</option>
                </Sel>
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "ToolList",
        category: "AI",
        inputs: [
            { id: "a", name: "Tool A" },
            { id: "b", name: "Tool B" },
            { id: "c", name: "Tool C" },
        ],
        outputs: [
            {
                id: "out",
                name: "Tools",
                template: (i) => ["array", i.a, i.b, i.c],
            },
        ],
        defaultState: {},
        icon: SparkIcon,
        visual: ({ getTemplate }) => (
            <Card tone="ai">
                <div style={badgeStyle("#ede9fe", "#6d28d9")}>Tools</div>
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "MemoryBuffer",
        category: "AI",
        inputs: [{ id: "input", name: "Input" }],
        outputs: [
            {
                id: "out",
                name: "Memory",
                template: (i, s) => [
                    "object",
                    "kind",
                    "buffer",
                    "key",
                    s.key,
                    "value",
                    i.input ?? null,
                ],
            },
        ],
        defaultState: { key: "conversation" },
        icon: BrainIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={badgeStyle("#fae8ff", "#a21caf")}>Memory</div>
                <div style={{ height: 8 }} />
                <L text="Key" />
                <In value={state.key} onChange={(e) => setState("key", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "AIAgent",
        category: "AI",
        width: 280,
        inputs: [
            { id: "model", name: "Model" },
            { id: "prompt", name: "Prompt" },
            { id: "tools", name: "Tools" },
            { id: "memory", name: "Memory" },
        ],
        outputs: [
            {
                id: "out",
                name: "Agent Task",
                template: (i, s) => [
                    "agent_result",
                    ["coalesce", i.model, s.modelFallback],
                    i.prompt ?? null,
                    i.tools ?? [],
                    i.memory ?? null,
                    s.outputMode,
                ],
            },
        ],
        defaultState: {
            modelFallback: "gpt-4o-mini",
            outputMode: "text",
        },
        icon: BrainIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 8,
                    }}
                >
                    <div style={badgeStyle("linear-gradient(135deg, #dbeafe, #ede9fe)", "#4338ca")}>AI Agent</div>
                    <SparkIcon />
                </div>
                <L text="Output Mode" />
                <Sel value={state.outputMode} onChange={(e) => setState("outputMode", e.target.value)}>
                    <option value="text">text</option>
                    <option value="json">json</option>
                    <option value="tools">tools</option>
                </Sel>
                <div style={{ height: 8 }} />
                <L text="Fallback Model" />
                <In value={state.modelFallback} onChange={(e) => setState("modelFallback", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "HttpAdvanced",
        category: "API",
        width: 300,
        inputs: [
            { id: "body", name: "Body" },
            { id: "query", name: "Query" },
            { id: "headers", name: "Headers" },
        ],
        outputs: [
            {
                id: "out",
                name: "Response",
                template: (i, s) => [
                    "http_request",
                    [
                        "object",
                        "url",
                        ["concat", s.baseUrl, s.path],
                        "method",
                        s.method,
                        "query",
                        i.query ?? ["object"],
                        "headers",
                        ["merge", s.defaultHeaders ?? {}, i.headers ?? {}],
                        "body",
                        i.body ?? null,
                        "responseType",
                        s.responseType,
                    ],
                ],
            },
        ],
        defaultState: {
            method: "GET",
            responseType: "json",
            baseUrl: "https://jsonplaceholder.typicode.com",
            path: "/posts/1",
            defaultHeaders: {},
        },
        icon: ApiIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="default">
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <Sel style={{ flex: 1 }} value={state.method} onChange={(e) => setState("method", e.target.value)}>
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                        <option>PATCH</option>
                    </Sel>
                    <Sel style={{ width: 110 }} value={state.responseType} onChange={(e) => setState("responseType", e.target.value)}>
                        <option value="json">json</option>
                        <option value="text">text</option>
                    </Sel>
                </div>
                <L text="Base URL" />
                <In value={state.baseUrl} onChange={(e) => setState("baseUrl", e.target.value)} placeholder="https://api.example.com" style={{ marginBottom: 6 }} />
                <L text="Path" />
                <In value={state.path} onChange={(e) => setState("path", e.target.value)} placeholder="/v1/resource" />
                <div style={{ marginTop: 8 }}>
                    <L text="Request AST" />
                    <Preview value={getTemplate("out")} />
                </div>
            </Card>
        ),
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
                    const parts = s.selectedPath ? s.selectedPath.split(".").filter(Boolean) : [];
                    return ["get_path", i.data ?? null, ...parts];
                },
            },
        ],
        defaultState: { selectedPath: "" },
        icon: ApiIcon,
        visual: ({ state, setState, getInputTemplate, getTemplate }) => {
            const [jsonData, setJsonData] = useState<any>(undefined);
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState<string | null>(null);
            const [expanded, setExpanded] = useState<string[]>([]);

            const fetchData = async () => {
                const inputTpl = getInputTemplate?.("data");
                if (inputTpl === undefined) return;
                setLoading(true);
                setError(null);
                try {
                    const data = await evaluateJSONLang(inputTpl);
                    setJsonData(data);
                    setExpanded([""]);
                } catch (e: any) {
                    setError(e.message ?? String(e));
                } finally {
                    setLoading(false);
                }
            };

            const toggle = (path: string) =>
                setExpanded((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

            const select = (path: string) => setState("selectedPath", path);

            const TreeNode: React.FC<{ data: any; pathSegments: string[]; depth: number }> = ({
                data,
                pathSegments,
                depth,
            }) => {
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
                                    <TreeNode key={idx} data={item} pathSegments={[...pathSegments, String(idx)]} depth={depth + 1} />
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
                                entries.map(([key, val]) => {
                                    const nextPath = [...pathSegments, key].join(".");
                                    return (
                                        <div key={key}>
                                            <div
                                                style={{
                                                    paddingLeft: (depth + 1) * 16,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    cursor: "pointer",
                                                    color: state.selectedPath === nextPath ? "#6366f1" : "#374151",
                                                    fontWeight: state.selectedPath === nextPath ? 700 : 400,
                                                    fontSize: 11,
                                                }}
                                                onClick={() => select(nextPath)}
                                            >
                                                <span style={{ color: "#059669", marginRight: 6, fontWeight: 600 }}>{key}:</span>
                                                {typeof val !== "object" || val === null ? (
                                                    <span style={{ color: "#6b7280", fontSize: 11 }}>{JSON.stringify(val)}</span>
                                                ) : (
                                                    <span style={{ color: "#9ca3af", fontSize: 10 }}>
                                                        {Array.isArray(val) ? `Array(${val.length})` : `Object(${Object.keys(val).length})`}
                                                    </span>
                                                )}
                                            </div>
                                            {typeof val === "object" && val !== null && (
                                                <TreeNode data={val} pathSegments={[...pathSegments, key]} depth={depth + 1} />
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    );
                }

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

            const displayPath = state.selectedPath ? `/${state.selectedPath.replace(/\./g, "/")}` : "/";

            return (
                <div style={{ minWidth: 220, maxWidth: 340 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginBottom: 6 }}>
                        JSON Picker
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "6px 0",
                            borderRadius: 8,
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
                    {error && (
                        <div style={{ padding: 6, background: "#fef2f2", borderRadius: 6, color: "#dc2626", fontSize: 11, marginBottom: 6 }}>
                            {error}
                        </div>
                    )}
                    {jsonData !== undefined && (
                        <>
                            <div
                                style={{
                                    maxHeight: 320,
                                    overflowY: "auto",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    lineHeight: 1.5,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
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
                                    borderRadius: 6,
                                    fontSize: 10,
                                    color: "#374151",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span style={{ fontWeight: 600, color: "#4b5563" }}>Path: {displayPath}</span>
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
        name: "AnalyzeExpression",
        category: "Analysis",
        inputs: [{ id: "expr", name: "Expression" }],
        outputs: [
            {
                id: "out",
                name: "Report",
                template: (i) => ["analyze_expr", i.expr ?? null],
            },
        ],
        defaultState: {},
        icon: DocIcon,
        visual: ({ getTemplate }) => (
            <Card tone="warn">
                <div style={badgeStyle("#ffedd5", "#c2410c")}>Static Analysis</div>
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "GenerateDocs",
        category: "Analysis",
        inputs: [],
        outputs: [
            {
                id: "out",
                name: "Markdown",
                template: (_, s) => ["generate_docs", s.title, true],
            },
        ],
        defaultState: { title: "JSON-Lang Function Docs" },
        icon: DocIcon,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="warn">
                <L text="Title" />
                <In value={state.title} onChange={(e) => setState("title", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "JSONSchema",
        category: "Analysis",
        inputs: [{ id: "sample", name: "Sample" }],
        outputs: [
            {
                id: "out",
                name: "Schema",
                template: (i) => ["to_json_schema", i.sample ?? null],
            },
        ],
        defaultState: {},
        icon: DocIcon,
        visual: ({ getTemplate }) => (
            <Card tone="warn">
                <div style={badgeStyle("#fef3c7", "#92400e")}>Schema</div>
                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "ExecuteOnClick",
        category: "Interactive",
        inputs: [{ id: "expr", name: "Expression" }],
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
                    let expr = inputs.expr;
                    if (expr === undefined) {
                        throw new Error("No expression connected to input");
                    }
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
                    <L text="Input Expression" />
                    <Preview value={inputs.expr} />

                    <button
                        onClick={runExpression}
                        disabled={isRunning}
                        style={{
                            padding: "6px 12px",
                            background: isRunning ? "#9ca3af" : "#6366f1",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontWeight: 700,
                            cursor: isRunning ? "not-allowed" : "pointer",
                            fontSize: 12,
                        }}
                    >
                        {isRunning ? "Running..." : "▶ Run"}
                    </button>

                    {evalError && (
                        <div style={{ color: "#dc2626", fontSize: 11, background: "#fef2f2", padding: 6, borderRadius: 6 }}>
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
        name: "Gmail",
        category: "Apps",
        width: 280,
        inputs: [
            { id: "to", name: "To" },
            { id: "subject", name: "Subject" },
            { id: "body", name: "Body" },
        ],
        outputs: [
            {
                id: "tool",
                name: "Tool",
                template: (i, s) => [
                    "tool_def",
                    s.toolName,
                    s.description,
                    [
                        "object",
                        "type", "object",
                        "properties",
                        [
                            "object",
                            "to", ["object", "type", "string"],
                            "subject", ["object", "type", "string"],
                            "body", ["object", "type", "string"]
                        ],
                        "required",
                        ["array", "to", "subject", "body"]
                    ],
                    [
                        "object",
                        "kind", "gmail-tool",
                        "app", "gmail",
                        "name", s.toolName,
                        "description", s.description,
                        "payload",
                        [
                            "object",
                            "to", i.to ?? "",
                            "subject", i.subject ?? s.defaultSubject,
                            "body", i.body ?? s.defaultBody
                        ]
                    ],
                ],
            },
        ],
        defaultState: {
            toolName: "gmail_send",
            description: "Send an email using Gmail-style action payload.",
            defaultSubject: "Hello from workflow",
            defaultBody: "Generated by AI workflow.",
        },
        icon: () => <div className="w-5"><GmailIcon /></div>,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>

                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>Gmail</div>
                    <div style={badgeStyle("#fee2e2", "#b91c1c")}>App</div>
                </div>
                <L text="Tool Name" />
                <In value={state.toolName} onChange={(e) => setState("toolName", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Description" />
                <Txt value={state.description} onChange={(e) => setState("description", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Default Subject" />
                <In value={state.defaultSubject} onChange={(e) => setState("defaultSubject", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Default Body" />
                <Txt value={state.defaultBody} onChange={(e) => setState("defaultBody", e.target.value)} />
                <Preview value={getTemplate("tool")} />
            </Card>
        ),

    },
    {
        name: "GoogleSheets",
        category: "Apps",
        width: 300,
        inputs: [
            { id: "rows", name: "Rows" },
            { id: "items", name: "Items" },
        ],
        outputs: [
            {
                id: "tool",
                name: "Tool",
                template: (i, s) => [
                    "tool_def",
                    s.toolName,
                    s.description,
                    [
                        "object",
                        "type", "object",
                        "properties",
                        [
                            "object",
                            "spreadsheetId", ["object", "type", "string"],
                            "range", ["object", "type", "string"],
                            "rows", ["object", "type", "array"]
                        ]
                    ],
                    [
                        "google_sheets_action",
                        s.action,
                        s.spreadsheetId,
                        s.range,
                        ["coalesce", i.rows, ["rows_from_object_array", i.items ?? [], s.includeHeader]],
                        s.valueInputOption,
                        s.majorDimension
                    ]
                ],
            },
        ],
        defaultState: {
            toolName: "google_sheets",
            description: "Append or update rows in Google Sheets.",
            action: "append",
            spreadsheetId: "",
            range: "Sheet1!A:Z",
            includeHeader: true,
            valueInputOption: "USER_ENTERED",
            majorDimension: "ROWS",
        },
        icon: () => <GoogleSheetsIcon size={40} />,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <GoogleSheetsIcon size={28} />
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>Google Sheets</div>
                    <div style={badgeStyle("#dcfce7", "#166534")}>App</div>
                </div>

                <L text="Tool Name" />
                <In value={state.toolName} onChange={(e) => setState("toolName", e.target.value)} />

                <div style={{ height: 8 }} />
                <L text="Description" />
                <Txt value={state.description} onChange={(e) => setState("description", e.target.value)} />

                <div style={{ height: 8 }} />
                <L text="Action" />
                <Sel value={state.action} onChange={(e) => setState("action", e.target.value)}>
                    <option value="append">append</option>
                    <option value="update">update</option>
                    <option value="get">get</option>
                </Sel>

                <div style={{ height: 8 }} />
                <L text="Spreadsheet ID" />
                <In value={state.spreadsheetId} onChange={(e) => setState("spreadsheetId", e.target.value)} placeholder="1AbC..." />

                <div style={{ height: 8 }} />
                <L text="Range" />
                <In value={state.range} onChange={(e) => setState("range", e.target.value)} placeholder="Sheet1!A:Z" />

                <div style={{ height: 8 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
                    <input
                        type="checkbox"
                        checked={state.includeHeader}
                        onChange={(e) => setState("includeHeader", e.target.checked)}
                    />
                    Include header when converting object array
                </label>

                <div style={{ height: 8 }} />
                <L text="Value Input Option" />
                <Sel value={state.valueInputOption} onChange={(e) => setState("valueInputOption", e.target.value)}>
                    <option value="USER_ENTERED">USER_ENTERED</option>
                    <option value="RAW">RAW</option>
                </Sel>

                <Preview value={getTemplate("tool")} />
            </Card>
        ),
    },
    {
        name: "GPTLight",
        category: "AI Models",
        inputs: [],
        outputs: [
            {
                id: "out",
                name: "Model",
                template: (_, s) => [
                    "model_def",
                    "openai",
                    s.model,
                    s.temperature,
                    s.maxTokens,
                    s.label
                ],
            },
        ],
        defaultState: {
            label: "GPT Light",
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokens: 1024,
        },
        icon: () => <img src="/gpt.png" />,
        visual: ({ state, setState, getTemplate }) => (
            <Card tone="ai">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>

                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>GPT Light</div>
                    <div style={badgeStyle("#ede9fe", "#6d28d9")}>Model</div>
                </div>

                <L text="Label" />
                <In value={state.label} onChange={(e) => setState("label", e.target.value)} />

                <div style={{ height: 8 }} />
                <L text="Model" />
                <Sel value={state.model} onChange={(e) => setState("model", e.target.value)}>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </Sel>

                <div style={{ height: 8 }} />
                <L text="Temperature" />
                <In
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={state.temperature}
                    onChange={(e) => setState("temperature", Number(e.target.value))}
                />

                <div style={{ height: 8 }} />
                <L text="Max Tokens" />
                <In
                    type="number"
                    step="1"
                    min="1"
                    value={state.maxTokens}
                    onChange={(e) => setState("maxTokens", Number(e.target.value))}
                />

                <Preview value={getTemplate("out")} />
            </Card>
        ),
    },
    {
        name: "Шаблон промпта",
        category: "Data",
        inputs: [{ id: "text", name: "Text", type: "text" }],
        outputs: [
            {
                id: "out",
                name: "Prompt",
                type: "prompt",
                template: (i, s) => ["concat", s.prefix, i.text ?? "", s.suffix],
            },
        ],
        defaultState: {
            prefix: "Please help with: ",
            suffix: "",
        },
        icon: Text,
        visual: ({ state, setState, getTemplate }) => (
            <NodeCard title="Prompt Template" category="Data" icon={<Text />}>
                <L text="Prefix" />
                <In value={state.prefix} onChange={(e) => setState("prefix", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Suffix" />
                <In value={state.suffix} onChange={(e) => setState("suffix", e.target.value)} />
                <Preview value={getTemplate("out")} />
            </NodeCard>
        ),
    },
    {
        name: "Telegram",
        category: "Inputs",
        inputs: [{ id: "trigger", name: "Trigger", type: "trigger" }],
        outputs: [
            {
                id: "message",
                name: "Message",
                type: "message",
                template: (_, s) => [
                    "object",
                    "source", "telegram",
                    "chatId", s.chatId,
                    "user", s.user,
                    "text", s.text
                ],
            },
        ],
        defaultState: {
            chatId: "123456",
            user: "@user",
            text: "Summarize this and make a page",
        },
        icon: () => <MessageCircle size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <NodeCard title="Telegram Input" category="Inputs" icon={<MessageCircle size={16} />}>
                <L text="User" />
                <In value={state.user} onChange={(e) => setState("user", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Message" />
                <Txt value={state.text} onChange={(e) => setState("text", e.target.value)} />
                <Preview value={getTemplate("message")} />
            </NodeCard>
        ),
    },
    {
        name: "AIAgent",
        category: "AI",
        inputs: [
            { id: "input", name: "Input", type: "text" },
            { id: "model", name: "Model", type: "model" },
            { id: "tools", name: "Tools", type: "tools" },
            { id: "memory", name: "Memory", type: "memory" },
        ],
        outputs: [
            {
                id: "text",
                name: "Text",
                type: "text",
                template: (i, s) => [
                    "agent_result",
                    ["coalesce", ["get_path", i.model ?? null, "model"], s.modelFallback],
                    i.input ?? "",
                    i.tools ?? [],
                    i.memory ?? null,
                    "text"
                ],
            },
            {
                id: "json",
                name: "JSON",
                type: "json",
                template: (i, s) => [
                    "agent_result",
                    ["coalesce", ["get_path", i.model ?? null, "model"], s.modelFallback],
                    i.input ?? "",
                    i.tools ?? [],
                    i.memory ?? null,
                    "json"
                ],
            },
        ],
        defaultState: {
            modelFallback: "gpt-4o-mini",
        },
        icon: () => <Brain size={16} />,
        visual: ({ getTemplate }) => (
            <NodeCard title="AI Agent" category="AI" icon={<Brain size={16} />}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    Connect model, tools, memory, and input text.
                </div>
                <Preview value={getTemplate("text")} />
            </NodeCard>
        ),
    },
    {
        name: "Если",
        category: "Logic",
        inputs: [
            { id: "value", name: "Value", type: "any" },
        ],
        outputs: [
            { id: "true", name: "True", type: "route", template: (i, s) => ["if", ["compare", i.value, s.op, s.right, s.ignoreCase], i.value, null] },
            { id: "false", name: "False", type: "route", template: (i, s) => ["if", ["compare", i.value, s.op, s.right, s.ignoreCase], null, i.value] },
            { id: "match", name: "Match", type: "boolean", template: (i, s) => ["compare", i.value, s.op, s.right, s.ignoreCase] },
        ],
        defaultState: {
            op: "contains",
            right: "urgent",
            ignoreCase: true,
        },
        icon: Command,
        visual: ({ state, setState, getTemplate }) => (
            <NodeCard title="If" category="Logic" icon={<Command />}>
                <L text="Operator" />
                <Sel value={state.op} onChange={(e) => setState("op", e.target.value)}>
                    <option value="eq">equals</option>
                    <option value="contains">contains</option>
                    <option value="gt">greater than</option>
                    <option value="lt">less than</option>
                </Sel>
                <div style={{ height: 8 }} />
                <L text="Right value" />
                <In value={state.right} onChange={(e) => setState("right", e.target.value)} />
                <Preview value={getTemplate("match")} />
            </NodeCard>
        ),
    },
    {
        name: "WMSSource",
        category: "Enterprise Sources",
        width: 320,
        inputs: [
             {
                id: "API",
                name: "URL",
                type: "json",
                template: (_, s) => s.item,
            },
        ],
        outputs: [
            {
                id: "item",
                name: "WMS Item",
                type: "json",
                template: (_, s) => s.item,
            },
        ],
        defaultState: {
            item: {
                wms_id: "wms-1",
                item_code: "SKU-100",
                item_name: "Blue Widget",
                qty_available: "24",
                warehouse_code: "MSK-01",
                updated_at: "2026-06-16T14:35:00Z",
            },
            rawText: `{
  "wms_id": "wms-1",
  "item_code": "SKU-100",
  "item_name": "Blue Widget",
  "qty_available": "24",
  "warehouse_code": "MSK-01",
  "updated_at": "2026-06-16T14:35:00Z"
}`,
        },
        icon: () => <Database size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Database size={16} color="#2563eb" />
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>WMS Source</div>
                </div>
                <L text="Raw WMS JSON" />
                <textarea
                    value={state.rawText}
                    onChange={(e) => {
                        const rawText = e.target.value;
                        setState("rawText", rawText);
                        try {
                            setState("item", JSON.parse(rawText));
                        } catch { }
                    }}
                    style={{
                        width: "100%",
                        minHeight: 120,
                        background: "#ffffff",
                        border: "2px solid #e5e7eb",
                        color: "#111827",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 12,
                        outline: "none",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        boxSizing: "border-box",
                        resize: "vertical",
                    }}
                />
                <Preview value={getTemplate("item")} />
            </div>
        ),
    },
    {
        name: "ERPSource",
        category: "Enterprise Sources",
        width: 320,
        inputs: [
             {
                id: "item",
                name: "API",
                type: "json",
                template: (_, s) => s.item,
            },
        ],
        outputs: [
            {
                id: "item",
                name: "ERP Item",
                type: "json",
                template: (_, s) => s.item,
            },
        ],
        defaultState: {
            item: {
                erp_id: "erp-77",
                sku: "SKU-100",
                title: "Blue Widget",
                uom: "pcs",
                category: "Widgets",
                status: "ACTIVE",
                stock: 24,
            },
            rawText: `{
  "erp_id": "erp-77",
  "sku": "SKU-100",
  "title": "Blue Widget",
  "uom": "pcs",
  "category": "Widgets",
  "status": "ACTIVE",
  "stock": 24
}`,
        },
        icon: () => <Building2 size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Building2 size={16} color="#7c3aed" />
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>ERP Source</div>
                </div>
                <L text="Raw ERP JSON" />
                <textarea
                    value={state.rawText}
                    onChange={(e) => {
                        const rawText = e.target.value;
                        setState("rawText", rawText);
                        try {
                            setState("item", JSON.parse(rawText));
                        } catch { }
                    }}
                    style={{
                        width: "100%",
                        minHeight: 120,
                        background: "#ffffff",
                        border: "2px solid #e5e7eb",
                        color: "#111827",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 12,
                        outline: "none",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        boxSizing: "border-box",
                        resize: "vertical",
                    }}
                />
                <Preview value={getTemplate("item")} />
            </div>
        ),
    },
    {
        name: "OneCSource",
        category: "Enterprise Sources",
        width: 320,
        inputs: [],
        outputs: [
            {
                id: "item",
                name: "1C Item",
                type: "json",
                template: (_, s) => s.item,
            },
        ],
        defaultState: {
            item: {
                ref: "1c-900",
                nomenclature: "Blue Widget",
                code: "SKU-100",
                balance: 24,
                organization: "Main LLC",
            },
            rawText: `{
  "ref": "1c-900",
  "nomenclature": "Blue Widget",
  "code": "SKU-100",
  "balance": 24,
  "organization": "Main LLC"
}`,
        },
        icon: () => <Boxes size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Boxes size={16} color="#059669" />
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>1C Source</div>
                </div>
                <L text="Raw 1C JSON" />
                <textarea
                    value={state.rawText}
                    onChange={(e) => {
                        const rawText = e.target.value;
                        setState("rawText", rawText);
                        try {
                            setState("item", JSON.parse(rawText));
                        } catch { }
                    }}
                    style={{
                        width: "100%",
                        minHeight: 120,
                        background: "#ffffff",
                        border: "2px solid #e5e7eb",
                        color: "#111827",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 12,
                        outline: "none",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        boxSizing: "border-box",
                        resize: "vertical",
                    }}
                />
                <Preview value={getTemplate("item")} />
            </div>
        ),
    },
    {
        name: "FieldMapper",
        category: "Processors",
        width: 340,
        inputs: [{ id: "item", name: "Item", type: "json" }],
        outputs: [
            {
                id: "mapped",
                name: "Mapped",
                type: "json",
                template: (i, s) => [
                    "object",
                    "externalId", ["get_path", i.item ?? null, s.idField],
                    "sku", ["get_path", i.item ?? null, s.skuField],
                    "name", ["get_path", i.item ?? null, s.nameField],
                    "quantity", ["get_path", i.item ?? null, s.quantityField],
                    "warehouse", ["get_path", i.item ?? null, s.warehouseField],
                    "unit", ["get_path", i.item ?? null, s.unitField],
                    "updatedAt", ["get_path", i.item ?? null, s.updatedAtField],
                    "sourceSystem", s.sourceSystem,
                    "raw", i.item ?? null
                ],
            },
        ],
        defaultState: {
            sourceSystem: "wms",
            idField: "wms_id",
            skuField: "item_code",
            nameField: "item_name",
            quantityField: "qty_available",
            warehouseField: "warehouse_code",
            unitField: "uom",
            updatedAtField: "updated_at",
        },
        icon: () => <ArrowRightLeft size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ArrowRightLeft size={16} color="#ea580c" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Field Mapper</div>
                </div>
                <L text="Source System" />
                <Sel value={state.sourceSystem} onChange={(e) => setState("sourceSystem", e.target.value)}>
                    <option value="wms">wms</option>
                    <option value="erp">erp</option>
                    <option value="1c">1c</option>
                </Sel>
                <div style={{ height: 8 }} />
                <L text="ID Field" />
                <In value={state.idField} onChange={(e) => setState("idField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="SKU Field" />
                <In value={state.skuField} onChange={(e) => setState("skuField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Name Field" />
                <In value={state.nameField} onChange={(e) => setState("nameField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Quantity Field" />
                <In value={state.quantityField} onChange={(e) => setState("quantityField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Warehouse Field" />
                <In value={state.warehouseField} onChange={(e) => setState("warehouseField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Unit Field" />
                <In value={state.unitField} onChange={(e) => setState("unitField", e.target.value)} />
                <div style={{ height: 8 }} />
                <L text="Updated At Field" />
                <In value={state.updatedAtField} onChange={(e) => setState("updatedAtField", e.target.value)} />
                <Preview value={getTemplate("mapped")} />
            </div>
        ),
    },
    {
        name: "Normalizer",
        category: "Processors",
        width: 320,
        inputs: [{ id: "json", name: "JSON", type: "json" }],
        outputs: [
            {
                id: "normalized",
                name: "Normalized",
                type: "json",
                template: (i) => [
                    "merge",
                    i.json ?? ["object"],
                    [
                        "object",
                        "externalId", ["to_string", ["get_path", i.json ?? null, "externalId"]],
                        "sku", ["to_string", ["get_path", i.json ?? null, "sku"]],
                        "name", ["to_string", ["get_path", i.json ?? null, "name"]],
                        "quantity", ["to_number", ["get_path", i.json ?? null, "quantity"]],
                        "warehouse", ["to_string", ["get_path", i.json ?? null, "warehouse"]],
                        "unit", ["coalesce", ["get_path", i.json ?? null, "unit"], "pcs"],
                        "updatedAt", ["to_string", ["get_path", i.json ?? null, "updatedAt"]]
                    ]
                ],
            },
        ],
        defaultState: {},
        icon: () => <Rows3 size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Rows3 size={16} color="#0891b2" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Normalizer</div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    Normalizes strings, numbers, units and dates.
                </div>
                <Preview value={getTemplate("normalized")} />
            </div>
        ),
    },
    {
        name: "MergeByKey",
        category: "Processors",
        width: 320,
        inputs: [
            { id: "left", name: "Left", type: "json" },
            { id: "right", name: "Right", type: "json" },
        ],
        outputs: [
            {
                id: "merged",
                name: "Merged",
                type: "json",
                template: (i, s) => [
                    "merge",
                    i.left ?? ["object"],
                    i.right ?? ["object"],
                    ["object", "mergeKey", s.key]
                ],
            },
        ],
        defaultState: {
            key: "sku",
        },
        icon: () => <GitMerge size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <GitMerge size={16} color="#7c2d12" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Merge By Key</div>
                </div>
                <L text="Join Key" />
                <In value={state.key} onChange={(e) => setState("key", e.target.value)} />
                <Preview value={getTemplate("merged")} />
            </div>
        ),
    },
    {
        name: "SourcePriorityResolver",
        category: "Processors",
        width: 340,
        inputs: [
            { id: "a", name: "A", type: "json" },
            { id: "b", name: "B", type: "json" },
            { id: "c", name: "C", type: "json" },
        ],
        outputs: [
            {
                id: "resolved",
                name: "Resolved",
                type: "json",
                template: (i, s) => [
                    "object",
                    "externalId",
                    ["coalesce",
                        ["get_path", i.a ?? null, "externalId"],
                        ["get_path", i.b ?? null, "externalId"],
                        ["get_path", i.c ?? null, "externalId"]
                    ],
                    "sku",
                    ["coalesce",
                        ["get_path", i.a ?? null, "sku"],
                        ["get_path", i.b ?? null, "sku"],
                        ["get_path", i.c ?? null, "sku"]
                    ],
                    "name",
                    ["coalesce",
                        ["get_path", i.a ?? null, "name"],
                        ["get_path", i.b ?? null, "name"],
                        ["get_path", i.c ?? null, "name"]
                    ],
                    "quantity",
                    ["coalesce",
                        ["get_path", i.a ?? null, "quantity"],
                        ["get_path", i.b ?? null, "quantity"],
                        ["get_path", i.c ?? null, "quantity"]
                    ],
                    "warehouse",
                    ["coalesce",
                        ["get_path", i.a ?? null, "warehouse"],
                        ["get_path", i.b ?? null, "warehouse"],
                        ["get_path", i.c ?? null, "warehouse"]
                    ],
                    "unit",
                    ["coalesce",
                        ["get_path", i.a ?? null, "unit"],
                        ["get_path", i.b ?? null, "unit"],
                        ["get_path", i.c ?? null, "unit"],
                        "pcs"
                    ],
                    "updatedAt",
                    ["coalesce",
                        ["get_path", i.a ?? null, "updatedAt"],
                        ["get_path", i.b ?? null, "updatedAt"],
                        ["get_path", i.c ?? null, "updatedAt"]
                    ],
                    "sourcePriority", s.priorityLabel
                ],
            },
        ],
        defaultState: {
            priorityLabel: "A > B > C",
        },
        icon: () => <Workflow size={16} />,
        visual: ({ state, setState, getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Workflow size={16} color="#4f46e5" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Source Priority Resolver</div>
                </div>
                <L text="Priority Label" />
                <In value={state.priorityLabel} onChange={(e) => setState("priorityLabel", e.target.value)} />
                <Preview value={getTemplate("resolved")} />
            </div>
        ),
    },
    {
        name: "CanonicalInventoryItem",
        category: "Canonical",
        width: 340,
        inputs: [{ id: "json", name: "JSON", type: "json" }],
        outputs: [
            {
                id: "entity",
                name: "Entity",
                type: "json",
                template: (i) => [
                    "object",
                    "entityType", "inventory_item",
                    "sku", ["get_path", i.json ?? null, "sku"],
                    "name", ["get_path", i.json ?? null, "name"],
                    "quantity", ["get_path", i.json ?? null, "quantity"],
                    "unit", ["coalesce", ["get_path", i.json ?? null, "unit"], "pcs"],
                    "warehouse", ["get_path", i.json ?? null, "warehouse"],
                    "sourceSystem", ["coalesce", ["get_path", i.json ?? null, "sourceSystem"], "mixed"],
                    "externalId", ["get_path", i.json ?? null, "externalId"],
                    "updatedAt", ["get_path", i.json ?? null, "updatedAt"]
                ],
            },
        ],
        defaultState: {},
        icon: () => <FileJson size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <FileJson size={16} color="#0f766e" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Canonical Inventory Item</div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    Final shared schema for downstream processing.
                </div>
                <Preview value={getTemplate("entity")} />
            </div>
        ),
    },
    {
        name: "SchemaValidator",
        category: "Canonical",
        width: 320,
        inputs: [{ id: "json", name: "JSON", type: "json" }],
        outputs: [
            {
                id: "valid",
                name: "Valid",
                type: "boolean",
                template: (i) => [
                    "all_true",
                    ["neq", ["get_path", i.json ?? null, "sku"], null],
                    ["neq", ["get_path", i.json ?? null, "name"], null],
                    ["neq", ["get_path", i.json ?? null, "quantity"], null]
                ],
            },
            {
                id: "json",
                name: "JSON",
                type: "json",
                template: (i) => i.json ?? null,
            },
        ],
        defaultState: {},
        icon: () => <ShieldCheck size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ShieldCheck size={16} color="#15803d" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Schema Validator</div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    Checks required canonical fields.
                </div>
                <Preview value={getTemplate("valid")} />
            </div>
        ),
    },
    {
        name: "RecordDiff",
        category: "Processors",
        width: 340,
        inputs: [
            { id: "left", name: "Left", type: "json" },
            { id: "right", name: "Right", type: "json" },
        ],
        outputs: [
            {
                id: "diff",
                name: "Diff",
                type: "json",
                template: (i) => [
                    "object",
                    "sameSku", ["eq", ["get_path", i.left ?? null, "sku"], ["get_path", i.right ?? null, "sku"]],
                    "sameName", ["eq", ["get_path", i.left ?? null, "name"], ["get_path", i.right ?? null, "name"]],
                    "sameQuantity", ["eq", ["get_path", i.left ?? null, "quantity"], ["get_path", i.right ?? null, "quantity"]],
                    "left", i.left ?? null,
                    "right", i.right ?? null
                ],
            },
        ],
        defaultState: {},
        icon: () => <ScanSearch size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ScanSearch size={16} color="#b45309" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Record Diff</div>
                </div>
                <Preview value={getTemplate("diff")} />
            </div>
        ),
    },
    {
        name: "TablePreview",
        category: "Outputs",
        width: 340,
        inputs: [{ id: "json", name: "JSON", type: "json" }],
        outputs: [
            {
                id: "table",
                name: "Table",
                type: "json",
                template: (i) => [
                    "object",
                    "columns", ["array", "entityType", "sku", "name", "quantity", "unit", "warehouse", "sourceSystem", "externalId", "updatedAt"],
                    "rows",
                    ["array",
                        ["array",
                            ["get_path", i.json ?? null, "entityType"],
                            ["get_path", i.json ?? null, "sku"],
                            ["get_path", i.json ?? null, "name"],
                            ["get_path", i.json ?? null, "quantity"],
                            ["get_path", i.json ?? null, "unit"],
                            ["get_path", i.json ?? null, "warehouse"],
                            ["get_path", i.json ?? null, "sourceSystem"],
                            ["get_path", i.json ?? null, "externalId"],
                            ["get_path", i.json ?? null, "updatedAt"]
                        ]
                    ]
                ],
            },
        ],
        defaultState: {},
        icon: () => <Table2 size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Table2 size={16} color="#334155" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Table Preview</div>
                </div>
                <Preview value={getTemplate("table")} />
            </div>
        ),
    },
    {
        name: "ValidationAlert",
        category: "Outputs",
        width: 300,
        inputs: [{ id: "valid", name: "Valid", type: "boolean" }],
        outputs: [
            {
                id: "status",
                name: "Status",
                type: "text",
                template: (i) => ["if", i.valid ?? false, "VALID", "INVALID"],
            },
        ],
        defaultState: {},
        icon: () => <AlertTriangle size={16} />,
        visual: ({ getTemplate }) => (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Validation Alert</div>
                </div>
                <Preview value={getTemplate("status")} />
            </div>
        ),
    },
];
