import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- Types ---
type NodeType = 'block' | 'flex-row' | 'flex-col' | 'button' | 'input' | 'text' | 'heading1' | 'heading2' | 'image' | 'array-list' | 'lambda-wrap';

interface NodeDef {
  id: string;
  type: NodeType;
  props: Record<string, any>;
  children: string[];
  config: {
    text?: string;
    stateKey?: string;
    isLocal?: boolean;
    placeholder?: string;
    src?: string;
    arraySource?: string;
    arrayItemVar?: string;
    lambdaParams?: string[];
    dataAttrs?: Record<string, string>;
  };
}

interface PaletteConfig {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  gap: number;
  borderRadius: number;
  fontSize: number;
  padding: number;
}

export interface AppData {
  initialState: Record<string, any>;
  actions: Record<string, any>;
  renderRootId: string;
  nodes: Record<string, NodeDef>;
  palette: PaletteConfig;
}

interface Props {
  value?: AppData;
  onChange?: (value: AppData) => void;
}

// --- Utils ---
let idCounter = 0;
const genId = () => `n_${++idCounter}_${Date.now().toString(36)}`;

const createNode = (type: NodeType): NodeDef => ({
  id: genId(),
  type,
  props: {},
  children: [],
  config: {},
});

const defaultPalette: PaletteConfig = {
  primary: '#3b82f6',
  accent: '#8b5cf6',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  gap: 12,
  borderRadius: 8,
  fontSize: 16,
  padding: 12,
};

const defaultApp = (): AppData => {
  const root = createNode('flex-col');
  const h1 = createNode('heading1');
  h1.config.text = 'JSONLang Builder';
  const txt = createNode('text');
  txt.config.stateKey = 'count';
  const btn = createNode('button');
  btn.config.text = 'Increment';
  btn.props.onClick = ['action', 'increment'];
  const inp = createNode('input');
  inp.config.placeholder = 'Type something...';
  inp.props.value = ['get', 'message'];
  inp.props.onInput = ['set', 'message', ['get_path', ['get_local', '$event'], 'target', 'value']];

  root.children = [h1.id, txt.id, btn.id, inp.id];

  return {
    initialState: { count: 0, message: '' },
    actions: {
      increment: ['set', 'count', ['sum', ['get', 'count'], 1]],
      decrement: ['set', 'count', ['sum', ['get', 'count'], -1]],
      toggle: ['set', 'isOpen', ['not', ['get', 'isOpen']]],
    },
    renderRootId: root.id,
    nodes: {
      [root.id]: root,
      [h1.id]: h1,
      [txt.id]: txt,
      [btn.id]: btn,
      [inp.id]: inp,
    },
    palette: defaultPalette,
  };
};

