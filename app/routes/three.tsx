import { useEffect } from "react";
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { createScene } from "~/utils/Three/createScene";
import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { init, NavMeshQuery, Crowd, CrowdAgent } from 'recast-navigation';
import { threeToSoloNavMesh } from 'recast-navigation/three';
import { Mesh } from 'three';
import { VRM } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "~/utils/VRM/loadMixamoAnimation";

import { XRPlanes } from "~/utils/Three/XRPlanes";
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export default function Three() {
    useEffect(() => {
        (async () => {
            await init();

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setAnimationLoop(animate);
            renderer.xr.enabled = true; //WebXRを有効化
            document.body.appendChild(renderer.domElement);

            //AR開始ボタンの作成
            document.body.appendChild(ARButton.createButton(renderer, {
                requiredFeatures: ['plane-detection', 'hand-tracking'] //plane-detectionを必須に
            }));

            const { scene, camera } = createScene(renderer);

            const clock = new THREE.Clock();

            const xr = renderer.xr;

            const grounds: Mesh[] = XRPlanes(xr, scene);
            let crowd: Crowd;
            let agent: CrowdAgent;

            let idolAnim: THREE.AnimationClip;
            let walkAnim: THREE.AnimationClip;

            let model: GLTF;
            let currentMixer: THREE.AnimationMixer;
            let vrm: VRM;

            //animation用のパラメータ
            const params = {
                timeScale: 1.0,
            };

            //Web XR Session開始時
            xr.addEventListener('sessionstart', start => {
                setTimeout(() => {
                    //NavMeshのベイク
                    const { navMesh } = threeToSoloNavMesh(grounds);

                    if (!navMesh) return;

                    const maxAgents = 1;
                    const maxAgentRadius = 0.6;

                    crowd = new Crowd(navMesh, { maxAgents, maxAgentRadius });

                    const navMeshQuery = new NavMeshQuery(navMesh);
                    const radius = 0.3;
                    const {
                        randomPoint: initialAgentPosition,
                    } = navMeshQuery.findRandomPointAroundCircle(model!.scene.position, radius);

                    //crowd agentの作成
                    agent = crowd.addAgent(initialAgentPosition, {
                        radius: 0.3,
                        height: 2,
                        maxAcceleration: 4.0,
                        maxSpeed: 0.5,
                        collisionQueryRange: 0.5,
                        pathOptimizationRange: 0.0,
                        separationWeight: 1.0,
                    });

                    //10秒おきにランダムなポイントを設定
                    setInterval(() => {
                        const {
                            randomPoint: point,
                        } = navMeshQuery.findRandomPointAroundCircle(model!.scene.position, 1);
                        agent.requestMoveTarget(point);
                    }, 10000)

                }, 5000);
            })

            //VRMモデルの設定
            try {
                model = await LoadVRM("https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm");
                vrm = model.userData.vrm;
                scene.add(model.scene);

                model.scene.position.x = 0;
                model.scene.position.y = -1.5;
                model.scene.position.z = 0;

                currentMixer = new THREE.AnimationMixer(model.scene)
                currentMixer.timeScale = params.timeScale;

                idolAnim = await loadMixamoAnimation("./animations/Standing_Idle.fbx", vrm)
                walkAnim = await loadMixamoAnimation("./animations/Walking.fbx", vrm)
            } catch (e) {
                console.log(e);
            }

            setInterval(() => {
                if (agent) {
                    const agentPosition = new THREE.Vector3(agent.position().x, agent.position().y, agent.position().z);
                    const agentDestination = agent.target();
                    const distanceToTarget = agentPosition.distanceTo(agentDestination);
                    const thresholdDistance = 0.1; // 距離の閾値

                    if (distanceToTarget > thresholdDistance) {
                        currentMixer.clipAction(walkAnim).play();//歩行モーションを再生
                        currentMixer.clipAction(idolAnim).stop();

                        const direction = new THREE.Vector3().subVectors(agentDestination, agentPosition).normalize();
                        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

                        // x軸の回転を無視してy軸の回転のみを設定
                        const euler = new THREE.Euler().setFromQuaternion(targetQuaternion, 'YXZ');
                        euler.x = 0;
                        euler.z = 0;
                        const fixedQuaternion = new THREE.Quaternion().setFromEuler(euler);

                        model.scene.quaternion.slerp(fixedQuaternion, 0.5); // 向きをゆっくり変更
                    } else {
                        currentMixer.clipAction(idolAnim).play();//待機モーションを再生
                        currentMixer.clipAction(walkAnim).stop();
                    }
                }
            }, 500)

            //Questコントローラの設定
            const controllerModelFactory = new XRControllerModelFactory();
            const controllerGrip = renderer.xr.getControllerGrip(0);
            const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);

            controllerGrip.add(controllerModel);

            // 公式に提供されているトリガー、グリップのコールバックイベント
            controllerGrip.addEventListener('select', (evt) => console.log(evt));
            controllerGrip.addEventListener('selectstart', (evt) => console.log(evt));
            controllerGrip.addEventListener('selectend', (evt) => console.log(evt));
            controllerGrip.addEventListener('squeeze', (evt) => console.log(evt));
            controllerGrip.addEventListener('squeezestart', (evt) => console.log(evt));
            controllerGrip.addEventListener('squeezeend', (evt) => console.log(evt));

            controllerGrip.addEventListener('end', (evt) => console.log(evt));

            scene.add(controllerGrip);

            function animate() {
                const deltaTime = clock.getDelta();

                // if animation is loaded
                if (currentMixer) {
                    // update the animation
                    currentMixer.update(deltaTime);
                }

                if (vrm) {
                    vrm.update(deltaTime);
                }

                if (crowd && agent && model) {
                    crowd.update(1 / 60.0);
                    const agentPos = agent.position();
                    model.scene.position.set(agentPos.x, -1.5, agentPos.z);
                }

                renderer.render(scene, camera);
            }
        })()
    }, []);

    return (
        <div>
        </div>
    );
}
