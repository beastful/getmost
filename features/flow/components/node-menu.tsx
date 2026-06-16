import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFlowStore } from "../store/flow-store";
import { Button } from "@/components/ui/button";
import { LineChart, Plug, Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createNodeInstance, NODE_REGISTRY } from "../lib/node_registry";

export function NodeMenu() {
    const addNode = useFlowStore((s) => s.addNode);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Plug />
                    Добавить блок
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="center" className="w-120 p-3">
                <DropdownMenuGroup className="flex flex-col gap-2 h-full">
                    <InputGroup>
                        <InputGroupInput placeholder="Поиск блоков" />
                        <InputGroupAddon align="inline-end">
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>

                    <ScrollArea className="lg:h-50 h-[120px]">
                        <div className="grid grid-cols-2 gap-4 pb-4">
                            {NODE_REGISTRY.map((node) => (
                                <button
                                    key={node.id}
                                    className="flex items-center gap-4 rounded-md p-2 text-left hover:bg-muted"
                                    onClick={() => addNode(createNodeInstance(node.id))}
                                >
                                    <div className="bg-muted w-12 h-12 min-w-12 flex rounded-md items-center justify-center">
                                        <LineChart className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{node.name}</div>
                                        <div className="text-muted-foreground text-xs">
                                            {node.description ?? node.category}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
