import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import CharacterCard from "~/components/selectCharacter/CharacterCard";
import CharacterList from "~/components/selectCharacter/CharacterList";

export async function loader({ params, request }: LoaderFunctionArgs) {
    const response = new Response();
    const queryText = params.query;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    });

    if (!queryText) return null;

    const queryKeyword = queryText.split(/\s+/).map(word => word + ":*").join(" | ");

    return await supabase
        .from("characters")
        .select("*")
        .textSearch("name,details", queryKeyword);
}

export default function Search() {
    const data = useLoaderData<typeof loader>();

    if (!data || !data.data || data.data.length === 0) return (
        <div className="py-10 text-center text-3xl font-bold">
            モデルが見つかりませんでした。
        </div>
    )

    return (
        <CharacterList title="検索結果">
            {data.data.map((character) => {
                return (
                    <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} postedby={character.postedby} />
                )
            })}
        </CharacterList>
    )
}