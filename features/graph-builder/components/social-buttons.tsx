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
import { Box, Download, Plus, Save, Star, Store } from "lucide-react";

export function SocialButtons() {
    return (
      <div className="flex gap-1">
        <Button variant="outline" size={"icon"}>
            <Save />
        </Button>
        <Button variant="outline" size={"icon"}>
            <Star />
        </Button>
        <Button variant="outline" size={"icon"}>
            <Box />
        </Button>
        <Button variant="outline" size={"icon"}>
            <Store />
        </Button>
      </div>
    )
}
