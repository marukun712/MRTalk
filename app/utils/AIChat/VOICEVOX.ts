export async function VOICEVOXTTS(text: string) {
    const response = await fetch(`https://api.tts.quest/v3/voicevox/synthesis?text=${text}&speaker=20`);
    const data = await response.json();

    if (data.success) {
        // 音声のMP3ストリーミングURLを取得
        const audioUrl = data.mp3StreamingUrl;

        const response = await fetch(audioUrl);

        const audio = await response.arrayBuffer();
        console.log(audio)

        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();

        const audioBuffer = await (new Promise((res, rej) => {
            context.decodeAudioData(audio, res, rej);
        }));

        if (!audioBuffer) return;

        const source = context.createBufferSource();
        source.buffer = audioBuffer;

        source.connect(context.destination);
        source.start(0);
    }
}