import { VRM } from "@pixiv/three-vrm";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, Form, redirect } from "@remix-run/react";
import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createScene } from "~/utils/WebXR/createScene";
import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { loadMixamoAnimation } from "~/utils/VRM/loadMixamoAnimation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import NotFound from "~/components/ui/404";
import {
  Heart,
  HeartOff,
  Edit,
  Eye,
  Mic,
  EyeOffIcon,
  LoaderIcon,
} from "lucide-react";
import { serverClient } from "~/utils/Supabase/ServerClient";
import { LoadMMD } from "~/utils/MMD/LoadMMD";
import { LoadMMDAnim } from "~/utils/MMD/LoadMMDAnim";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const response = new Response();
  const id = params.id;

  const supabase = serverClient(request, response);

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: character } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .single();

  if (!character) return null;

  const { data: currentUserData } = await supabase
    .from("profiles")
    .select("id,avatar_url,full_name")
    .eq("id", currentUser?.id)
    .single();

  const { data: authorData } = await supabase
    .from("profiles")
    .select("id,avatar_url,full_name")
    .eq("id", character.postedby)
    .single();

  const { data: favoriteData } = await supabase
    .from("favorites")
    .select("*")
    .eq("model_id", character.id)
    .single();

  return { authorData, character, currentUser, favoriteData, currentUserData };
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

  if (action === "favorite") {
    await supabase.from("favorites").insert({ model_id: id });

    return null;
  }

  if (action === "deleteFavorite") {
    const model_id = formData.get("id");

    await supabase.from("favorites").delete().eq("model_id", model_id);

    return null;
  }
}

export default function Character() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const initialized = useRef(false);
  const [open, setOpen] = useState(true);

  const setupThree = useCallback(async () => {
    if (!data) {
      return;
    }

    if (canvasRef.current == null || initialized.current) return;
    initialized.current = true;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
    });
    renderer.setSize(window.innerWidth / 1.5, window.innerHeight / 1.5);
    renderer.setPixelRatio(window.devicePixelRatio);

    const { scene, camera } = createScene(renderer);
    const clock = new THREE.Clock();

    let model: GLTF | THREE.SkinnedMesh;
    let vrm: VRM;
    let currentMixer: THREE.AnimationMixer;

    const character = data.character;
    const modelURL = character.model_url;

    const isVRM = modelURL.endsWith(".vrm");

    const animations: Record<string, THREE.AnimationClip> = {};

    async function loadCharacterModel() {
      try {
        if (isVRM) {
          model = await LoadVRM(modelURL);
          vrm = model.userData.vrm;
          scene.add(model.scene);

          model.scene.position.set(0, 0, 3);

          if (!vrm) return;
          animations.idle = await loadMixamoAnimation(
            "../../animations/Dancing.fbx",
            vrm
          );
        } else {
          model = await LoadMMD(modelURL);
          scene.add(model);
          model.position.set(0, 0, 3);
          model.scale.set(0.08, 0.08, 0.08);

          animations.idle = await LoadMMDAnim("../../mmd/anim/walk.vmd", model);
        }

        currentMixer = new THREE.AnimationMixer(
          model instanceof THREE.SkinnedMesh ? model : model.scene
        );

        currentMixer.timeScale = 1.0;
        currentMixer.clipAction(animations.idle).play();

        setOpen(false);
      } catch (e) {
        alert("キャラクターの読み込みに失敗しました。");
      }
    }

    loadCharacterModel();

    function animate() {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      if (vrm) {
        vrm.update(deltaTime);
      }

      if (currentMixer) {
        currentMixer.update(deltaTime);
      }
      renderer.render(scene, camera);
    }
    animate();
  }, [data, canvasRef]);

  useEffect(() => {
    setupThree();
  }, [setupThree]);

  useEffect(() => {
    if (!result) return;
    alert(result);
  }, [result]);

  if (!data || !data.authorData) return <NotFound />;

  return (
    <div>
      <canvas ref={canvasRef} className="m-auto"></canvas>

      <div className="w-3/4 m-auto">
        <h1 className="font-bold text-4xl py-2">{data.character.name}</h1>

        <div className="md:flex">
          <a href={`/profile/${data.authorData.id}`} className="flex">
            <Avatar>
              <AvatarImage
                src={data.authorData.avatar_url}
                alt={data.authorData.full_name}
              />
              <AvatarFallback>{data.authorData.full_name}</AvatarFallback>
            </Avatar>
            <h1 className="text-gray-400 px-2">
              {data.authorData.full_name} が投稿
            </h1>
          </a>

          {data.currentUser &&
          data.character.postedby === data.currentUser.id ? (
            data.character.is_public ? (
              <p className="font-bold flex">
                <Eye className="mx-2" />
                公開されています
              </p>
            ) : (
              <p className="font-bold flex">
                <EyeOffIcon className="mx-2" />
                公開されていません
              </p>
            )
          ) : (
            ""
          )}
        </div>

        <div className="md:flex gap-5">
          {data.favoriteData ? (
            <Form method="post">
              <input type="hidden" name="action" value="deleteFavorite" />
              <input type="hidden" name="id" value={data.character.id} />

              <Button type="submit">
                <HeartOff className="px-1" />
                お気に入りから削除
              </Button>
            </Form>
          ) : (
            <Form method="post">
              <input type="hidden" name="action" value="favorite" />
              <Button type="submit" className="bg-pink-300">
                <Heart className="px-1" />
                お気に入りに追加
              </Button>
            </Form>
          )}

          {data.currentUser &&
          data.character.postedby === data.currentUser.id ? (
            <a href={`/character/edit/${data.character.id}`}>
              <Button>
                <Edit className="px-1" />
                キャラクター情報を編集
              </Button>
            </a>
          ) : (
            ""
          )}

          <a href={`/talk/${data.character.id}`}>
            <Button>
              <Mic className="h-5 w-5" />
              <h1>MRでキャラクターとはなす</h1>
            </Button>
          </a>
        </div>

        {data.character.firstperson ? (
          <h1 className="py-2">一人称:{data.character.firstperson}</h1>
        ) : (
          ""
        )}
        {data.character.ending ? (
          <h1 className="py-2">語尾:{data.character.ending}</h1>
        ) : (
          ""
        )}
        {data.character.details ? (
          <h1 className="py-4">
            詳細設定プロンプト : {data.character.details}
          </h1>
        ) : (
          ""
        )}

        <h1 className="py-4">話者ID:{data.character.speaker_id}</h1>
      </div>

      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl m-auto">
              <LoaderIcon className="m-auto my-2" />
              <p className="text-center">読み込み中...</p>
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
