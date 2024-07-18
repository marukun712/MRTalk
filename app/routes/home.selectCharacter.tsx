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
        .select('id,name, model_url,ending')
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
        <Form method="post" className="py-10">
            <Select name="character">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Character" />
                </SelectTrigger>
                <SelectContent>
                    {data?.map((character) => {
                        return (
                            <SelectItem value={character.id} key={character.id}>{character.name}</SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>

            <Button type="submit">Select Character</Button>
        </Form>
    )
}