import { Button } from "~/components/ui/button"
import { Box, PlusIcon } from 'lucide-react';
import { createServerClient } from "@supabase/auth-helpers-remix";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import CharacterCard from "~/components/selectCharacter/CharacterCard";

export async function loader({ request }: LoaderFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    return await supabase
        .from('characters')
        .select('id,name,model_url,postedby')
        .limit(10)
}

export default function Index() {
    const { data } = useLoaderData<typeof loader>();

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1">
                <section className="bg-background py-12 md:py-20">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-6xl font-bold">TalkWithVRM</h1>
                            <p className="text-muted-foreground text-lg">
                            </p>
                            <div className="flex gap-8">
                                <a href="/character/add">
                                    <Button variant="secondary">
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        キャラクターを追加
                                    </Button>
                                </a>
                                <a href="/character/select">
                                    <Button variant="secondary">
                                        <Box className="w-4 h-4 mr-2" />
                                        モデルを選択
                                    </Button>
                                </a>
                            </div>
                        </div>
                        <div className="relative">
                            <img
                                src="https://github.com/pixiv/three-vrm/raw/dev/three-vrm.png"
                                alt="three-vrm"
                                width={600}
                                height={600}
                                className="mx-auto max-w-full rounded-lg shadow-lg"
                            />
                        </div>
                    </div>
                </section>

                <section className="py-12 md:py-20">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold">最新のキャラクター</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                            {data?.map((character) => {
                                return (
                                    <CharacterCard id={character.id} name={character.name} model_url={character.model_url} key={character.id} postedby={character.postedby} />
                                )
                            })}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}