// --- Compilation ---
export function compileToJSONLang(data: AppData): any {
  const compileNode = (id: string): any => {
    const node = data.nodes[id];
    if (!node) return ['span', {}, 'Missing'];
    const p = data.palette;

    const eventProps: Record<string, any> = {};
    if (node.props.onClick) eventProps.onClick = node.props.onClick;
    if (node.props.onInput) eventProps.onInput = node.props.onInput;
    if (node.props.onChange) eventProps.onChange = node.props.onChange;
    if (node.props.onSubmit) eventProps.onSubmit = node.props.onSubmit;
    if (node.props.value) eventProps.value = node.props.value;

    const dataProps: Record<string, any> = {};
    if (node.config.dataAttrs) {
      Object.entries(node.config.dataAttrs).forEach(([k, v]) => {
        dataProps[`data-${k}`] = v;
      });
    }

    const mkChildren = () => node.children.map((c) => compileNode(c));

    const resolveContent = () => {
      if (node.config.text) return node.config.text;
      if (node.config.stateKey) {
        return node.config.isLocal ? ['get_local', node.config.stateKey] : ['get', node.config.stateKey];
      }
      return 'Text';
    };

    switch (node.type) {
      case 'block':
        return ['div', { className: 'jl-block', style: { width: '100%', padding: p.padding, background: p.surface, borderRadius: p.borderRadius } }, ...mkChildren()];
      case 'flex-row':
        return ['div', { className: 'jl-flex-row', style: { display: 'flex', flexDirection: 'row', width: '100%', gap: p.gap, padding: p.padding } }, ...mkChildren()];
      case 'flex-col':
        return ['div', { className: 'jl-flex-col', style: { display: 'flex', flexDirection: 'column', width: '100%', gap: p.gap, padding: p.padding } }, ...mkChildren()];
      case 'button':
        return ['button', { className: 'jl-btn', style: { width: '100%', padding: p.padding, background: p.accent, color: '#fff', border: 'none', borderRadius: p.borderRadius, cursor: 'pointer', fontSize: p.fontSize }, ...eventProps, ...dataProps }, node.config.text || 'Button'];
      case 'input':
        return ['input', { className: 'jl-input', style: { width: '100%', padding: p.padding, borderRadius: p.borderRadius, border: `1px solid ${p.primary}`, fontSize: p.fontSize, background: p.surface, color: p.text }, placeholder: node.config.placeholder || '', ...eventProps }];
      case 'text':
        return ['span', { className: 'jl-text', style: { fontSize: p.fontSize, color: p.text } }, resolveContent()];
      case 'heading1':
        return ['h1', { className: 'jl-h1', style: { fontSize: p.fontSize * 2, color: p.text, margin: 0, fontWeight: 700 } }, resolveContent()];
      case 'heading2':
        return ['h2', { className: 'jl-h2', style: { fontSize: p.fontSize * 1.5, color: p.text, margin: 0, fontWeight: 600 } }, resolveContent()];
      case 'image':
        return ['img', { className: 'jl-img', src: node.config.src || '', style: { width: '100%', borderRadius: p.borderRadius, display: 'block' } }];
      case 'array-list': {
        const templateId = node.children[0];
        const template = templateId ? compileNode(templateId) : ['span', { className: 'jl-text' }, ['get_local', node.config.arrayItemVar || 'item']];
        return ['map', ['get', node.config.arraySource || 'items'], ['lambda', [node.config.arrayItemVar || 'item'], template]];
      }
      case 'lambda-wrap': {
        const bodyId = node.children[0];
        const body = bodyId ? compileNode(bodyId) : ['span', {}, ''];
        return ['lambda', node.config.lambdaParams?.length ? node.config.lambdaParams : ['_'], body];
      }
      default:
        return ['span', {}, ''];
    }
  };

  return {
    initialState: data.initialState,
    actions: data.actions,
    render: compileNode(data.renderRootId),
    palette: data.palette,
  };
}

