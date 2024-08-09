import { redirect } from "@remix-run/node";

import type { LoaderFunctionArgs } from "@remix-run/node";
import { serverClient } from "~/utils/Supabase/ServerClient";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  console.log(code);

  if (code) {
    const supabase = serverClient(request, response);

    await supabase.auth.exchangeCodeForSession(code);
  }

  return redirect("/", {
    headers: response.headers,
  });
};
