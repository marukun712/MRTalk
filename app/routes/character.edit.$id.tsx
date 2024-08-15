import { Form, useLoaderData, redirect } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Textarea } from "~/components/ui/textarea";
import NotFound from "~/components/ui/404";

import { Edit } from "lucide-react";
import { serverClient } from "~/utils/Supabase/ServerClient";
import DeleteConfirmDialog from "~/components/CharacterEdit/DeleteConfirmDialog";
import SelectPublic from "~/components/CharacterEdit/SelectPublic";
import { getCharacterFormValues } from "~/utils/Form/getCharacterFormValues";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  return await supabase.from("characters").select("*").eq("id", id).single();
}

export async function action({ params, request }: ActionFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "edit") {
    const { name, is_public, firstperson, ending, details, speaker_id } =
      getCharacterFormValues(formData);

    if (
      typeof name !== "string" ||
      typeof is_public !== "string" ||
      typeof speaker_id !== "number"
    )
      return null;

    const { error } = await supabase
      .from("characters")
      .update({
        name,
        is_public,
        firstperson,
        ending,
        details,
        speaker_id,
      })
      .eq("id", id);

    if (!error) return redirect(`/character/details/${id}`);
    return null;
  }

  if (action === "delete") {
    await supabase.storage.from("models").remove([`${user.id}/${id}.vrm`]);
    await supabase.storage.from("models").remove([`${user.id}/${id}.png`]);
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
        <Input type="hidden" name="action" value="edit" />

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
          <label htmlFor="is_public">公開設定</label>
          <SelectPublic />
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
        <div>
          <label htmlFor="speakerID">話者ID(VOICEVOX)</label>
          <p>
            話者IDは{" "}
            <a
              href="https://marukun-dev.com/tts/speakers"
              className="text-blue-300"
            >
              こちら
            </a>
            を参照してください。
          </p>
          <Input
            type="number"
            name="speakerID"
            id="speakerID"
            defaultValue={data.speaker_id}
            max={88}
            required
          />
        </div>

        <Button type="submit" className="bg-green-500 text-black my-12">
          <Edit />
          編集を確定
        </Button>
      </Form>

      <DeleteConfirmDialog />
    </div>
  );
}
