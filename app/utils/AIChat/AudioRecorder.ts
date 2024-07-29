export async function startVoiceRecognition() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: any[] = [];

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: "audio/wav" });

        const response = await fetch('/speechToText', {
            method: 'POST',
            body: blob
        });

        const result = await response.text();
        console.log(result)
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 1000);
}