// --- Component ---
export default function JSONLangBuilder({ value, onChange }: Props) {
  const [data, setData] = useState<AppData>(() => value || defaultApp());
  const [activeTab, setActiveTab] = useState('entities');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ parentId: string; index: number } | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const setAppData = useCallback((updater: React.SetStateAction<AppData>) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      onChangeRef.current?.(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (value) setData(value);
  }, [value]);

  const handleDrop = useCallback((info: any, parentId: string, index: number) => {
    if (!info || !info.type) return;

    if (info.type === 'new') {
      const nodeType = info.nodeType as NodeType;
      if (!nodeType) return;
      const newNode = createNode(nodeType);

      setAppData((d) => {
        const parent = d.nodes[parentId];
        if (!parent) return d;

        const isContainer = ['block', 'flex-row', 'flex-col', 'array-list', 'lambda-wrap'].includes(parent.type);
        if (!isContainer) return d;

        const maxChildren = parent.type === 'array-list' || parent.type === 'lambda-wrap' ? 1 : Infinity;
        if (parent.children.length >= maxChildren) return d;

        const newChildren = [...parent.children];
        newChildren.splice(index, 0, newNode.id);

        return {
          ...d,
          nodes: {
            ...d.nodes,
            [newNode.id]: newNode,
            [parentId]: { ...parent, children: newChildren },
          },
        };
      });

      setSelectedId(newNode.id);
    } else if (info.type === 'move') {
      const nodeId = info.nodeId as string;
      if (!nodeId || nodeId === parentId) return;

      setAppData((d) => {
        let oldParentId: string | null = null;
        let oldIndex = -1;
        for (const [pid, pnode] of Object.entries(d.nodes)) {
          const idx = pnode.children.indexOf(nodeId);
          if (idx !== -1) {
            oldParentId = pid;
            oldIndex = idx;
            break;
          }
        }
        if (!oldParentId) return d;

        const isDescendant = (ancestorId: string, childId: string): boolean => {
          const n = d.nodes[ancestorId];
          if (!n) return false;
          if (n.children.includes(childId)) return true;
          return n.children.some((c) => isDescendant(c, childId));
        };
        if (isDescendant(nodeId, parentId)) return d;

        const targetParent = d.nodes[parentId];
        if (!targetParent) return d;

        const isContainer = ['block', 'flex-row', 'flex-col', 'array-list', 'lambda-wrap'].includes(targetParent.type);
        if (!isContainer) return d;

        const maxChildren = targetParent.type === 'array-list' || targetParent.type === 'lambda-wrap' ? 1 : Infinity;
        if (targetParent.children.length >= maxChildren && oldParentId !== parentId) return d;

        const newNodes = { ...d.nodes };
        const oldParent = { ...newNodes[oldParentId], children: [...newNodes[oldParentId].children] };
        oldParent.children.splice(oldIndex, 1);
        newNodes[oldParentId] = oldParent;

        let newIndex = index;
        if (oldParentId === parentId && newIndex > oldIndex) newIndex--;

        const newParent = { ...newNodes[parentId], children: [...newNodes[parentId].children] };
        newParent.children.splice(newIndex, 0, nodeId);
        newNodes[parentId] = newParent;

        return { ...d, nodes: newNodes };
      });
    }
  }, [setAppData]);

  // --- Sub-components (hoisted) ---

  function JsonInput({ value, onChange }: { value: any; onChange: (v: any) => void }) {
    const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
    useEffect(() => {
      setText(JSON.stringify(value ?? null, null, 2));
    }, [value]);

    return (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text);
            onChange(parsed);
          } catch {
            setText(JSON.stringify(value ?? null, null, 2));
          }
        }}
        style={{
          width: '100%',
          padding: 8,
          background: data.palette.background,
          color: data.palette.text,
          border: `1px solid ${data.palette.primary}`,
          borderRadius: data.palette.borderRadius,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          resize: 'vertical',
        }}
        rows={4}
      />
    );
  }

  function DropZone({ parentId, index, layout }: { parentId: string; index: number; layout: 'row' | 'col' }) {
    const active = dropTarget?.parentId === parentId && dropTarget?.index === index;
    const isRow = layout === 'row';

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropTarget({ parentId, index });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            const info = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
            handleDrop(info, parentId, index);
          } catch {}
          setDropTarget(null);
        }}
        style={{
          [isRow ? 'width' : 'height']: active ? 12 : 4,
          [isRow ? 'height' : 'width']: '100%',
          background: active ? data.palette.accent : 'transparent',
          borderRadius: 2,
          transition: 'all 0.15s ease',
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      />
    );
  }

  function renderChildren(parentId: string, layout: 'row' | 'col') {
    const parent = data.nodes[parentId];
    const maxChildren = parent.type === 'array-list' || parent.type === 'lambda-wrap' ? 1 : Infinity;
    const isFull = parent.children.length >= maxChildren;

    return (
      <>
        {!isFull && <DropZone parentId={parentId} index={0} layout={layout} />}
        {parent.children.map((childId, i) => (
          <React.Fragment key={childId}>
            <CanvasNode id={childId} />
            {!isFull && <DropZone parentId={parentId} index={i + 1} layout={layout} />}
          </React.Fragment>
        ))}
      </>
    );
  }

  function CanvasNode({ id, isRoot }: { id: string; isRoot?: boolean }) {
    const node = data.nodes[id];
    const isSelected = selectedId === id;
    const p = data.palette;

    const wrapperStyle: React.CSSProperties = {
      position: 'relative',
      border: isSelected ? `2px solid ${p.accent}` : '2px solid transparent',
      borderRadius: 4,
      cursor: isRoot ? 'default' : 'grab',
      transition: 'border-color 0.15s',
    };

    const handleDragStart = (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'move', nodeId: id }));
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => setDropTarget(null);

    return (
      <div
        style={wrapperStyle}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(id);
        }}
      >
        {node.type === 'block' && (
          <div style={{ width: '100%', padding: p.padding, background: p.surface, borderRadius: p.borderRadius, minHeight: 40 }}>
            {node.children.length === 0 && <span style={{ opacity: 0.3, fontSize: 12 }}>Block</span>}
            {renderChildren(id, 'col')}
          </div>
        )}

        {node.type === 'flex-row' && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: p.gap, width: '100%', padding: p.padding, background: p.surface, borderRadius: p.borderRadius, minHeight: 40 }}>
            {node.children.length === 0 && <span style={{ opacity: 0.3, fontSize: 12 }}>Flex Row</span>}
            {renderChildren(id, 'row')}
          </div>
        )}

        {node.type === 'flex-col' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: p.gap, width: '100%', padding: p.padding, background: p.surface, borderRadius: p.borderRadius, minHeight: 40 }}>
            {node.children.length === 0 && <span style={{ opacity: 0.3, fontSize: 12 }}>Flex Column</span>}
            {renderChildren(id, 'col')}
          </div>
        )}

        {node.type === 'button' && (
          <button
            style={{
              width: '100%',
              padding: p.padding,
              background: p.accent,
              color: '#fff',
              border: 'none',
              borderRadius: p.borderRadius,
              fontSize: p.fontSize,
              cursor: 'pointer',
              pointerEvents: 'none',
            }}
          >
            {node.config.text || 'Button'}
          </button>
        )}

        {node.type === 'input' && (
          <input
            style={{
              width: '100%',
              padding: p.padding,
              borderRadius: p.borderRadius,
              border: `1px solid ${p.primary}`,
              fontSize: p.fontSize,
              background: p.background,
              color: p.text,
              pointerEvents: 'none',
            }}
            placeholder={node.config.placeholder || ''}
            readOnly
          />
        )}

        {node.type === 'text' && (
          <span style={{ fontSize: p.fontSize, color: p.text, pointerEvents: 'none' }}>
            {node.config.text || node.config.stateKey || 'Text'}
          </span>
        )}

        {node.type === 'heading1' && (
          <h1 style={{ fontSize: p.fontSize * 2, color: p.text, margin: 0, fontWeight: 700, pointerEvents: 'none' }}>
            {node.config.text || node.config.stateKey || 'Heading'}
          </h1>
        )}

        {node.type === 'heading2' && (
          <h2 style={{ fontSize: p.fontSize * 1.5, color: p.text, margin: 0, fontWeight: 600, pointerEvents: 'none' }}>
            {node.config.text || node.config.stateKey || 'Heading'}
          </h2>
        )}

        {node.type === 'image' && (
          <img
            src={node.config.src || 'https://via.placeholder.com/400x200?text=Image'}
            alt=""
            style={{
              width: '100%',
              borderRadius: p.borderRadius,
              display: 'block',
              maxHeight: 200,
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        )}

        {node.type === 'array-list' && (
          <div
            style={{
              width: '100%',
              padding: p.padding,
              background: 'rgba(59,130,246,0.08)',
              border: `2px dashed ${p.primary}`,
              borderRadius: p.borderRadius,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: p.primary,
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Array: {node.config.arraySource || 'items'} → {node.config.arrayItemVar || 'item'}
            </div>
            {node.children.length === 0 && <div style={{ opacity: 0.3, fontSize: 12 }}>Drop template item</div>}
            {renderChildren(id, 'col')}
          </div>
        )}

        {node.type === 'lambda-wrap' && (
          <div
            style={{
              width: '100%',
              padding: p.padding,
              background: 'rgba(139,92,246,0.08)',
              border: `2px dashed ${p.accent}`,
              borderRadius: p.borderRadius,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: p.accent,
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Lambda ({(node.config.lambdaParams || ['_']).join(', ')})
            </div>
            {node.children.length === 0 && <div style={{ opacity: 0.3, fontSize: 12 }}>Drop body</div>}
            {renderChildren(id, 'col')}
          </div>
        )}
      </div>
    );
  }

  function ConfigSidebar() {
    if (!selectedId) return null;
    const node = data.nodes[selectedId];
    if (!node) return null;
    const isRoot = selectedId === data.renderRootId;
    const p = data.palette;

    const updateNode = (patch: Partial<NodeDef> | ((n: NodeDef) => NodeDef)) => {
      setAppData((d) => {
        const n = d.nodes[selectedId];
        const next = typeof patch === 'function' ? patch(n) : { ...n, ...patch };
        return { ...d, nodes: { ...d.nodes, [selectedId]: next } };
      });
    };

    const updateConfig = (patch: Partial<NodeDef['config']>) => {
      updateNode((n) => ({ ...n, config: { ...n.config, ...patch } }));
    };

    const updateProps = (patch: Partial<NodeDef['props']>) => {
      updateNode((n) => ({ ...n, props: { ...n.props, ...patch } }));
    };

    const contentMode = node.config.stateKey
      ? 'state'
      : node.config.arraySource
      ? 'array'
      : node.config.lambdaParams
      ? 'lambda'
      : 'text';

    return (
      <div
        style={{
          width: 320,
          background: p.surface,
          borderLeft: `1px solid ${p.primary}`,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: p.text, fontSize: 18, fontWeight: 700 }}>{node.type}</h3>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>{node.id}</div>
        </div>

        {/* Content */}
        <div>
          <label
            style={{
              color: p.text,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 10,
              display: 'block',
              fontWeight: 600,
            }}
          >
            Content
          </label>
          <select
            value={contentMode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'text') updateConfig({ text: '', stateKey: undefined, arraySource: undefined, lambdaParams: undefined });
              if (v === 'state')
                updateConfig({
                  text: undefined,
                  stateKey: Object.keys(data.initialState)[0] || '',
                  arraySource: undefined,
                  lambdaParams: undefined,
                });
              if (v === 'array')
                updateConfig({
                  text: undefined,
                  stateKey: undefined,
                  arraySource: Object.keys(data.initialState).find((k) => Array.isArray(data.initialState[k])) || 'items',
                  arrayItemVar: 'item',
                  lambdaParams: undefined,
                });
              if (v === 'lambda')
                updateConfig({ text: undefined, stateKey: undefined, arraySource: undefined, lambdaParams: ['_'] });
            }}
            style={{
              width: '100%',
              padding: 8,
              background: p.background,
              color: p.text,
              border: `1px solid ${p.primary}`,
              borderRadius: p.borderRadius,
              fontSize: 14,
            }}
          >
            <option value="text">Static Text</option>
            <option value="state">State Variable</option>
            <option value="array">Array Map</option>
            <option value="lambda">Lambda</option>
          </select>

          {contentMode === 'text' && (
            <input
              value={node.config.text || ''}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Text content..."
              style={{
                width: '100%',
                marginTop: 10,
                padding: 8,
                background: p.background,
                color: p.text,
                border: `1px solid ${p.primary}`,
                borderRadius: p.borderRadius,
                fontSize: 14,
              }}
            />
          )}

          {contentMode === 'state' && (
            <>
              <select
                value={node.config.stateKey || ''}
                onChange={(e) => updateConfig({ stateKey: e.target.value })}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 8,
                  background: p.background,
                  color: p.text,
                  border: `1px solid ${p.primary}`,
                  borderRadius: p.borderRadius,
                  fontSize: 14,
                }}
              >
                {Object.keys(data.initialState).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!node.config.isLocal}
                  onChange={(e) => updateConfig({ isLocal: e.target.checked })}
                />
                <span style={{ fontSize: 12, color: p.text }}>Use get_local (for lambdas / array maps)</span>
              </label>
            </>
          )}

          {contentMode === 'array' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <input
                value={node.config.arraySource || ''}
                onChange={(e) => updateConfig({ arraySource: e.target.value })}
                placeholder="Array state key"
                style={{
                  width: '100%',
                  padding: 8,
                  background: p.background,
                  color: p.text,
                  border: `1px solid ${p.primary}`,
                  borderRadius: p.borderRadius,
                  fontSize: 14,
                }}
              />
              <input
                value={node.config.arrayItemVar || ''}
                onChange={(e) => updateConfig({ arrayItemVar: e.target.value })}
                placeholder="Item variable name"
                style={{
                  width: '100%',
                  padding: 8,
                  background: p.background,
                  color: p.text,
                  border: `1px solid ${p.primary}`,
                  borderRadius: p.borderRadius,
                  fontSize: 14,
                }}
              />
            </div>
          )}

          {contentMode === 'lambda' && (
            <input
              value={(node.config.lambdaParams || []).join(', ')}
              onChange={(e) =>
                updateConfig({
                  lambdaParams: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Param names, comma separated"
              style={{
                width: '100%',
                marginTop: 10,
                padding: 8,
                background: p.background,
                color: p.text,
                border: `1px solid ${p.primary}`,
                borderRadius: p.borderRadius,
                fontSize: 14,
              }}
            />
          )}
        </div>

        {/* Events */}
        {['button', 'input'].includes(node.type) && (
          <div>
            <label
              style={{
                color: p.text,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
                display: 'block',
                fontWeight: 600,
              }}
            >
              Events & Binding
            </label>
            {(['onClick', 'onInput', 'onChange', 'value'] as const).map((evt) => (
              <div key={evt} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>{evt}</div>
                <JsonInput value={node.props[evt]} onChange={(v) => updateProps({ [evt]: v })} />
              </div>
            ))}
          </div>
        )}

        {/* Data Attributes */}
        <div>
          <label
            style={{
              color: p.text,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 10,
              display: 'block',
              fontWeight: 600,
            }}
          >
            Data Attributes
          </label>
          {Object.entries(node.config.dataAttrs || {}).map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={k}
                onChange={(e) => {
                  const newAttrs = { ...node.config.dataAttrs };
                  delete newAttrs[k];
                  newAttrs[e.target.value] = v;
                  updateConfig({ dataAttrs: newAttrs });
                }}
                style={{
                  flex: 1,
                  padding: 8,
                  background: p.background,
                  color: p.text,
                  border: `1px solid ${p.primary}`,
                  borderRadius: p.borderRadius,
                  fontSize: 12,
                }}
              />
              <input
                value={v}
                onChange={(e) => {
                  updateConfig({ dataAttrs: { ...node.config.dataAttrs, [k]: e.target.value } });
                }}
                style={{
                  flex: 1,
                  padding: 8,
                  background: p.background,
                  color: p.text,
                  border: `1px solid ${p.primary}`,
                  borderRadius: p.borderRadius,
                  fontSize: 12,
                }}
              />
              <button
                onClick={() => {
                  const newAttrs = { ...node.config.dataAttrs };
                  delete newAttrs[k];
                  updateConfig({ dataAttrs: newAttrs });
                }}
                style={{
                  padding: '0 10px',
                  background: 'transparent',
                  color: '#ef4444',
                  border: `1px solid #ef4444`,
                  borderRadius: p.borderRadius,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => updateConfig({ dataAttrs: { ...node.config.dataAttrs, id: '' } })}
            style={{
              width: '100%',
              padding: 8,
              background: p.background,
              color: p.text,
              border: `1px dashed ${p.primary}`,
              borderRadius: p.borderRadius,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            + Add Attribute
          </button>
        </div>

        {/* Delete */}
        {!isRoot && (
          <button
            onClick={() => {
              setAppData((d) => {
                let parentId: string | null = null;
                for (const [pid, pnode] of Object.entries(d.nodes)) {
                  if (pnode.children.includes(selectedId)) {
                    parentId = pid;
                    break;
                  }
                }
                if (!parentId) return d;
                const parent = d.nodes[parentId];
                return {
                  ...d,
                  nodes: {
                    ...d.nodes,
                    [parentId]: { ...parent, children: parent.children.filter((c) => c !== selectedId) },
                  },
                };
              });
              setSelectedId(null);
            }}
            style={{
              padding: 12,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: p.borderRadius,
              cursor: 'pointer',
              fontWeight: 600,
              marginTop: 'auto',
            }}
          >
            Delete Node
          </button>
        )}
      </div>
    );
  }

  // --- Render ---
  const p = data.palette;

  const tabs = [
    { id: 'entities', label: 'Entities' },
    { id: 'actions', label: 'Actions' },
    { id: 'state', label: 'State' },
    { id: 'output', label: 'Output' },
    { id: 'palette', label: 'Palette' },
  ];

  const paletteItems = [
    { type: 'block' as NodeType, label: 'Block', icon: '▢' },
    { type: 'flex-row' as NodeType, label: 'Flex Row', icon: '▭' },
    { type: 'flex-col' as NodeType, label: 'Flex Col', icon: '▯' },
    { type: 'button' as NodeType, label: 'Button', icon: '🔘' },
    { type: 'input' as NodeType, label: 'Input', icon: '⌨️' },
    { type: 'text' as NodeType, label: 'Text', icon: 'T' },
    { type: 'heading1' as NodeType, label: 'H1', icon: 'H1' },
    { type: 'heading2' as NodeType, label: 'H2', icon: 'H2' },
    { type: 'image' as NodeType, label: 'Image', icon: '🖼️' },
    { type: 'array-list' as NodeType, label: 'Array', icon: '📋' },
    { type: 'lambda-wrap' as NodeType, label: 'Lambda', icon: 'λ' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: p.background,
        color: p.text,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${p.primary}`, padding: '0 24px', flexShrink: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '16px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? p.accent : 'transparent'}`,
              color: activeTab === tab.id ? p.accent : p.text,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'entities' && (
            <>
              <div style={{ flex: 1, overflow: 'auto', padding: 24, background: p.background }}>
                <div
                  style={{
                    maxWidth: 960,
                    margin: '0 auto',
                    background: p.surface,
                    borderRadius: p.borderRadius,
                    minHeight: 500,
                    padding: p.padding,
                  }}
                >
                  <CanvasNode id={data.renderRootId} isRoot />
                </div>
              </div>
              <div
                style={{
                  height: 100,
                  background: p.surface,
                  borderTop: `1px solid ${p.primary}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '0 24px',
                  overflowX: 'auto',
                  flexShrink: 0,
                }}
              >
                {paletteItems.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'new', nodeType: item.type }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragEnd={() => setDropTarget(null)}
                    style={{
                      flexShrink: 0,
                      width: 72,
                      height: 72,
                      background: p.background,
                      borderRadius: p.borderRadius,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      border: `1px solid ${p.primary}`,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</div>
                    <div style={{ fontSize: 10, marginTop: 6, color: p.text, fontWeight: 500 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'actions' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <h2 style={{ color: p.text, marginTop: 0 }}>Actions</h2>
              {Object.entries(data.actions).map(([name, expr]) => (
                <div
                  key={name}
                  style={{ marginBottom: 16, background: p.surface, padding: 16, borderRadius: p.borderRadius, border: `1px solid ${p.primary}` }}
                >
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      value={name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        if (!newName || newName === name) return;
                        setAppData((d) => {
                          const actions = { ...d.actions };
                          delete actions[name];
                          actions[newName] = expr;
                          return { ...d, actions };
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: 8,
                        background: p.background,
                        color: p.text,
                        border: `1px solid ${p.primary}`,
                        borderRadius: p.borderRadius,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    />
                    <button
                      onClick={() =>
                        setAppData((d) => {
                          const a = { ...d.actions };
                          delete a[name];
                          return { ...d, actions: a };
                        })
                      }
                      style={{
                        padding: '0 14px',
                        background: 'transparent',
                        color: '#ef4444',
                        border: `1px solid #ef4444`,
                        borderRadius: p.borderRadius,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <JsonInput value={expr} onChange={(v) => setAppData((d) => ({ ...d, actions: { ...d.actions, [name]: v } }))} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAppData((d) => ({ ...d, actions: { ...d.actions, newAction: ['log', 'hello'] } }))}
                  style={{
                    padding: '10px 18px',
                    background: p.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: p.borderRadius,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Custom
                </button>
                <button
                  onClick={() =>
                    setAppData((d) => ({
                      ...d,
                      actions: { ...d.actions, increment: ['set', 'count', ['sum', ['get', 'count'], 1]] },
                    }))
                  }
                  style={{
                    padding: '10px 18px',
                    background: p.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: p.borderRadius,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Increment
                </button>
                <button
                  onClick={() =>
                    setAppData((d) => ({
                      ...d,
                      actions: { ...d.actions, decrement: ['set', 'count', ['sum', ['get', 'count'], -1]] },
                    }))
                  }
                  style={{
                    padding: '10px 18px',
                    background: p.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: p.borderRadius,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Decrement
                </button>
                <button
                  onClick={() =>
                    setAppData((d) => ({
                      ...d,
                      actions: { ...d.actions, toggle: ['set', 'isOpen', ['not', ['get', 'isOpen']]] },
                    }))
                  }
                  style={{
                    padding: '10px 18px',
                    background: p.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: p.borderRadius,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Toggle
                </button>
              </div>
            </div>
          )}

          {activeTab === 'state' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <h2 style={{ color: p.text, marginTop: 0 }}>State</h2>
              {Object.entries(data.initialState).map(([key, val]) => (
                <div
                  key={key}
                  style={{ marginBottom: 16, background: p.surface, padding: 16, borderRadius: p.borderRadius, border: `1px solid ${p.primary}` }}
                >
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        if (!newKey || newKey === key) return;
                        setAppData((d) => {
                          const s = { ...d.initialState };
                          delete s[key];
                          s[newKey] = val;
                          return { ...d, initialState: s };
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: 8,
                        background: p.background,
                        color: p.text,
                        border: `1px solid ${p.primary}`,
                        borderRadius: p.borderRadius,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    />
                    <button
                      onClick={() =>
                        setAppData((d) => {
                          const s = { ...d.initialState };
                          delete s[key];
                          return { ...d, initialState: s };
                        })
                      }
                      style={{
                        padding: '0 14px',
                        background: 'transparent',
                        color: '#ef4444',
                        border: `1px solid #ef4444`,
                        borderRadius: p.borderRadius,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <JsonInput
                    value={val}
                    onChange={(v) => setAppData((d) => ({ ...d, initialState: { ...d.initialState, [key]: v } }))}
                  />
                </div>
              ))}
              <button
                onClick={() => setAppData((d) => ({ ...d, initialState: { ...d.initialState, newVar: '' } }))}
                style={{
                  padding: '10px 18px',
                  background: p.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: p.borderRadius,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Add Variable
              </button>
            </div>
          )}

          {activeTab === 'output' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              <h2 style={{ color: p.text, marginTop: 0 }}>Output</h2>
              <pre
                style={{
                  background: p.surface,
                  padding: 20,
                  borderRadius: p.borderRadius,
                  color: p.text,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.6,
                  border: `1px solid ${p.primary}`,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {JSON.stringify(compileToJSONLang(data), null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'palette' && (
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 24,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 24,
                alignContent: 'start',
              }}
            >
              <div style={{ background: p.surface, padding: 20, borderRadius: p.borderRadius, border: `1px solid ${p.primary}` }}>
                <h3 style={{ marginTop: 0, color: p.text }}>Colors</h3>
                {[
                  { key: 'primary', label: 'Primary' },
                  { key: 'accent', label: 'Accent' },
                  { key: 'background', label: 'Background' },
                  { key: 'surface', label: 'Surface' },
                  { key: 'text', label: 'Text' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ color: p.text, fontSize: 14 }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={p[key as keyof PaletteConfig] as string}
                        onChange={(e) =>
                          setAppData((d) => ({ ...d, palette: { ...d.palette, [key]: e.target.value } }))
                        }
                        style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        value={p[key as keyof PaletteConfig] as string}
                        onChange={(e) =>
                          setAppData((d) => ({ ...d, palette: { ...d.palette, [key]: e.target.value } }))
                        }
                        style={{
                          width: 90,
                          padding: 6,
                          background: p.background,
                          color: p.text,
                          border: `1px solid ${p.primary}`,
                          borderRadius: p.borderRadius,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: p.surface, padding: 20, borderRadius: p.borderRadius, border: `1px solid ${p.primary}` }}>
                <h3 style={{ marginTop: 0, color: p.text }}>Layout</h3>
                {([
                  { key: 'gap', label: 'Gap', min: 0, max: 64 },
                  { key: 'borderRadius', label: 'Border Radius', min: 0, max: 32 },
                  { key: 'fontSize', label: 'Font Size', min: 12, max: 24 },
                  { key: 'padding', label: 'Padding', min: 4, max: 32 },
                ] as const).map(({ key, label, min, max }) => (
                  <div key={key} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: p.text, fontSize: 14 }}>{label}</span>
                      <span style={{ color: p.text, fontSize: 14, fontFamily: 'monospace' }}>
                        {p[key as keyof PaletteConfig]}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={p[key as keyof PaletteConfig] as number}
                      onChange={(e) =>
                        setAppData((d) => ({
                          ...d,
                          palette: { ...d.palette, [key]: Number(e.target.value) },
                        }))
                      }
                      style={{ width: '100%', accentColor: p.accent }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {activeTab === 'entities' && <ConfigSidebar />}
      </div>
    </div>
  );
}
