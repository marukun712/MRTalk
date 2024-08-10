import { useEffect, useCallback, useRef, useState, FormEvent } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, redirect, useLoaderData } from "@remix-run/react";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM } from "@pixiv/three-vrm";

import { setupNavMeshAndCrowd } from "~/utils/Three/setupNavMeshAndCrowd";
import { setupControllers } from "~/utils/Three/controllerSetup";
import { setupMediaRecorder } from "~/utils/AIChat/mediaRecorderSetup";
import { resetEmotion, setEmotion } from "~/utils/AIChat/emotionAndTextbox";

import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { LoadMMD } from "~/utils/MMD/LoadMMD";
import { loadMixamoAnimation } from "~/utils/VRM/loadMixamoAnimation";
import { LoadMMDAnim } from "~/utils/MMD/LoadMMDAnim";
import { VOICEVOXTTS } from "~/utils/AIChat/VOICEVOX";
import { requestToOpenAI } from "~/utils/AIChat/requestToOpenAI";
import { XRPlanes } from "~/utils/Three/XRPlanes";
import { createScene } from "~/utils/Three/createScene";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { serverClient } from "~/utils/Supabase/ServerClient";
import { init, Crowd, CrowdAgent, NavMeshQuery } from "recast-navigation";
import SpriteText from "three-spritetext";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();
  const supabase = serverClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: currentUserData } = await supabase
    .from("profiles")
    .select("current_character")
    .eq("id", user.id);

  if (!currentUserData || currentUserData.length === 0) return null;
  const characterID = currentUserData[0].current_character;

  const { data: characterData } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterID)
    .single();

  if (!characterData) return null;

  return { character: characterData };
}

