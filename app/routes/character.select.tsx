import { useLoaderData, redirect } from "@remix-run/react"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { LoaderFunctionArgs } from "@remix-run/node"
import CharacterCard from "~/components/selectCharacter/CharacterCard"

export async function loader({ request }: LoaderFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: myCharacter } = await supabase
        .from('characters')
        .select('id,name,model_url,postedby')
        .eq('postedby', user.id)

    const { data: favorites } = await supabase
        .from('favorites')
        .select('characters(*)')
        .eq('user_id', user.id)

    return { myCharacter, favorites }
}

export default function SelectCharacter() {
    const data = useLoaderData<typeof loader>();

    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <h1 className="font-bold text-3xl py-10">あなたのキャラクター</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                {data?.myCharacter?.map((character) => {
                    return (
                        <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} postedby={character.postedby} />
                    )
                })}
            </div>

            <h1 className="font-bold text-3xl py-10">お気に入りのキャラクター</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                {data?.favorites?.map((favorite) => {
                    return (
                        <CharacterCard id={favorite.characters.id} name={favorite.characters.name} model_url={favorite.characters.model_url} key={favorite.characters.id} postedby={favorite.characters.postedby} />
                    )
                })}
            </div>
        </div>
    )
}
