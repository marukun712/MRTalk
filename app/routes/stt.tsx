import { ActionFunctionArgs } from "@remix-run/node";
const url = "https://marukun-dev.com/stt/";

export async function action({ request }: ActionFunctionArgs) {
  const audio = await request.blob();
  const formData = new FormData();

  formData.append("file", audio);

  const req = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const text = await req.json();

  return text.text;
}
