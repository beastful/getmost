// page.tsx
import { GraphEditor } from './better-graph-builder';

export default function Page() {
  return (
    <main className="flex flex-col w-screen h-screen bg-neutral-900 text-gray-100 font-sans">
      <header className="px-5 py-3 border-b border-neutral-700 bg-neutral-800">
        <h1 className="text-lg font-semibold">JSONLang Graph Editor</h1>
        <p className="text-xs text-gray-400 mt-1">
          Drag blocks. Connect outputs to inputs. Execute logic through JSON expressions.
        </p>
      </header>
      <GraphEditor />
    </main>
  );
}