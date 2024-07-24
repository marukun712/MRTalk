import { Form, useLoaderData } from "@remix-run/react"
import { Button } from "~/components/ui/button"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs } from "@remix-run/node"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "~/components/ui/card"
import { Await } from "@remix-run/react"
import { getVRMThumbnail } from "~/utils/VRM/getVRMThumbnail"

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
            {data?.map((character) => {
                return (
                    <Card key={character.id}>
                        <CardHeader>
                            hoge
                        </CardHeader>
                        <CardContent>
                            <h1>{character.name}</h1>
                        </CardContent>
                        <CardFooter>
                            <Form method="post">
                                <Select name="character">
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select Character" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={character.id} defaultValue={character.id}>{character.name}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button type="submit">Select Character</Button>
                            </Form>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
