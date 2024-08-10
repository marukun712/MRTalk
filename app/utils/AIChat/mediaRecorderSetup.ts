export async function setupMediaRecorder(
  onDataAvailable: (event: BlobEvent) => void,
  onStop: () => void,
) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.onstart = () => console.log("Recording started");
  mediaRecorder.ondataavailable = onDataAvailable;
  mediaRecorder.onstop = onStop;

  return mediaRecorder;
}
