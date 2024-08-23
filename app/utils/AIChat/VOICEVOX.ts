export async function VOICEVOXTTS(text: string, speakerID: number) {
  const req = await fetch(`/tts?speaker=${speakerID}`, {
    method: "POST",
    body: text,
  });
  const audio = await req.arrayBuffer();

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
