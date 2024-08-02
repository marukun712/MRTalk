import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { createServerClient } from "@supabase/auth-helpers-remix";
import { LoaderFunctionArgs } from "@remix-run/node";
import NotFound from "~/components/ui/404";
import { useLoaderData } from "@remix-run/react";
import CharacterCard from "~/components/selectCharacter/CharacterCard";
import { Button } from "~/components/ui/button";

export async function loader({ params, request }: LoaderFunctionArgs) {
    const response = new Response()
    const id = params.id;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { data: character } = await supabase
        .from('characters')
        .select('id,name,model_url,ending,details,firstperson,postedby')
        .eq('postedby', id)

    const { data: userData } = await supabase
        .from('profiles')
        .select('id,avatar_url,full_name')
        .eq('id', id)
        .single();

    return { userData, character, currentUser }
}

export default function Profile() {
    const data = useLoaderData<typeof loader>();

    if (!data.userData) return <NotFound />

    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={data.userData.avatar_url} />
                    <AvatarFallback>{data.userData.full_name}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center">
                    <h1 className="text-3xl font-bold">{data.userData.full_name}</h1>
                </div>
            </div>
            {data.currentUser && data.userData.id == data.currentUser.id ? <a href={`/profile/edit/${data.currentUser.id}`} className="my-5 mx-5 flex justify-center"><Button>ユーザー情報を編集</Button></a> : ""}
            {data.character ?
                <div>
                    <h1 className="text-3xl font-bold">投稿したキャラクター</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 py-16">
                        {data.character.map((character) => {
                            return (
                                <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} postedby={character.postedby} />
                            )
                        })}
                    </div>
                </div> :
                ""}
        </div>
    )
}

