import { Form, useLoaderData, redirect } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import NotFound from "~/components/ui/404";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Edit, Trash } from "lucide-react";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      request,
      response,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  return await supabase
    .from("characters")
    .select("id,name,model_url,ending,details,firstperson,postedby,is_public")
    .eq("id", id)
    .single();
}

export async function action({ params, request }: ActionFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      request,
      response,
    }
  );

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "edit") {
    const name = formData.get("name");
    const model_url = formData.get("model_url");
    const is_public = formData.get("is_public");
    const firstperson = formData.get("firstperson");
    const ending = formData.get("ending") as string | null;
    const details = formData.get("details") as string | null;

    if (
      typeof name !== "string" ||
      typeof model_url !== "string" ||
      typeof is_public !== "string"
    )
      return null;

    const { error } = await supabase
      .from("characters")
      .update({ name, model_url, is_public, firstperson, ending, details })
      .eq("id", id);

    if (!error) return redirect(`/character/details/${id}`);
    return null;
  }

  if (action === "delete") {
    const { error } = await supabase.from("characters").delete().eq("id", id);

    if (!error) return redirect(`/character/select`);
    return null;
  }

  return null;
}

export default function EditCharacter() {
  const { data } = useLoaderData<typeof loader>();

  if (!data) return <NotFound />;

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="font-bold text-3xl text-center">
        {data.name}のキャラクター情報を編集
      </h1>

      <Form method="post" className="py-10">
        <input type="hidden" name="action" value="edit" />

        <div>
          <label htmlFor="name">キャラクター名</label>
          <Input
            type="text"
            name="name"
            id="name"
            defaultValue={data.name}
            required
          />
        </div>
        <div>
          <label htmlFor="model_url">モデルURL</label>
          <Input
            type="text"
            name="model_url"
            id="model_url"
            pattern="https?://\S+"
            title="URLは、httpsで始まる絶対URLで記入してください。"
            defaultValue={data.model_url}
            required
          />
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
          <Input
            type="text"
            name="firstperson"
            id="firstperson"
            defaultValue={data.firstperson}
            required
          />
        </div>
        <div>
          <label htmlFor="ending">語尾</label>
          <Input
            type="text"
            name="ending"
            id="ending"
            defaultValue={data.ending}
          />
        </div>
        <div>
          <label htmlFor="details">詳細設定、指示</label>
          <Textarea
            name="details"
            id="details"
            className="h-36"
            defaultValue={data.details}
          />
        </div>

        <Button type="submit" className="bg-green-500 text-black my-12">
          <Edit />
          編集を確定
        </Button>
      </Form>

      <Dialog>
        <DialogTrigger>
          <Button className="bg-red-500">
            <Trash />
            キャラクターを削除
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center my-5">
              本当にキャラクターを削除しますか?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Form method="post">
              <input type="hidden" name="action" value="delete" />

              <Button type="submit" className="bg-red-500">
                <Trash />
                キャラクターを削除
              </Button>
            </Form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
