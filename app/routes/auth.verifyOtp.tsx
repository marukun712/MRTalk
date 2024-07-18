import type { ActionFunctionArgs } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { Form } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { redirect } from '@remix-run/node'

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();
    const otp = formData.get('otp');

    if (typeof otp !== "string" || typeof email !== "string") return;

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
    })
    console.log(data, error)

    if (data) {
        return redirect(`/auth/verifyOtp?email=${email}`, {
            headers: response.headers,
        })
    } else {
        return alert("ワンタイムパスワードが不正です!")
    }
}

export default function VerifyOTP() {
    return (
        <div className="m-auto w-1/2 py-14">
            <Form method="post" className="py-10">
                <div>
                    <label htmlFor="title">ワンタイムパスワードを入力</label>
                    <Input type="text" name="otp" id="otp" />
                </div>
                <Button type="submit">認証</Button>
            </Form>
        </div>
    )
}