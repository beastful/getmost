// These are not registered globally; they are provided in the evaluation context.
// We'll export a function that adds them to the engine for a given evaluation.

export function injectGraphFunctions(engine, graphContext) {
  // $input – read current node's input value
  engine.registerNative('$input', (args, resolve, ctx) => {
    const inputName = args[0];
    return ctx.nodeInputs?.[inputName];
  });

  // $output – get another node's output (demand evaluated)
  engine.registerNative('$output', async (args, resolve, ctx) => {
    const [targetNodeId, outputId] = args;
    return await graphContext.getNodeOutput(targetNodeId, outputId);
  });

  // $use_input – marker for UI control (returns descriptor)
  engine.registerNative('$use_input', (args) => {
    const [fieldName, defaultValue] = args;
    return { __control: true, fieldName, defaultValue };
  });

  // $save – persist a value (e.g., to backend or Yjs)
  engine.registerNative('$save', async (args, resolve, ctx) => {
    const [key, valueExpr] = args;
    const val = await resolve(valueExpr);
    await graphContext.save(key, val);
    return val;
  });

  // $export – return serialized graph outputs
  engine.registerNative('$export', async (args, resolve, ctx) => {
    const format = args[0] || 'json';
    return await graphContext.exportOutputs(format);
  });

  // Local store (per evaluation)
  engine.registerNative('$set_local', (args, resolve, ctx) => {
    ctx[args[0]] = args[1];
    return args[1];
  });
  engine.registerNative('$get_local', (args, resolve, ctx) => ctx[args[0]]);
}