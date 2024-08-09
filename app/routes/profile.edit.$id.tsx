import { Form, useLoaderData, redirect } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import NotFound from "~/components/ui/404";
import { Edit } from "lucide-react";
import { serverClient } from "~/utils/Supabase/ServerClient";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = serverClient(request, response);

  const { data: userData } = await supabase
    .from("profiles")
    .select("avatar_url,full_name")
    .eq("id", id)
    .single();

  return { userData };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = serverClient(request, response);

  const formData = await request.formData();

  const full_name = formData.get("full_name");
  const avatar_url = formData.get("avatar_url");

  if (typeof full_name !== "string" || typeof avatar_url !== "string")
    return null;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, avatar_url })
    .eq("id", id);

  if (!error) return redirect(`/profile/${id}`);

  return null;
}

export default function Profile() {
  const data = useLoaderData<typeof loader>();

  if (!data.userData) return <NotFound />;

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="font-bold text-3xl text-center">
        {data.userData.full_name}のユーザー情報を編集
      </h1>

      <Form method="post" className="py-10">
        <div>
          <label htmlFor="name">ユーザー名</label>
          <Input
            type="text"
            name="full_name"
            id="full_name"
            defaultValue={data.userData.full_name}
            required
          />
        </div>
        <div>
          <label htmlFor="model_url">アイコンURL</label>
          <Input
            type="text"
            name="avatar_url"
            id="model_url"
            pattern="https?://\S+"
            title="URLは、httpsで始まる絶対URLで記入してください。"
            defaultValue={data.userData.avatar_url}
            required
          />
        </div>

        <Button type="submit" className="bg-green-500 text-black my-12">
          <Edit />
          編集を確定
        </Button>
      </Form>
    </div>
  );
}
