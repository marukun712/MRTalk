import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    json,
    useLoaderData,
    useRevalidator
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import { useState, useEffect } from "react";
import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-remix";
import { LoaderFunctionArgs } from "@remix-run/node";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: stylesheet },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const env = {
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    }

    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    return json(
        {
            env,
            session,
        },
        {
            headers: response.headers,
        }
    )
}

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="jp">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    const { env, session } = useLoaderData<typeof loader>()
    const { revalidate } = useRevalidator()

    const [supabase] = useState(() =>
        createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
    )

    const serverAccessToken = session?.access_token

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event !== 'INITIAL_SESSION' && session?.access_token !== serverAccessToken) {
                // server and client are out of sync.
                revalidate()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [serverAccessToken, supabase, revalidate])

    return <Outlet context={{ supabase }} />;
}