export default function Three() {
  const data = useLoaderData<typeof loader>();
  const initialized = useRef(false);
  const [key, setKey] = useState<string>("");
  const [open, setOpen] = useState(true);

  const setupThree = useCallback(async () => {
    if (!data) {
      alert(
        "キャラクターデータの取得に失敗しました。キャラクターが設定されているか確認してください。"
      );
      return;
    }

    if (initialized.current) return;

    initialized.current = true;

    await init();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

    //WebXRを有効化
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    document.body.appendChild(
      ARButton.createButton(renderer, {
        requiredFeatures: ["plane-detection", "hand-tracking"],
      })
    );

    //シーンの作成
    const { scene, camera } = createScene(renderer);

    const clock = new THREE.Clock();
    const xr = renderer.xr;
    const grounds = XRPlanes(xr, scene);

    let crowd: Crowd;
    let agent: CrowdAgent;
    let navMeshQuery: NavMeshQuery;
    let lowestGround: THREE.Mesh | null = null;
    let model: GLTF | THREE.SkinnedMesh;
    let vrm: VRM;
    let currentMixer: THREE.AnimationMixer;
    let textbox: THREE.Sprite;
    let mediaRecorder: MediaRecorder;
    const audioChunks: Blob[] = [];

    let talking = false;
    let talkMode = false;

    const character = data.character;
    const modelURL = character.model_url;
    //const modelURL = "./mmd/桜乃そら/桜乃そら.pmx";

    const isVRM = modelURL.endsWith(".vrm");

    const animations: Record<string, THREE.AnimationClip> = {};

    async function loadCharacterModel() {
      try {
        if (isVRM) {
          model = await LoadVRM(modelURL);
          vrm = model.userData.vrm;
          scene.add(model.scene);

          model.scene.position.set(0, 100, 0);

          if (!vrm) return;
          animations.idle = await loadMixamoAnimation(
            "./animations/Standing_Idle.fbx",
            vrm
          );
          animations.walk = await loadMixamoAnimation(
            "./animations/Walking.fbx",
            vrm
          );
          animations.joy = await loadMixamoAnimation(
            "./animations/Jump.fbx",
            vrm
          );
          animations.sorrow = await loadMixamoAnimation(
            "./animations/Sad_Idle.fbx",
            vrm
          );
          animations.angry = await loadMixamoAnimation(
            "./animations/Angry.fbx",
            vrm
          );
        } else {
          model = await LoadMMD(modelURL);
          scene.add(model);
          model.position.set(0, 100, 0);
          model.scale.set(0.08, 0.08, 0.08);

          animations.idle = await LoadMMDAnim("./mmd/anim/idle.vmd", model);
          animations.walk = await LoadMMDAnim("./mmd/anim/walk.vmd", model);
          animations.joy = await LoadMMDAnim("./mmd/anim/わーい.vmd", model);
          animations.sorrow = await LoadMMDAnim("./mmd/anim/えー.vmd", model);
          animations.angry = await LoadMMDAnim(
            "./mmd/anim/なによっ.vmd",
            model
          );
        }

        currentMixer = new THREE.AnimationMixer(
          model instanceof THREE.SkinnedMesh ? model : model.scene
        );

        currentMixer.timeScale = 1.0;
      } catch (e) {
        alert("キャラクターの読み込みに失敗しました。");
      }
    }

    function addFukidashi(text: string) {
      scene.remove(textbox);
      textbox = new SpriteText(text, 0.05);
      scene.add(textbox);
    }

    async function talk(text: string) {
      talking = true;
      setTimeout(() => {
        talking = false;
        resetEmotion(currentMixer, animations, vrm);
        currentMixer.clipAction(animations.idle).play();
      }, 20000);

      const xrCamera = renderer.xr.getCamera();

      const modelScene =
        model instanceof THREE.SkinnedMesh ? model : model.scene;

      modelScene.lookAt(
        xrCamera.position.x,
        modelScene.position.y,
        xrCamera.position.z
      );

      addFukidashi("考え中...");

      const res = await requestToOpenAI(text, character, key);
      const message = res.content;
      const emotion = res.emotion;
      VOICEVOXTTS(res.content, character.speaker_id);

      setEmotion(emotion, currentMixer, animations, vrm);
      addFukidashi(message);
    }

    function updateModelMovement() {
      if (agent && !talking && !talkMode) {
        const agentPosition = new THREE.Vector3().copy(agent.position());
        const agentDestination = new THREE.Vector3().copy(agent.target());

        const distanceToTarget = agentPosition.distanceTo(agentDestination);
        const thresholdDistance = 0.1;

        if (distanceToTarget > thresholdDistance) {
          currentMixer.clipAction(animations.walk).play();
          currentMixer.clipAction(animations.idle).stop();

          const direction = new THREE.Vector3()
            .subVectors(agentDestination, agentPosition)
            .normalize();
          const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            direction
          );
          const euler = new THREE.Euler().setFromQuaternion(
            targetQuaternion,
            "YXZ"
          );
          euler.x = 0;
          euler.z = 0;
          const fixedQuaternion = new THREE.Quaternion().setFromEuler(euler);

          const modelScene =
            model instanceof THREE.SkinnedMesh ? model : model.scene;

          modelScene.quaternion.slerp(fixedQuaternion, 0.5);
        } else {
          currentMixer.clipAction(animations.idle).play();
          currentMixer.clipAction(animations.walk).stop();
        }
      }
    }

    function changeTalkMode(mode: boolean) {
      if (mode) {
        addFukidashi("キャラクターの巡回を停止");
      } else {
        addFukidashi("キャラクターの巡回を再開");
      }
      resetEmotion(currentMixer, animations, vrm);
      currentMixer.clipAction(animations.idle).play();
    }

    function animate() {
      const deltaTime = clock.getDelta();

      if (currentMixer) currentMixer.update(deltaTime);
      if (vrm) vrm.update(deltaTime);

      if (crowd && agent && model && lowestGround && !talking && !talkMode) {
        crowd.update(1 / 60.0);
        const agentPos = agent.position();
        const modelScene =
          model instanceof THREE.SkinnedMesh ? model : model.scene;

        modelScene.position.set(
          agentPos.x,
          lowestGround.position.y,
          agentPos.z
        );
      }

      if (textbox && model) {
        const modelScene =
          model instanceof THREE.SkinnedMesh ? model : model.scene;

        textbox.position.set(
          modelScene.position.x,
          modelScene.position.y + 1.7,
          modelScene.position.z
        );
      }

      renderer.render(scene, camera);
    }

    xr.addEventListener("sessionstart", async () => {
      const result = await setupNavMeshAndCrowd(grounds);
      ({ crowd, agent, navMeshQuery, lowestGround } = result);

      let { controllerGrip1, controllerGrip2 } = setupControllers(
        renderer,
        scene
      );

      if (!controllerGrip1 || !controllerGrip2) {
        const { controllerGrip1: grip1, controllerGrip2: grip2 } =
          setupControllers(renderer, scene);

        controllerGrip1 = grip1;
        controllerGrip2 = grip2;
      }

      controllerGrip1.addEventListener("selectstart", () => {
        audioChunks.length = 0;
        addFukidashi("録音中...");
        mediaRecorder.start();
      });

      controllerGrip1.addEventListener("selectend", () => {
        mediaRecorder.stop();
        addFukidashi("録音完了 考え中...");
      });

      controllerGrip2.addEventListener("selectstart", () => {
        talkMode = !talkMode;
        changeTalkMode(talkMode);
      });

      mediaRecorder = await setupMediaRecorder(
        (event) => audioChunks.push(event.data),
        async () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });
          const response = await fetch("/stt", {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: blob,
          });

          const result = await response.json();
          if (result) talk(result);
        }
      );

      setInterval(() => {
        if (!talkMode) {
          const { randomPoint: point } =
            navMeshQuery.findRandomPointAroundCircle(new THREE.Vector3(), 1);
          agent.requestMoveTarget(point);
        }
      }, 10000);

      setInterval(() => updateModelMovement(), 500);
    });

    await loadCharacterModel();
  }, [data, key]);

  useEffect(() => {
    if (key) {
      setupThree();
    }
  }, [setupThree, key]);

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    const form = new FormData(evt.target as HTMLFormElement);
    const apikey = form.get("key") as string;

    if (!apikey) return;
    setOpen(false);
    setKey(apikey);
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OpenAIのAPIキーを入力</DialogTitle>
            <div>
              <Form
                onSubmit={handleSubmit}
                className="relative w-full max-w-md"
              >
                <Input
                  placeholder="APIキーを入力..."
                  className="pr-10 rounded-md bg-muted text-muted-foreground py-5 my-5"
                  name="key"
                  id="key"
                  pattern="^sk-[a-zA-Z0-9\-_]{1,}$"
                  title="OpenAI APIキーを入力してください!"
                />
                <Button type="submit">Enter</Button>
              </Form>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
