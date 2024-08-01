import { ActionFunctionArgs } from "@remix-run/node";

const url = 'https://marukun-dev.com/tts/';

export async function action({ request }: ActionFunctionArgs) {
    try {
        const text = await request.text();

        const audio_query_response = await fetch(`${url}/audio_query?text=${encodeURIComponent(text)}&speaker=20`, {
            method: 'POST'
        });
        if (!audio_query_response.ok) {
            throw new Error(`Audio query failed: ${audio_query_response.status}`);
        }
        const audio_query = await audio_query_response.json();

        const synthesis_response = await fetch(`${url}/synthesis?speaker=20`, {
            method: 'POST',
            headers: {
                "accept": "audio/wav",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(audio_query)
        });
        if (!synthesis_response.ok) {
            throw new Error(`Synthesis failed: ${synthesis_response.status}`);
        }

        const audio = await synthesis_response.arrayBuffer();

        if (!audio) return null;

        return new Response(audio, {
            headers: {
                "Content-Type": "audio/wav"
            }
        });
    } catch (error) {
        console.error('Error in TTS action:', error);
        return new Response('Error processing TTS request', { status: 500 });
    }
}