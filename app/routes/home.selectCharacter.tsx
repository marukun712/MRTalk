import { useLoaderData } from "@remix-run/react"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs } from "@remix-run/node"
import CharacterCard from "~/components/ui/selectCharacter/CharacterCard"

export async function loader({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return await supabase
        .from('characters')
        .select('id,name,model_url')
        .eq('postedby', user?.id)
}

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();

    const character = formData.get('character');

    if (typeof character !== "string") return;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return await supabase
        .from('profiles')
        .update({ current_character: character })
        .eq('id', user?.id)
}

export default function SelectCharacter() {
    const { data } = useLoaderData<typeof loader>();

    return (
        <div>
            <h1 className="font-bold text-3xl py-10">あなたのキャラクター</h1>
            <div className="md:flex md:flex-wrap-reverse py-5">
                {data?.map((character) => {
                    return (
                        <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} />
                    )
                })}
            </div>
        </div>

    )
}
