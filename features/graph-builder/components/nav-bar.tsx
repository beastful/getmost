import Image from "next/image";
import {
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarGroup,
    MenubarItem,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/components/ui/menubar"
import { Button } from "@/components/ui/button";
import { ChevronDown, FileArchive, FileEdit, Plus, PlusCircle } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";

export function NavBar() {
    return (
        <div className="flex items-center justify-center gap-1">
            <Menubar className="bg-background">
                <div className="w-8 flex justify-center">
                    <Image alt="Most" width={20} height={20} src="/logo.svg" />
                </div>
                <MenubarMenu>
                    <MenubarTrigger className="flex gap-2">
                        <span>
                            Файлы
                        </span>
                        <ChevronDown size={15} />
                    </MenubarTrigger>
                    <MenubarContent>
                        <Button size={"sm"} variant={"ghost"} className="w-full">
                           <PlusCircle /> Новый файл
                        </Button>
                        <MenubarGroup>
                            <MenubarItem>
                                File 1
                            </MenubarItem>
                            <MenubarItem>
                                File 2
                            </MenubarItem>
                            <MenubarItem>
                                File 1
                            </MenubarItem>
                            <MenubarItem>
                                File 2
                            </MenubarItem>
                            <MenubarItem>
                                File 1
                            </MenubarItem>
                            <MenubarItem>
                                File 2
                            </MenubarItem>
                        </MenubarGroup>
                        <div className="w-full flex">
                            <Button size={"sm"} variant={"ghost"}>Prev</Button>
                            <div className="text-xs font-semibold w-full flex justify-center items-center"></div>
                            <Button size={"sm"} variant={"ghost"}>Next</Button>
                        </div>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger className="flex gap-2">
                        <span>
                            New node
                        </span>
                    </MenubarTrigger>
                </MenubarMenu>
            </Menubar>
            <Button variant="outline" size={"icon"}>
                <FileEdit />
            </Button>
        </div>
    )
}
