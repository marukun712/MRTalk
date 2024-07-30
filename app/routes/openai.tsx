import { OpenAIChat } from "~/utils/AIChat/OpenAIChat"
import { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
    const json = await request.json();

    const systemPrompt = `あなたの名前は「${json.name}」です。あなたの一人称は「${json.firstperson}」です。あなたは必ず15単語以下で返答します。あなたはユーザーとフレンドリーに会話をします。${json.ending ? `あなたは、語尾に必ず「${json.ending}」を自然な形で付けます。` : ""}${json.details ? `あなたの詳細設定は以下の通りです。${json.details} 以上の詳細設定を、忠実に守ってください。` : ""}深呼吸して、リラックスして考えてください。あなたは必ずレスポンスをJSON形式で返します。あなたはJoy,Fun,Sorrow,Angryの四つの感情を持ちます。感情のスコアと、一番大きな感情を、必ずJSONで出力します。`
    const message = await OpenAIChat(json.text, systemPrompt)

    const result = JSON.parse(message);
    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}