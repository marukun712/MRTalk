import { Form, useActionData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Textarea } from "~/components/ui/textarea";

import { PlusIcon } from "lucide-react";
import { serverClient } from "~/utils/Supabase/ServerClient";
import SelectPublic from "~/components/CharacterEdit/SelectPublic";
import { getFileURL } from "~/utils/Supabase/getFileURL";
import { getCharacterFormValues } from "~/utils/Form/getCharacterFormValues";
import { useEffect } from "react";
import { v4 } from "uuid";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const response = new Response();

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const formData = await request.formData();

  const { name, model, is_public, firstperson, ending, details, speaker_id } =
    getCharacterFormValues(formData);

  if (
    typeof name !== "string" ||
    !model ||
    typeof is_public !== "string" ||
    typeof speaker_id !== "number"
  )
    return null;

  const id = v4();

  const extension = model.name.split(".").pop(); //.vrm.pngのような拡張子がチェックを通過しないように最後の要素を取得する
  if (extension !== "vrm") {
    return ".vrmのファイルのみアップロード可能です。";
  } else {
    const { error } = await supabase.storage
      .from("models")
      .upload(`${user?.id}/${id}.vrm`, model, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) return "モデルのアップロードに失敗しました。";
  }

  const model_url = await getFileURL(`${user?.id}/${id}.vrm`, supabase);

  const { error } = await supabase.from("characters").insert({
    id,
    name,
    model_url,
    is_public,
    firstperson,
    ending,
    details,
    speaker_id,
    postedby: user.id,
  });

  if (!error) return redirect("/character/select");
  return null;
}

export default function AddCharacter() {
  const message = useActionData<typeof loader>();

  useEffect(() => {
    if (!message || typeof message !== "string") return;
    alert(message);
  }, [message]);

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="font-bold text-3xl py-10 text-center">
        キャラクターを投稿
      </h1>

      <Form method="post" className="py-10" encType="multipart/form-data">
        <div>
          <label htmlFor="name">キャラクター名</label>
          <Input type="text" name="name" id="name" required />
        </div>
        <div>
          <label htmlFor="model">
            モデルを選択(VRM-1.xのモデルにのみ対応しています。)
          </label>
          <Input type="file" accept=".vrm" name="model" id="model" required />
        </div>
        <div>
          <label htmlFor="is_public">公開設定</label>
          <SelectPublic />
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
            defaultValue={0}
            max={88}
            required
          />
        </div>

        <Button type="submit" className="bg-green-500 text-black my-12">
          <PlusIcon />
          投稿する
        </Button>
      </Form>
    </div>
  );
}
