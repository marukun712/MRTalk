import { useEffect } from "react";
import { VOICEVOXTTS } from "~/utils/AIChat/VOICEVOX";

export default function Speech() {
    useEffect(() => {
        VOICEVOXTTS("こんにちは。")
    }, [])

    return (
        <h1>音声認識サンプル</h1>
    )
}