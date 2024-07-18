import { Form } from "@remix-run/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs } from "@remix-run/node"

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();

    const name = formData.get('name');
    const model_url = formData.get('model_url');
    const ending = formData.get('ending');

    if (typeof name !== "string" || typeof model_url !== "string" || typeof ending !== "string") return;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return await supabase
        .from('characters')
        .insert({ name, model_url, ending, postedby: user?.id })
}

export default function AddCharacter() {
    return (
        <Form method="post" className="py-10">
            <div>
                <label htmlFor="title">name</label>
                <Input type="text" name="name" id="name" />
            </div>
            <div>
                <label htmlFor="title">model_url</label>
                <Input type="text" name="model_url" id="model_url" />
            </div>
            <div>
                <label htmlFor="title">ending</label>
                <Input type="text" name="ending" id="ending" />
            </div>
            <Button type="submit">キャラクターを追加</Button>
        </Form>
    )
}