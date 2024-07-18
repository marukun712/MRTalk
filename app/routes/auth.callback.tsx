import { redirect } from '@remix-run/node'
import { createServerClient } from '@supabase/auth-helpers-remix'

import type { LoaderFunctionArgs } from '@remix-run/node'

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const response = new Response()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    console.log(code);

    if (code) {
        const supabaseClient = createServerClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            { request, response }
        )
        await supabaseClient.auth.exchangeCodeForSession(code)
    }

    return redirect('/home', {
        headers: response.headers,
    })
}