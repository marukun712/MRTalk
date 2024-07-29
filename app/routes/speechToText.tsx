import { ActionFunctionArgs } from "@remix-run/node";
const WIT_API_URL = 'https://api.wit.ai/speech';

export async function action({ request }: ActionFunctionArgs) {
    const audio = await request.blob();
    const audioBuffer = await audio.arrayBuffer();

    const response = await fetch(WIT_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WIT_AI_TOKEN}`,
            'Content-Type': 'audio/wav',
        },
        body: audioBuffer
    });

    return null;
}
