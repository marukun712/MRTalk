import { useEffect, useCallback, useRef, useState, FormEvent } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { Form, redirect, useLoaderData } from "@remix-run/react";

import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { createScene } from "~/utils/Three/createScene";

import { init, NavMeshQuery, Crowd, CrowdAgent } from "recast-navigation";
import { threeToSoloNavMesh } from "recast-navigation/three";
import { Mesh } from "three";
import SpriteText from "three-spritetext";

import { XRPlanes } from "~/utils/Three/XRPlanes";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { VOICEVOXTTS } from "~/utils/AIChat/VOICEVOX";
import { requestToOpenAI } from "~/utils/AIChat/requestToOpenAI";
import { LoadMMD } from "~/utils/MMD/LoadMMD";
import { LoadMMDAnim } from "~/utils/MMD/LoadMMDAnim";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const response = new Response();

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

  const { data: profileData } = await supabase
    .from("profiles")
    .select("current_character")
    .eq("id", user.id);

  if (!profileData || profileData.length === 0) return null;
  const characterID = profileData[0].current_character;

  const { data: characterData } = await supabase
    .from("characters")
    .select("id,name,model_url,ending,details,firstperson,postedby")
    .eq("id", characterID)
    .single();

  if (!characterData) return null;

  return { character: characterData };
}

