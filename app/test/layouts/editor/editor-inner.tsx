'use client';

import { ModeToggle } from "@/features/theming/components/mode-toggle";
import TestEditor from "./editor";
import { Panel } from "@xyflow/react";
import * as React from "react"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Icon from "@/components/logo";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarImage,
} from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Copy, Save, Star, Trash } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";

export function AvatarGroupExample() {
    return (
        <AvatarGroup className="grayscale">
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarImage src="https://github.com/maxleiter.png" alt="@maxleiter" />
                <AvatarFallback>LR</AvatarFallback>
            </Avatar>
            <Avatar>
                <AvatarImage

                    alt="@evilrabbit"
                />
                <AvatarFallback>ER</AvatarFallback>
            </Avatar>
        </AvatarGroup>
    )
}

export function DropdownMenuDemo() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">Open</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="start">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuItem>
                        Profile
                        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Billing
                        <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Settings
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>Team</DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>Email</DropdownMenuItem>
                                <DropdownMenuItem>Message</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>More...</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem>
                        New Team
                        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>GitHub</DropdownMenuItem>
                    <DropdownMenuItem>Support</DropdownMenuItem>
                    <DropdownMenuItem disabled>API</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        Log out
                        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

type Framework = {
    label: string
    value: string
}

const frameworks: Framework[] = [
    { label: "Next.js", value: "next" },
    { label: "SvelteKit", value: "sveltekit" },
    { label: "Nuxt", value: "nuxt" },
]

export function FileSelector() {
    return (
        <Combobox items={frameworks}>
            <ComboboxInput width={20} className={`bg-background`} placeholder="Select a framework" />
            <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
                    {(item) => (
                        <ComboboxItem key={Math.random()} value={item}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

function TopLeft() {
    return (
        <div>
            <Button variant={"outline"}>
                <Icon className="text-forground" />
            </Button>
        </div>
    )
}

function SocialButtons() {
    return (
        <div className="flex gap-1">
            <Button variant={"outline"}><Save /></Button>
            <Button variant={"outline"}><Star /></Button>
            <Button variant={"outline"}><Star /></Button>
            <Button variant={"outline"}><Star /></Button>
        </div>
    )
}

function ControlButons() {
    return (
        <div className="flex gap-1">
            <ModeToggle />
            <Button variant={"outline"}><Star /></Button>
        </div>
    )
}

export default function EditorInner() {
    return (
        <div>
            <Panel position="top-left">
                <div className="flex gap-2">
                    <TopLeft />
                    <DropdownMenuDemo />
                </div>
            </Panel>
            <Panel position="top-center">
                <ButtonGroup>
                    <Button variant={"outline"}>
                        <Trash />
                    </Button>
                    <Button variant={"outline"}>
                        <Copy />
                    </Button>
                </ButtonGroup>
            </Panel>
            <Panel position="top-right">
                <div className="flex items-center gap-2">
                    <DropdownMenuDemo />
                    <AvatarGroupExample />
                    <Switch id="airplane-mode" />
                </div>
            </Panel>
            <Panel position="bottom-left">
                <SocialButtons />
            </Panel>
            <Panel position="bottom-center">
                <Button variant={"outline"}>Nodes</Button>
            </Panel>
            <Panel position="bottom-right">
                <ControlButons />
            </Panel>
        </div>
    );
}