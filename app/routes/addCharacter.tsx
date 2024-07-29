import { Form, useActionData } from "@remix-run/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs } from "@remix-run/node"
import { Textarea } from "~/components/ui/textarea"
import { useEffect } from "react"

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();

    const name = formData.get('name');
    const model_url = formData.get('model_url');
    const firstperson = formData.get('firstperson');
    const ending = formData.get('ending') ? formData.get('ending') : null;
    const details = formData.get('details') ? formData.get('details') : null;

    if (typeof name !== "string" || typeof model_url !== "string") return;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('characters')
        .insert({ name, model_url, firstperson, ending, details, postedby: user?.id })

    if (!error) return "正常にキャラクターを追加しました！"
    return null;
}

export default function AddCharacter() {
    const result = useActionData<typeof action>();

    useEffect(() => {
        if (!result) return;
        alert(result);
    }, [result])

    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
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
                    <label htmlFor="title">一人称</label>
                    <Input type="text" name="firstperson" id="firstperson" required />
                </div>
                <div>
                    <label htmlFor="title">語尾</label>
                    <Input type="text" name="ending" id="ending" />
                </div>
                <div>
                    <label htmlFor="title">詳細設定、指示</label>
                    <Textarea name="details" id="details" className="h-36" />
                </div>
                <Button type="submit">キャラクターを追加</Button>
            </Form>
        </div>
    )
}
