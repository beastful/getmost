'use client';

import { ModeToggle } from "@/features/theming/components/mode-toggle";
import TestEditor from "./editor";
import EditorInner from "./editor-inner";

export default function Test() {
    return (
        <div> 
            <TestEditor>
                <EditorInner/>
            </TestEditor>
        </div>
    );
}