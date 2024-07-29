import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { useOutletContext, Form, Outlet, useLoaderData } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { createServerClient, SupabaseClient } from "@supabase/auth-helpers-remix";
import { Database } from "database.types";
import { redirect } from '@remix-run/node'

export const meta: MetaFunction = () => {
    return [
        { title: "VRMと会話MR" },
        { name: "description", content: "Welcome to Remix!" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const response = new Response();

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return user
}

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()
    const url = new URL(request.url);

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();
    const email = formData.get('email');

    if (typeof email !== "string") return;

    await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: url.origin + '/auth/callback'
        }
    })

    return redirect(`/auth/verifyOtp?email=${email}`)
}

export default function Home() {
    const { supabase } = useOutletContext<{ supabase: SupabaseClient<Database> }>();
    const user = useLoaderData<typeof loader>();

    const handleGitHubLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + '/auth/callback',
            },
        })
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()

        location.reload();
    }

    if (!user) return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <Button onClick={handleGitHubLogin}>GitHub Login</Button>
            <Form method="post" className="py-10">
                <div>
                    <label htmlFor="title">email</label>
                    <Input type="text" name="email" id="email" />
                </div>
                <Button type="submit">ワンタイムパスワードを送信</Button>
            </Form>
        </div>
    )

    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <Button onClick={handleLogout}>Logout</Button>
            <p>{user.user_metadata.full_name} でログイン中</p>

            <Outlet />
        </div>
    )
}