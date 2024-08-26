import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  json,
  useLoaderData,
  useRevalidator,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import fontstyle from "~/font.css?url";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-remix";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import Header from "./components/ui/header";
import NotFound from "./components/ui/404";
import { serverClient } from "./utils/Supabase/ServerClient";
import ErrorPage from "./components/ui/ErrorPage";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: fontstyle },
];

export const meta: MetaFunction = () => {
  return [
    { title: "MRTalk" },
    {
      name: "description",
      content:
        "MRTalkは、Meta Quest3とWebブラウザだけで、VRMやMMDのキャラクターと現実世界で音声会話をすることができるWebアプリです。",
    },
    {
      property: "og:image",
      content:
        "https://github.com/marukun712/MRTalk/raw/master/public/img/demo.png",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  };

  const response = new Response();

  const supabase = serverClient(request, response);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return json(
    {
      env,
      session,
      user,
    },
    {
      headers: response.headers,
    }
  );
};

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
  const { env, session, user } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const [supabase] = useState(() =>
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event !== "INITIAL_SESSION" &&
        session?.access_token !== serverAccessToken
      ) {
        revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, supabase, revalidate]);

  return (
    <div>
      <Header signin={!!session} supabase={supabase} user={user!} />
      <Outlet context={{ supabase }} />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <html lang="jp">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <h1>
          {isRouteErrorResponse(error) ? (
            error.status === 404 ? (
              <NotFound />
            ) : error instanceof Error ? (
              <ErrorPage message={error.message} />
            ) : (
              <ErrorPage message={""} />
            )
          ) : (
            <ErrorPage message={""} />
          )}
        </h1>
        <Scripts />
      </body>
    </html>
  );
}
