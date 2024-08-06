export async function requestToOpenAI(
  text: string,
  character: any,
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
    },
    body: body,
  });

  const result = await req.json();
  return result;
}
