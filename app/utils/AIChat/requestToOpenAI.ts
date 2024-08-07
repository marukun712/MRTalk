export async function requestToOpenAI(
  text: string,
  character: any,
  apiKey: string,
): Promise<{ content: string; emotion: string }> {
  const body = JSON.stringify({
    text: text,
    name: character.name,
    ending: character.ending,
    details: character.details,
    firstperson: character.firstperson,
  });

  const req = await fetch("/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${apiKey}`,
    },
    body: body,
  });

  const result = await req.json();
  return result;
}
