import { Form } from "@remix-run/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { createServerClient } from "@supabase/auth-helpers-remix"
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node"
import { Textarea } from "~/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { PlusIcon } from "lucide-react"

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

    return null;
}

export async function action({ request }: ActionFunctionArgs) {
    const response = new Response()

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const formData = await request.formData();

    const name = formData.get('name');
    const model_url = formData.get('model_url');
    const is_public = formData.get('is_public');
    const firstperson = formData.get('firstperson');
    const ending = formData.get('ending') as string | null;
    const details = formData.get('details') as string | null;

    if (typeof name !== "string" || typeof model_url !== "string" || typeof is_public !== "string") return null;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { error } = await supabase
        .from('characters')
        .insert({ name, model_url, is_public, firstperson, ending, details, postedby: user.id })

    if (!error) return redirect("/character/select");
    return null;
}

export default function AddCharacter() {
    return (
        <div className="m-auto md:w-1/2 w-3/4 py-14">
            <h1 className="font-bold text-3xl py-10 text-center">キャラクターを投稿</h1>

            <Form method="post" className="py-10">
                <div>
                    <label htmlFor="name">キャラクター名</label>
                    <Input type="text" name="name" id="name" required />
                </div>
                <div>
                    <label htmlFor="model_url">モデルURL</label>
                    <Input type="text" name="model_url" id="model_url" pattern="https?://\S+" title="URLは、httpsで始まる絶対URLで記入してください。" required />
                </div>
                <div>
                    <label htmlFor="is_public">公開設定</label>
                    <Select name="is_public" required>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="公開設定" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FALSE">非公開</SelectItem>
                            <SelectItem value="TRUE">公開</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label htmlFor="firstperson">一人称</label>
                    <Input type="text" name="firstperson" id="firstperson" required />
                </div>
                <div>
                    <label htmlFor="ending">語尾</label>
                    <Input type="text" name="ending" id="ending" />
                </div>
                <div>
                    <label htmlFor="details">詳細設定、指示</label>
                    <Textarea name="details" id="details" className="h-36" />
                </div>
                <Button type="submit" className="bg-green-500 text-black my-12"><PlusIcon />編集を確定</Button>
            </Form>
        </div>
    )
}
