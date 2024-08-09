import type { ActionFunctionArgs } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { Form } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { redirect } from "@remix-run/node";
import { serverClient } from "~/utils/Supabase/ServerClient";

export async function action({ request }: ActionFunctionArgs) {
  const response = new Response();
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  const supabase = serverClient(request, response);

  const formData = await request.formData();
  const otp = formData.get("otp")?.toString();

  if (typeof otp !== "string" || typeof email !== "string") return null;

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (!error) {
    return redirect(`/`, {
      headers: response.headers,
    });
  } else {
    return alert("ワンタイムパスワードが不正です!");
  }
}

export default function VerifyOTP() {
  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <Form method="post" className="py-10">
        <div>
          <label htmlFor="title">ワンタイムパスワードを入力</label>
          <Input type="number" name="otp" id="otp" />
        </div>
        <Button type="submit">認証</Button>
      </Form>
    </div>
  );
}
