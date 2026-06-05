// features/graph-editor/components/Palette.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaletteIcon } from 'lucide-react';
import { NODES } from '@/features/graph-builder/lib/data/nodes';
import { Card } from '@/components/ui/card';
import { useGraphStore } from '../store/graph-store';

export function Palette() {
  const [open, setOpen] = useState(false);
  const addNode = useGraphStore((s) => s.addNode);

  const grouped = NODES.reduce((acc, node) => {
    acc[node.category] = acc[node.category] || [];
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, typeof NODES>);

  return (
    <div className="relative inline-flex">
      <div className="relative inline-flex overflow-hidden rounded-lg p-[2px]">
        <span className="p-50 absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_180deg_at_50%_50%,#ec4899_0%,#a855f7_25%,#d946ef_50%,#8b5cf6_75%,#ec4899_100%)]" />
        <Button
          variant="ghost"
          size="lg"
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
          }}
          className="relative rounded-md bg-background hover:bg-accent border-0 font-semibold"
        >
          <PaletteIcon className="mr-2 h-5 w-5" />
          Палитра блоков
        </Button>
      </div>

      {open && (
        <div className="absolute translate-y-[-100%] left-[50%] translate-x-[-50%] pb-[20px]">
          <Card className="bg-background h-[300px] overflow-y-auto">
            {Object.entries(grouped).map(([category, nodes]) => (
              <div key={category} className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {category}
                </div>
                {nodes.map((node) => (
                  <button
                    key={node.name}
                    onClick={(e) => {
                      e.preventDefault();
                      addNode(node.name);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-gray-100 text-left text-sm text-gray-700 transition-colors"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-gray-500">
                      <node.icon />
                    </span>
                    {node.name}
                  </button>
                ))}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
