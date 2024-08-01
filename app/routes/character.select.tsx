import { useLoaderData, redirect } from "@remix-run/react"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs } from "@remix-run/node"
import CharacterCard from "~/components/selectCharacter/CharacterCard"

export async function loader({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    return await supabase
        .from('characters')
        .select('id,name,model_url')
        .eq('postedby', user.id)
}

export default function SelectCharacter() {
    const { data } = useLoaderData<typeof loader>();

    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <h1 className="font-bold text-3xl py-10">あなたのキャラクター</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                {data?.map((character) => {
                    return (
                        <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} />
                    )
                })}
            </div>
        </div>

    )
}
