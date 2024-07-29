import OpenAI from "openai";

const openai = new OpenAI();

export async function OpenAIChat(prompt: string, systemPrompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: '{content:"",emotion:"joy" || "fun" || "angry" || "sorrow",joy:0,fun:0,angry:0,sorrow:0}' }, { role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        model: "gpt-4o-mini",
        response_format: { 'type': 'json_object' }
    });

    if (!completion.choices[0].message.content) return "";

    return completion.choices[0].message.content;
}
