// features/graph-editor/components/Palette.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PaletteIcon, Search } from 'lucide-react';
import { NODES } from '@/features/graph-builder/lib/data/nodes';
import { Input } from '@/components/ui/input';
import { GraphActionsContext } from './graph-editor'; // adjust path if needed

export function Palette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { addNodeAtCenter } = React.useContext(GraphActionsContext);

  const categories = useMemo(() => {
    const set = new Set(NODES.map((n) => n.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    return NODES.filter((node) => {
      const matchesCategory = activeCategory === 'All' || node.category === activeCategory;
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [query, activeCategory]);

  return (
    <div className="relative inline-flex">
      <div className="relative inline-flex overflow-hidden rounded-lg p-[3px]">
        <span className="absolute p-50 inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_180deg_at_50%_50%,#ec4899_0%,#a855f7_25%,#d946ef_50%,#8b5cf6_75%,#ec4899_100%)]" />
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
        <div className="absolute translate-y-[-100%] left-[50%] translate-x-[-50%] pb-[20px] w-[450px]">
          <div className="bg-background p-5 shadow-md rounded-md border-2 h-full flex flex-col gap-5">
            {/* Поиск */}
            <div className="flex gap-2">
              <Input
                placeholder="Поиск по блокам"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Фильтры по категориям */}
            <div className="flex gap-1 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`py-1 px-3 rounded-full text-sm font-semibold transition-colors ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Сетка блоков */}
            <div className="grid grid-cols-2 gap-3 h-[200px] overflow-y-auto content-start">
              {filtered.map((node) => (
                <button
                  key={node.name}
                  onClick={(e) => {
                    e.preventDefault();
                    addNodeAtCenter(node.name);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="w-[50px] h-[50px] bg-muted rounded-lg flex items-center justify-center text-foreground shrink-0">
                    <node.icon />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{node.name}</div>
                    <div className="text-xs text-muted-foreground">{node.category}</div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
                  Блоки не найдены
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}