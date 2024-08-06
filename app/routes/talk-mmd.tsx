import { useEffect, useCallback, useRef } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { redirect, useLoaderData } from "@remix-run/react";

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

  const setupThree = useCallback(async () => {
    if (!data || initialized.current) return;
    initialized.current = true;

    await init();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      return;
    }

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

      mmdModel.position.set(0, -1.5, 0);

      mmdModel.scale.set(0.08, 0.08, 0.08);

      currentMixer = new THREE.AnimationMixer(mmdModel);
      currentMixer.timeScale = params.timeScale;

      idolAnim = await LoadMMDAnim("./mmd/anim/idle.vmd", mmdModel);
      walkAnim = await LoadMMDAnim("./mmd/anim/walk.vmd", mmdModel);
      joyAnim = await LoadMMDAnim("./mmd/anim/わーい.vmd", mmdModel);
      sorrowAnim = await LoadMMDAnim("./mmd/anim/えー.vmd", mmdModel);
      angryAnim = await LoadMMDAnim("./mmd/anim/なによっ.vmd", mmdModel);
    }

    function resetEmotion() {
      currentMixer.clipAction(idolAnim).stop();
      currentMixer.clipAction(walkAnim).stop();
      currentMixer.clipAction(joyAnim).stop();
      currentMixer.clipAction(sorrowAnim).stop();
      currentMixer.clipAction(angryAnim).stop();
    }

    function setEmotion(emotion: string) {
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
      setTimeout(() => {
        talking = false;
        resetEmotion();
        currentMixer.clipAction(idolAnim).play();
      }, 20000);

      const xrCamera = renderer.xr.getCamera();
      mmdModel.lookAt(
        xrCamera.position.x,
        mmdModel.position.y,
        xrCamera.position.z
      );
      addFukidashi("考え中...");

      const res = await requestToOpenAI(text, character);
      const message = res.content;
      const emotion = res.emotion;
      VOICEVOXTTS(res.content);

      setEmotion(emotion);
      addFukidashi(message);
    }

    function setupNavMeshAndCrowd(grounds: Mesh[]) {
      setTimeout(() => {
        grounds.map((mesh: Mesh) => {
          if (!lowestGround || mesh.position.y < lowestGround.position.y) {
            lowestGround = mesh;
          }
        });

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

        setInterval(() => {
          setAgentTargetPosition();
        }, 10000);

        setInterval(() => updateModelMovement(), 500);
      }, 5000);
    }

    function setAgentTargetPosition() {
      if (!talkMode) {
        const { randomPoint: point } = navMeshQuery.findRandomPointAroundCircle(
          new THREE.Vector3(),
          1
        );
        agent.requestMoveTarget(point);
      }
    }

    function updateModelMovement() {
      if (agent && !talking && !talkMode) {
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

        const distanceToTarget = agentPosition.distanceTo(agentDestination);
        const thresholdDistance = 0.1;

        if (distanceToTarget > thresholdDistance) {
          currentMixer.clipAction(walkAnim).play();
          currentMixer.clipAction(idolAnim).stop();

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

    async function setupMediaRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.onstart = () => console.log("Recording started");
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });
          const response = await fetch("/stt", {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: blob,
          });

          const result = await response.json();
          if (result) talk(result);
        };
      } catch (e) {
        console.error(e);
      }
    }

    function animate() {
      const deltaTime = clock.getDelta();

      if (currentMixer) currentMixer.update(deltaTime);

      if (crowd && agent && mmdModel && lowestGround && !talking && !talkMode) {
        crowd.update(1 / 60.0);
        const agentPos = agent.position();
        mmdModel.position.set(agentPos.x, lowestGround.position.y, agentPos.z);
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

    xr.addEventListener("sessionstart", async () => {
      setupNavMeshAndCrowd(grounds);
      setupControllers();
      setupMediaRecorder();
    });

    await loadCharacterModel();
  }, [data]);

  useEffect(() => {
    setupThree();
  }, [setupThree]);

  return <div></div>;
}
