import {
  Form,
  useLoaderData,
  useNavigate,
  useOutletContext,
} from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Textarea } from "~/components/ui/textarea";

import { PlusIcon, UploadIcon } from "lucide-react";
import { serverClient } from "~/utils/Supabase/ServerClient";
import SelectPublic from "~/components/CharacterEdit/SelectPublic";
import { getFileURL } from "~/utils/Supabase/getFileURL";
import { getCharacterFormValues } from "~/utils/Form/getCharacterFormValues";
import { useState, FormEvent } from "react";

import { v4 } from "uuid";
import { checkVRMVersion, getVRMThumbnail } from "~/utils/VRM/getVRMMeta";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Database } from "database.types";
import { SupabaseClient } from "@supabase/supabase-js";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  return user.id;
}

export default function AddCharacter() {
  const { supabase } = useOutletContext<{
    supabase: SupabaseClient<Database>;
  }>();

  const [modelType, SetModelType] = useState<string>("VRM");
  const [open, setOpen] = useState(false);

  const userID = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  //413エラー回避のためクライアントサイドで実行
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    const {
      name,
      model_type,
      model,
      is_public,
      firstperson,
      ending,
      details,
      speaker_id,
    } = getCharacterFormValues(formData);

    if (
      typeof name !== "string" ||
      !model ||
      typeof is_public !== "string" ||
      typeof speaker_id !== "number"
    ) {
      alert("入力されたデータが不正です。");
      return;
    }

    const id = v4();
    let model_url: string;
    let thumbnail_url: string;

    //VRMの場合
    if (model_type === "VRM" && model instanceof File) {
      const vrmVersion = await checkVRMVersion(model);

      if (!vrmVersion) {
        alert(
          "VRM 0.xのモデルには対応していません。VRM 1.xのモデルにのみ対応しています。"
        );
        return;
      }

      const extension = model.name.split(".").pop(); //.vrm.pngのような拡張子がチェックを通過しないように最後の要素を取得する
      if (extension !== "vrm") {
        alert(".vrmのファイルしかアップロードできません。");
        return;
      } else {
        setOpen(true);

        const { error } = await supabase.storage
          .from("models")
          .upload(`${userID}/${id}_model.vrm`, model);
        if (error) {
          alert("モデルのアップロードに失敗しました。");
          return;
        }

        const thumbnail = await getVRMThumbnail(model);

        if (thumbnail) {
          const { error } = await supabase.storage
            .from("models")
            .upload(`${userID}/${id}_thumbnail.png`, thumbnail);
          if (error) {
            alert("サムネイルのアップロードに失敗しました。");
            return;
          }
        }

        model_url = await getFileURL(`${userID}/${id}_model.vrm`, supabase);
        thumbnail_url = await getFileURL(
          `${userID}/${id}_thumbnail.png`,
          supabase
        );
      }
    } else {
      //MMDの場合
      const url = model as unknown as string;

      model_url = url;

      thumbnail_url =
        "https://www.silhouette-illust.com/wp-content/uploads/2019/10/person_46477-600x600.jpg";
    }

    const { error } = await supabase.from("characters").insert({
      id,
      name,
      model_url,
      thumbnail_url,
      is_public,
      firstperson,
      ending,
      details,
      speaker_id,
      postedby: userID,
    });

    if (!error) {
      alert("キャラクターの登録に成功しました!");
      navigate("/character/select");
    }
  };

  return (
    <div className="m-auto md:w-1/2 w-3/4 py-14">
      <h1 className="font-bold text-3xl py-10 text-center">
        キャラクターを投稿
      </h1>

      <Form
        method="post"
        className="py-10"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="name">キャラクター名</label>
          <Input type="text" name="name" id="name" required />
        </div>

        <label htmlFor="model_type">モデルの種類を選択</label>

        <Select
          name="model_type"
          required
          onValueChange={(e) => SetModelType(e)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="モデルの種類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VRM">VRM(.vrm)</SelectItem>
            <SelectItem value="MMD">MMD(.pmx)</SelectItem>
          </SelectContent>
        </Select>

        {modelType === "VRM" ? (
          <div>
            <label htmlFor="model">
              VRMモデルを選択(VRM-1.xのモデルにのみ対応しています。)
            </label>
            <Input type="file" accept=".vrm" name="model" id="model" required />
          </div>
        ) : (
          <div>
            <label htmlFor="model">MMDモデルのURLを指定</label>
            <p className="py-2">
              MMDモデルのアップロードには対応していません。WebサーバーなどにMMDモデルをアップロードして、そのURLを指定してください。また、モデルはクロスオリジンで配信されている必要があります。クロスオリジンで配信されていない場合、モデルが正常にロードされません。
            </p>
            <Input type="text" name="model" id="model" required />
          </div>
        )}

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

      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl m-auto">
              <UploadIcon className="m-auto" />
              <p className="text-center">アップロード中...</p>
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
