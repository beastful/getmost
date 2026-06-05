// json-lang-engine.js

export class JSONLangEngine {
  constructor(options = {}) {
    this.opts = {
      maxGas: options.maxGas ?? 50000,
      maxDepth: options.maxDepth ?? 128,
      strict: options.strict !== false,
      trace: options.trace ?? false,
      debug: options.debug ?? false
    };

    this.functions = Object.create(null);
    this.specialForms = Object.create(null);
    this.signatures = new Map();
    this.opaque = new Set();
    this.extensions = Object.create(null);
    this.globalStore = Object.create(null);
    this.subscribers = new Set(); // NEW: state change subscribers

    this._gas = 0;
    this._depth = 0;
    this._traces = [];

    this._initCore();
  }

  // NEW: Subscription API
  subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('Subscriber must be a function');
    this.subscribers.add(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  _notify(key, value) {
    for (const fn of this.subscribers) {
      try { fn(key, value); } catch (e) { /* ignore subscriber errors */ }
    }
  }

  registerNative(name, fn, signature = null) {
    if (typeof fn !== 'function') throw new TypeError(`"${name}" must be a function`);
    this.functions[name] = fn;
    if (signature) this.signatures.set(name, signature);
  }

  registerSpecial(name, fn) {
    if (typeof fn !== 'function') throw new TypeError(`"${name}" must be a function`);
    this.specialForms[name] = fn;
  }

  registerOpaque(...names) {
    for (const n of names) this.opaque.add(n);
  }

  getReturnType(name) {
    return this.signatures.get(name)?.ret ?? 'any';
  }

  getArgumentTypes(name) {
    const s = this.signatures.get(name);
    if (!s) return [];
    if (s.variadic) return { type: s.args[0], variadic: true };
    return s.args;
  }

  async process(expr, context = Object.create(null)) {
    this._gas = 0;
    this._depth = 0;
    this._traces = [];
    try {
      const result = await this._eval(expr, context, []);
      if (this.opts.debug) {
        console.log('[JSONLang] ✅ Result:', result);
        console.log('[JSONLang] ⛽ Gas used:', this._gas);
      }
      return result;
    } catch (err) {
      err.traces = this._traces;
      err.gasUsed = this._gas;
      throw err;
    }
  }

  async _eval(expr, ctx, path) {
    if (++this._gas > this.opts.maxGas) {
      throw this._error('Out of gas: expression too complex', path);
    }
    if (++this._depth > this.opts.maxDepth) {
      throw this._error('Maximum call depth exceeded', path);
    }

    if (this.opts.trace) {
      this._traces.push({ path: [...path], gas: this._gas, head: Array.isArray(expr) ? expr[0] : typeof expr });
    }

    if (expr === null || typeof expr !== 'object') {
      this._depth--;
      return expr;
    }

    // Plain objects are valid literals (style props, etc.)
    if (!Array.isArray(expr)) {
      this._depth--;
      return expr;
    }

    if (expr.length === 0) throw this._error('Empty expression', path);

    const [head, ...args] = expr;

    // Opaque HTML constructors
    if (this.opaque.has(head)) {
      const props = args[0] ?? {};
      const children = args.slice(1);
      const evaluatedProps = {};

      for (const [k, v] of Object.entries(props)) {
        if (k.startsWith('on') && Array.isArray(v)) {
          if (v[0] === 'action' && v.length === 2 && typeof v[1] === 'string') {
            evaluatedProps[k] = await this._eval(v, ctx, [...path, 'prop', k]);
          } else {
            evaluatedProps[k] = { __jsonlang_handler: true, expr: v };
          }
        } else if (Array.isArray(v)) {
          evaluatedProps[k] = await this._eval(v, ctx, [...path, 'prop', k]);
        } else if (typeof v === 'object' && v !== null) {
          evaluatedProps[k] = await this._evalObject(v, ctx, [...path, 'prop', k]);
        } else {
          evaluatedProps[k] = v;
        }
      }

      const evaluatedChildren = await Promise.all(
        children.map((c, i) => this._eval(c, ctx, [...path, i]))
      );

      this._depth--;
      return [head, evaluatedProps, ...evaluatedChildren];
    }

    // Special forms (lazy evaluation)
    if (this.specialForms[head]) {
      const result = await this.specialForms[head](
        args,
        (e, p) => this._eval(e, ctx, p ?? [...path, 'special']),
        ctx,
        this.extensions
      );
      this._depth--;
      return result;
    }

    // Native functions (eager, concurrent)
    const fn = this.functions[head];
    if (!fn) throw this._error(`Unknown function: "${head}"`, path);

    const resolved = await Promise.all(
      args.map((arg, i) => this._eval(arg, ctx, [...path, i]))
    );

    const result = await fn(resolved, (e, p) => this._eval(e, ctx, p ?? [...path, 'fn']), ctx, this.extensions);
    this._depth--;
    return result;
  }

  async _evalObject(obj, ctx, path) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        out[k] = await this._eval(v, ctx, [...path, k]);
      } else if (typeof v === 'object' && v !== null) {
        out[k] = await this._evalObject(v, ctx, [...path, k]);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  _error(msg, path) {
    const err = new Error(`${msg} at /${path.join('/')}`);
    err.jsonLangPath = path;
    err.gasUsed = this._gas;
    return err;
  }

  _initCore() {
    // ── Special Forms ──
    this.registerSpecial('then', async (args, resolve, ctx) => {
      const val = await resolve(args[0]);
      const fn = await resolve(args[1]);
      if (typeof fn !== 'function') throw new TypeError('"then" expects a function');
      return await fn(val);
    });

    this.registerSpecial('if', async (args, resolve, ctx) => {
      const cond = await resolve(args[0]);
      return await resolve(cond ? args[1] : args[2]);
    });

    this.registerSpecial('seq', async (args, resolve, ctx) => {
      let last;
      for (const arg of args) {
        last = Array.isArray(arg) ? await resolve(arg) : arg;
      }
      return last;
    });

    this.registerSpecial('try', async (args, resolve, ctx) => {
      try {
        return await resolve(args[0]);
      } catch (err) {
        const handler = await resolve(args[1]);
        if (typeof handler !== 'function') throw new TypeError('"try" expects a function handler');
        return await handler(err);
      }
    });

    this.registerSpecial('let', async (args, resolve, ctx) => {
      const bindings = args.slice(0, -1);
      const body = args[args.length - 1];
      let scope = ctx;
      for (const [name, expr] of bindings) {
        const val = await resolve(expr);
        scope = Object.create(scope);
        scope[name] = val;
      }
      return Array.isArray(body) ? await this._eval(body, scope, []) : body;
    });

    this.registerSpecial('lambda', (args, resolve, ctx) => {
      const params = args[0];
      const body = args[1];
      return async (...values) => {
        let callCtx = Object.create(ctx);
        for (let i = 0; i < params.length; i++) callCtx[params[i]] = values[i];
        return Array.isArray(body) ? await this._eval(body, callCtx, []) : body;
      };
    });

    this.registerSpecial('quote', (args) => args[0]);

    this.registerSpecial('action', (args) => ({ __jsonlang_action: args[0] }));

    this.registerSpecial('run', async (args, resolve, ctx) => {
      const expr = await resolve(args[0]);
      if (Array.isArray(expr) && expr.length > 0 && typeof expr[0] === 'string') {
        return await this._eval(expr, ctx, []);
      }
      return expr;
    });

    // ── Store ──
    // MODIFIED: Added _notify call
    this.registerNative('set', (args) => {
      this.globalStore[args[0]] = args[1];
      this._notify(args[0], args[1]);
      return args[1];
    }, { args: ['string', 'any'], ret: 'any' });

    this.registerNative('get', (args) => {
      const key = args[0];
      if (!(key in this.globalStore)) throw new Error(`Store key "${key}" not found`);
      return this.globalStore[key];
    }, { args: ['string'], ret: 'any' });

    this.registerNative('del', (args) => {
      delete this.globalStore[args[0]];
      this._notify(args[0], undefined);
    }, { args: ['string'], ret: 'null' });

    this.registerNative('get_local', (args, resolve, ctx) => {
      const key = args[0];
      if (!(key in ctx)) throw new Error(`Local "${key}" not found`);
      return ctx[key];
    }, { args: ['string'], ret: 'any' });

    this.registerNative('set_local', (args, resolve, ctx) => {
      ctx[args[0]] = args[1];
      return args[1];
    }, { args: ['string', 'any'], ret: 'any' });

    // ── Path access ──
    this.registerNative('get_path', (args) => {
      let obj = args[0];
      for (let i = 1; i < args.length; i++) {
        if (obj == null || typeof obj !== 'object') return null;
        obj = obj[args[i]];
      }
      return obj;
    }, { args: ['any'], ret: 'any', variadic: true });

    // ── Math ──
    this.registerNative('sum', (args) => {
      const nums = Array.isArray(args[0]) && args.length === 1 ? args[0] : args;
      return nums.reduce((a, b) => a + b, 0);
    }, { args: ['any'], ret: 'number', variadic: true });

    this.registerNative('multiply', (args) => {
      const nums = Array.isArray(args[0]) && args.length === 1 ? args[0] : args;
      return nums.reduce((a, b) => a * b, 1);
    }, { args: ['number'], ret: 'number', variadic: true });

    this.registerNative('divide', (args) => {
      if (args[1] === 0) throw new Error('Division by zero');
      return args[0] / args[1];
    }, { args: ['number', 'number'], ret: 'number' });

    this.registerNative('mod', (args) => args[0] % args[1],
      { args: ['number', 'number'], ret: 'number' });

    this.registerNative('pow', (args) => Math.pow(args[0], args[1]),
      { args: ['number', 'number'], ret: 'number' });

    this.registerNative('random', (args) => Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0],
      { args: ['number', 'number'], ret: 'number' });

    this.registerNative('floor', (args) => Math.floor(args[0]),
      { args: ['number'], ret: 'number' });

    this.registerNative('to_number', (args) => Number(args[0]),
      { args: ['any'], ret: 'number' });

    // ── Logic ──
    this.registerNative('is', (args) => args[0] === args[1],
      { args: ['any', 'any'], ret: 'boolean' });

    this.registerNative('not', (args) => !args[0],
      { args: ['boolean'], ret: 'boolean' });

    this.registerNative('and', (args) => args.every(Boolean),
      { args: ['boolean'], ret: 'boolean', variadic: true });

    this.registerNative('or', (args) => args.some(Boolean),
      { args: ['boolean'], ret: 'boolean', variadic: true });

    this.registerNative('gt', (args) => args[0] > args[1],
      { args: ['number', 'number'], ret: 'boolean' });

    this.registerNative('lt', (args) => args[0] < args[1],
      { args: ['number', 'number'], ret: 'boolean' });

    // ── Array / Object ──
    this.registerNative('array', (args) => args,
      { args: ['any'], ret: ['array', 'any'], variadic: true });

    this.registerNative('concat', (args) => {
      if (Array.isArray(args[0])) return args.reduce((a, b) => a.concat(b), []);
      return args.join('');
    }, { args: ['any'], ret: 'any', variadic: true });

    this.registerNative('length', (args) => {
      const t = args[0];
      if (typeof t === 'string' || Array.isArray(t)) return t.length;
      if (t && typeof t === 'object') return Object.keys(t).length;
      return 0;
    }, { args: ['any'], ret: 'number' });

    this.registerNative('slice', (args) => args[0].slice(args[1], args[2]),
      { args: ['any', 'number', 'number'], ret: 'any' });

    this.registerNative('range', (args) => {
      const [start, end] = args;
      const out = [];
      if (start <= end) for (let i = start; i <= end; i++) out.push(i);
      else for (let i = start; i >= end; i--) out.push(i);
      return out;
    }, { args: ['number', 'number'], ret: ['array', 'number'] });

    // CRITICAL FIX: await all async callbacks
    this.registerNative('map', async (args) => {
      const arr = args[0];
      const fn = args[1];
      if (typeof fn !== 'function') throw new TypeError('map expects a function');
      return await Promise.all(arr.map(item => fn(item)));
    }, { args: [['array', 'any'], 'function'], ret: ['array', 'any'] });

    this.registerNative('filter', async (args) => {
      const arr = args[0];
      const fn = args[1];
      if (typeof fn !== 'function') throw new TypeError('filter expects a function');
      const mask = await Promise.all(arr.map(item => fn(item)));
      return arr.filter((_, i) => mask[i]);
    }, { args: [['array', 'any'], 'function'], ret: ['array', 'any'] });

    this.registerNative('reduce', async (args) => {
      const arr = args[0];
      const fn = args[1];
      const init = args[2];
      if (typeof fn !== 'function') throw new TypeError('reduce expects a function');
      let acc = init;
      for (const item of arr) {
        acc = await fn(acc, item);
      }
      return acc;
    }, { args: [['array', 'any'], 'function', 'any'], ret: 'any' });

    this.registerNative('find', async (args) => {
      const arr = args[0];
      const fn = args[1];
      if (typeof fn !== 'function') throw new TypeError('find expects a function');
      for (const item of arr) {
        if (await fn(item)) return item;
      }
      return undefined;
    }, { args: [['array', 'any'], 'function'], ret: 'any' });

    this.registerNative('includes', (args) => args[0].includes(args[1]),
      { args: ['any', 'any'], ret: 'boolean' });

    this.registerNative('sort', (args) => [...args[0]].sort((a, b) => a - b),
      { args: [['array', 'number']], ret: ['array', 'number'] });

    this.registerNative('object', (args) => {
      const obj = Object.create(null);
      for (let i = 0; i < args.length; i += 2) obj[args[i]] = args[i + 1];
      return obj;
    }, { args: ['any'], ret: 'object', variadic: true });

    this.registerNative('merge', (args) => ({ ...args[0], ...args[1] }),
      { args: ['object', 'object'], ret: 'object' });

    this.registerNative('keys', (args) => Object.keys(args[0]),
      { args: ['object'], ret: ['array', 'string'] });

    this.registerNative('values', (args) => Object.values(args[0]),
      { args: ['object'], ret: ['array', 'any'] });

    // ── String ──
    this.registerNative('upper', (args) => args[0].toUpperCase(),
      { args: ['string'], ret: 'string' });

    this.registerNative('lower', (args) => args[0].toLowerCase(),
      { args: ['string'], ret: 'string' });

    this.registerNative('split', (args) => args[0].split(args[1]),
      { args: ['string', 'string'], ret: ['array', 'string'] });

    this.registerNative('join', (args) => args[0].join(args[1]),
      { args: [['array', 'string'], 'string'], ret: 'string' });

    this.registerNative('trim', (args) => args[0].trim(),
      { args: ['string'], ret: 'string' });

    this.registerNative('replace', (args) => args[0].replace(args[1], args[2]),
      { args: ['string', 'string', 'string'], ret: 'string' });

    // ── Async / Time ──
    this.registerNative('sleep', (args) => new Promise(r => setTimeout(r, args[0])),
      { args: ['number'], ret: 'null' });

    this.registerNative('now', () => Date.now(),
      { args: [], ret: 'number' });

    this.registerNative('fetch_json', async (args) => {
      const res = await fetch(args[0]);
      return await res.json();
    }, { args: ['string'], ret: 'any' });

    this.registerNative('fetch_text', async (args) => {
      const res = await fetch(args[0]);
      return await res.text();
    }, { args: ['string'], ret: 'string' });

    // ── Debug ──
    this.registerNative('log', (args) => {
      console.log('[JSONLang:log]', ...args);
      return args[args.length - 1];
    }, { args: ['any'], ret: 'any', variadic: true });

    this.registerNative('trace', (args, resolve, ctx) => {
      console.log('[JSONLang:trace] Context:', Object.keys(ctx));
      console.log('[JSONLang:trace] Store:', Object.keys(this.globalStore));
      console.log('[JSONLang:trace] Gas:', this._gas);
      return args[0];
    }, { args: ['any'], ret: 'any' });

    this.registerNative('type', (args) => {
      const v = args[0];
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array';
      return typeof v;
    }, { args: ['any'], ret: 'string' });
  }
}
