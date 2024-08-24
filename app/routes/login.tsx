import type { ActionFunctionArgs } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { useOutletContext, Form } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { SupabaseClient } from "@supabase/auth-helpers-remix";
import { Database } from "database.types";
import { redirect } from "@remix-run/node";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { serverClient } from "~/utils/Supabase/ServerClient";

export async function action({ request }: ActionFunctionArgs) {
  const response = new Response();
  const url = new URL(request.url);

  const supabase = serverClient(request, response);

  const formData = await request.formData();
  const email = formData.get("email");

  if (typeof email !== "string") return null;

  await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: url.origin + "/auth/callback",
    },
  });

  return redirect(`/auth/verifyOtp?email=${email}`);
}

export default function Login() {
  const { supabase } = useOutletContext<{
    supabase: SupabaseClient<Database>;
  }>();

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  };

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="text-4xl font-bold text-center py-10">MRTalkにログイン</h1>
      <Button onClick={handleGitHubLogin} className="my-6">
        <GitHubLogoIcon className="mx-2" />
        GitHub Login
      </Button>

      <Form method="post" className="py-10">
        <div>
          <label htmlFor="title">email</label>
          <Input type="email" name="email" id="email" required />
        </div>
        <Button type="submit">ワンタイムパスワードを送信</Button>
      </Form>

      <h1>
        アカウントを持っていませんか?{" "}
        <a href="/signup" className="text-blue-400">
          サインアップ
        </a>
      </h1>
    </div>
  );
}
