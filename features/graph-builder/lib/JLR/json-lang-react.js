// json-lang-react.js
import React, { useState, useEffect, useCallback, Fragment } from 'react';

const HTML_TAGS = new Set([
  'div','span','p','h1','h2','h3','h4','h5','h6','img','button','input',
  'form','label','ul','ol','li','a','br','hr','table','tr','td','th',
  'thead','tbody','section','article','header','footer','main','nav',
  'aside','strong','em','code','pre','blockquote','fragment'
]);

export class JSONLangReactRuntime {
  constructor(engine) {
    this.engine = engine;
    for (const tag of HTML_TAGS) engine.registerOpaque(tag);
  }

  createApp(appDefinition) {
    const engine = this.engine;

    return function JSONLangApp() {
      const [version, setVersion] = useState(0);
      const [tree, setTree] = useState(null);
      const [error, setError] = useState(null);

      // Initialize store and actions
      useEffect(() => {
        const init = async () => {
          if (appDefinition.initialState) {
            for (const [k, v] of Object.entries(appDefinition.initialState)) {
              engine.globalStore[k] = v;
            }
          }
          if (appDefinition.actions) {
            for (const [k, v] of Object.entries(appDefinition.actions)) {
              engine.globalStore[k] = v;
            }
          }
          setVersion(v => v + 1);
        };
        init();
      }, []);

      // NEW: Subscribe to engine state changes for real-time re-renders
      useEffect(() => {
        const handleChange = (key, value) => {
          // Force re-render on any state mutation
          setVersion(v => v + 1);
        };
        engine.subscribe(handleChange);
        return () => engine.unsubscribe(handleChange);
      }, []);

      const buildCtx = useCallback(() => {
        const ctx = Object.create(null);
        Object.assign(ctx, engine.globalStore);
        return ctx;
      }, []);

      const execute = useCallback(async (expr, eventData) => {
        try {
          setError(null);
          const ctx = buildCtx();
          if (eventData) ctx.$event = eventData;
          await engine.process(expr, ctx);
          // Re-render is now handled by subscriber, but keep this as fallback
          setVersion(v => v + 1);
        } catch (err) {
          console.error('[JSONLang:Action]', err);
          setError(err.message);
        }
      }, [buildCtx]);

      // Render tree
      useEffect(() => {
        let cancelled = false;
        const render = async () => {
          try {
            const ctx = buildCtx();
            const result = await engine.process(appDefinition.render, ctx);
            if (!cancelled) setTree(toReact(result));
          } catch (err) {
            if (!cancelled) {
              console.error('[JSONLang:Render]', err);
              setError(err.message);
            }
          }
        };
        render();
        return () => { cancelled = true; };
      }, [version, buildCtx]);

      const isNode = (item) =>
        Array.isArray(item) && item.length >= 2 && typeof item[0] === 'string';

      const flattenChildren = (children) => {
        const out = [];
        for (const child of children) {
          if (child === null || child === undefined) continue;
          if (Array.isArray(child) && !isNode(child)) {
            out.push(...flattenChildren(child));
          } else {
            out.push(child);
          }
        }
        return out;
      };

      const toReact = (node) => {
        if (node === null || node === undefined) return null;
        if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
          return node;
        }
        if (!Array.isArray(node)) return node;

        const [type, props, ...rawChildren] = node;
        const children = flattenChildren(rawChildren);

        if (type === 'fragment') {
          return React.createElement(Fragment, props || null, ...children.map(toReact));
        }

        const reactProps = {};
        for (const [k, v] of Object.entries(props || {})) {
          if (v && typeof v === 'object') {
            if (v.__jsonlang_handler) {
              reactProps[k] = (e) => {
                const eventData = {
                  type: e.type,
                  target: {
                    value: e.target.value,
                    checked: e.target.checked,
                    dataset: e.target.dataset ? { ...e.target.dataset } : {}
                  }
                };
                execute(v.expr, eventData);
              };
            } else if (v.__jsonlang_action) {
              const actionName = v.__jsonlang_action;
              const actionExpr = appDefinition.actions?.[actionName];
              if (!actionExpr) throw new Error(`Unknown action: "${actionName}"`);
              reactProps[k] = (e) => {
                const eventData = {
                  type: e.type,
                  target: {
                    value: e.target.value,
                    checked: e.target.checked,
                    dataset: e.target.dataset ? { ...e.target.dataset } : {}
                  }
                };
                execute(actionExpr, eventData);
              };
            } else {
              reactProps[k] = v;
            }
          } else {
            reactProps[k] = v;
          }
        }

        return React.createElement(type, reactProps, ...children.map(toReact));
      };

      if (error) {
        return React.createElement('div', {
          style: { color: '#d32f2f', padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }
        }, `JSONLang Runtime Error: ${error}`);
      }

      return tree || React.createElement('div', { style: { padding: 20 } }, 'Loading...');
    };
  }
}
