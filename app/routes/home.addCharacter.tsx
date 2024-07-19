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
    const ending = formData.get('ending') ? formData.get('ending') : null;
    const details = formData.get('details') ? formData.get('ending') : null;

    if (typeof name !== "string" || typeof model_url !== "string" || typeof ending !== "string" || typeof ending !== "string") return;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return await supabase
        .from('characters')
        .insert({ name, model_url, ending, details, postedby: user?.id })
}

export default function AddCharacter() {
    return (
        <Form method="post" className="py-10">
            <div>
                <label htmlFor="title">キャラクター名</label>
                <Input type="text" name="name" id="name" required />
            </div>
            <div>
                <label htmlFor="title">モデルURL</label>
                <Input type="text" name="model_url" id="model_url" pattern="https?://\S+" title="URLは、httpsで始まる絶対URLで記入してください。" required />
            </div>
            <div>
                <label htmlFor="title">語尾</label>
                <Input type="text" name="ending" id="ending" />
            </div>
            <div>
                <label htmlFor="title">詳細設定、指示</label>
                <Input type="text" name="details" id="details" />
            </div>
            <Button type="submit">キャラクターを追加</Button>
        </Form>
    )
}