export default function Three() {
  const data = useLoaderData<typeof loader>();
  const initialized = useRef(false);
  const [key, SetKey] = useState<string>("");
  const [open, setOpen] = useState(true);

  const setupThree = useCallback(async () => {
    if (!data || initialized.current) return;
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
    let lowestGround: Mesh | null = null;

    let mmdModel: THREE.SkinnedMesh;
    let currentMixer: THREE.AnimationMixer;

    let idolAnim: THREE.AnimationClip;
    let walkAnim: THREE.AnimationClip;
    let joyAnim: THREE.AnimationClip;
    let sorrowAnim: THREE.AnimationClip;
    let angryAnim: THREE.AnimationClip;

    let textbox: SpriteText;
    let mediaRecorder: MediaRecorder;
    const audioChunks: Blob[] = [];

    let talking = false;
    let talkMode = false;

    const params = {
      timeScale: 1.0,
    };

    const character = data.character;
    const modelURL = "./mmd/桜乃そら/桜乃そら.pmx";

    async function loadCharacterModel() {
      mmdModel = await LoadMMD(modelURL);

      scene.add(mmdModel);

      mmdModel.position.set(0, 100, 0);

      mmdModel.scale.set(0.08, 0.08, 0.08);

      //AnimationMixerの作成
      currentMixer = new THREE.AnimationMixer(mmdModel);
      currentMixer.timeScale = params.timeScale;

      //アニメーションの読み込み
      idolAnim = await LoadMMDAnim("./mmd/anim/idle.vmd", mmdModel);
      walkAnim = await LoadMMDAnim("./mmd/anim/walk.vmd", mmdModel);
      joyAnim = await LoadMMDAnim("./mmd/anim/わーい.vmd", mmdModel);
      sorrowAnim = await LoadMMDAnim("./mmd/anim/えー.vmd", mmdModel);
      angryAnim = await LoadMMDAnim("./mmd/anim/なによっ.vmd", mmdModel);
    }

    //表情、アニメーションのリセット
    function resetEmotion() {
      currentMixer.clipAction(idolAnim).stop();
      currentMixer.clipAction(walkAnim).stop();
      currentMixer.clipAction(joyAnim).stop();
      currentMixer.clipAction(sorrowAnim).stop();
      currentMixer.clipAction(angryAnim).stop();
    }

    function setEmotion(emotion: string) {
      //適用前にすべてのモーションをリセット
      resetEmotion();

      switch (emotion) {
        case "fun":
          currentMixer.clipAction(idolAnim).play();
          break;
        case "joy":
          currentMixer.clipAction(joyAnim).play();
          break;
        case "sorrow":
          currentMixer.clipAction(sorrowAnim).play();
          break;
        case "angry":
          currentMixer.clipAction(angryAnim).play();
          break;
      }
    }

    function addFukidashi(text: string) {
      scene.remove(textbox);
      textbox = new SpriteText(text, 0.05);
      scene.add(textbox);
    }

    async function talk(text: string) {
      talking = true;

      //20秒後に会話アニメーションを解除
      setTimeout(() => {
        talking = false;
        resetEmotion();
        currentMixer.clipAction(idolAnim).play();
      }, 20000);

      //プレイヤー位置の取得
      const xrCamera = renderer.xr.getCamera();
      mmdModel.lookAt(
        xrCamera.position.x,
        mmdModel.position.y,
        xrCamera.position.z
      );
      addFukidashi("考え中...");

      const res = await requestToOpenAI(text, character, key);
      const message = res.content;
      const emotion = res.emotion;
      VOICEVOXTTS(res.content);

      setEmotion(emotion);
      addFukidashi(message);
    }

    //NavMeshのベイクとAgentのセットアップ
    function setupNavMeshAndCrowd(grounds: Mesh[]) {
      setTimeout(() => {
        //モデルの高さを設定するために一番下のメッシュ(地面)を検出
        grounds.map((mesh: Mesh) => {
          if (!lowestGround || mesh.position.y < lowestGround.position.y) {
            lowestGround = mesh;
          }
        });

        //生成
        const { navMesh } = threeToSoloNavMesh(grounds);
        if (!navMesh) return;

        const maxAgents = 1;
        const maxAgentRadius = 0.6;

        crowd = new Crowd(navMesh, { maxAgents, maxAgentRadius });
        navMeshQuery = new NavMeshQuery(navMesh);

        agent = crowd.addAgent(new THREE.Vector3(0, 0, 0), {
          radius: 0.25,
          height: 1.25,
          maxAcceleration: 4.0,
          maxSpeed: 0.5,
          collisionQueryRange: 0.5,
          pathOptimizationRange: 0.0,
          separationWeight: 1.0,
        });

        setAgentTargetPosition();

        //10秒おきにランダム地点に移動
        setInterval(() => {
          setAgentTargetPosition();
        }, 10000);

        //500ミリ秒おきにモデル角度とアニメーションの状態更新
        setInterval(() => updateModelMovement(), 500);
      }, 5000); //WebXRの平面検出が終わるまで
    }

    //ランダム地点を設定
    function setAgentTargetPosition() {
      if (!talkMode) {
        //会話中は動かない
        const { randomPoint: point } = navMeshQuery.findRandomPointAroundCircle(
          new THREE.Vector3(),
          1
        );
        agent.requestMoveTarget(point);
      }
    }

    //モデルのアニメーションと角度の更新
    function updateModelMovement() {
      if (agent && !talking && !talkMode) {
        //巡回の停止時と会話中は動かない

        const agentPosition = new THREE.Vector3(
          agent.position().x,
          agent.position().y,
          agent.position().z
        );
        const agentDestination = new THREE.Vector3(
          agent.target().x,
          agent.target().y,
          agent.target().z
        );

        //agentからTargetまでの距離
        const distanceToTarget = agentPosition.distanceTo(agentDestination);
        const thresholdDistance = 0.1; //距離の閾値

        if (distanceToTarget > thresholdDistance) {
          currentMixer.clipAction(walkAnim).play();
          currentMixer.clipAction(idolAnim).stop();

          //プレイヤーの方向を向く
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

          mmdModel.quaternion.slerp(fixedQuaternion, 0.5);
        } else {
          currentMixer.clipAction(idolAnim).play();
          currentMixer.clipAction(walkAnim).stop();
        }
      }
    }

    //エージェント巡回停止時のモーション切り替え
    function changeTalkMode(mode: boolean) {
      if (mode) {
        addFukidashi("キャラクターの巡回を停止");
        resetEmotion();
        currentMixer.clipAction(idolAnim).play();
      } else {
        addFukidashi("キャラクターの巡回を再開");
        resetEmotion();
        currentMixer.clipAction(idolAnim).play();
      }
    }

    function setupControllers() {
      const geometry = new THREE.BufferGeometry();
      geometry.setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5),
      ]);

      //コントローラーを検出
      const controller1 = renderer.xr.getController(0);
      controller1.add(new THREE.Line(geometry));
      scene.add(controller1);

      const controller2 = renderer.xr.getController(1);
      controller2.add(new THREE.Line(geometry));
      scene.add(controller2);

      const controllerModelFactory = new XRControllerModelFactory();

      const controllerGrip1 = renderer.xr.getControllerGrip(0);
      controllerGrip1.add(
        controllerModelFactory.createControllerModel(controllerGrip1)
      );
      scene.add(controllerGrip1);

      const controllerGrip2 = renderer.xr.getControllerGrip(1);
      controllerGrip2.add(
        controllerModelFactory.createControllerModel(controllerGrip2)
      );
      scene.add(controllerGrip2);

      //キー割り当て
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
    }

    //録音の設定
    async function setupMediaRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.onstart = () => console.log("Recording started");
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

        //録音完了時に文字起こしAPIにPOST
        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });
          const response = await fetch("/stt", {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: blob,
          });

          const result = await response.json();
          if (result) talk(result); //会話
        };
      } catch (e) {
        console.error(e);
      }
    }

    function animate() {
      const deltaTime = clock.getDelta();

      if (currentMixer) currentMixer.update(deltaTime);

      //エージェントの巡回停止時と会話中はupdateを停止する
      if (crowd && agent && mmdModel && lowestGround && !talking && !talkMode) {
        crowd.update(1 / 60.0);
        const agentPos = agent.position();
        mmdModel.position.set(agentPos.x, lowestGround.position.y, agentPos.z); //モデルがちょうど床の高さに立つように
      }

      if (textbox && mmdModel) {
        textbox.position.set(
          mmdModel.position.x,
          mmdModel.position.y + 1.7,
          mmdModel.position.z
        );
      }

      renderer.render(scene, camera);
    }

    //XRセッション開始時にセットアップ
    xr.addEventListener("sessionstart", async () => {
      setupNavMeshAndCrowd(grounds);
      setupControllers();
      setupMediaRecorder();
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
    SetKey(apikey);
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
                  pattern="^sk-[a-zA-Z0-9]{32,}$"
                  title="OpenAI APIキーを入力してください"
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
