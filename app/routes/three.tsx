import { useEffect } from "react";
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { init, NavMeshQuery, Crowd, CrowdAgent } from 'recast-navigation';
import { threeToSoloNavMesh } from 'recast-navigation/three';
import {
    BoxGeometry,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
} from 'three';
import { VRM } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "~/utils/VRM/loadMixamoAnimation";

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
                requiredFeatures: ['plane-detection'] //plane-detectionを必須に
            }));

            //シーンの作成
            const scene = new THREE.Scene();

            //カメラを追加
            const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

            //ライトを追加
            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
            light.position.set(0.5, 1, 0.25);
            scene.add(light);

            const grounds: Mesh[] = new Array();
            let crowd: Crowd;
            let agent: CrowdAgent;

            let idolAnim: THREE.AnimationClip;
            let walkAnim: THREE.AnimationClip;

            const matrix = new Matrix4();
            const currentPlanes = new Map();
            const xr = renderer.xr;

            //平面検出時
            xr.addEventListener('planesdetected', event => {
                const frame = event.data;
                const planes = frame.detectedPlanes;

                const referenceSpace = xr.getReferenceSpace();

                for (const [plane, mesh] of currentPlanes) {
                    //検出から外れたメッシュを削除
                    if (planes.has(plane) === false) {

                        mesh.geometry.dispose();
                        mesh.material.dispose();
                        scene.remove(mesh);

                        currentPlanes.delete(plane);
                    }
                }

                //planeからMeshを生成
                for (const plane of planes) {
                    if (currentPlanes.has(plane) === false) {

                        const pose = frame.getPose(plane.planeSpace, referenceSpace);
                        matrix.fromArray(pose.transform.matrix);

                        const polygon = plane.polygon;

                        let minX = Number.MAX_SAFE_INTEGER;
                        let maxX = Number.MIN_SAFE_INTEGER;
                        let minZ = Number.MAX_SAFE_INTEGER;
                        let maxZ = Number.MIN_SAFE_INTEGER;

                        for (const point of polygon) {
                            minX = Math.min(minX, point.x);
                            maxX = Math.max(maxX, point.x);
                            minZ = Math.min(minZ, point.z);
                            maxZ = Math.max(maxZ, point.z);
                        }

                        const width = maxX - minX;
                        const height = maxZ - minZ;

                        const geometry = new BoxGeometry(width, 0.01, height);
                        const material = new MeshBasicMaterial({
                            color: 0xffffff * Math.random(), transparent: true, opacity: 0 //透明度を指定
                        });

                        const mesh = new Mesh(geometry, material);
                        mesh.position.setFromMatrixPosition(matrix);
                        mesh.quaternion.setFromRotationMatrix(matrix);
                        scene.add(mesh);
                        grounds.push(mesh); //NavMeshベイク用の配列にpush

                        currentPlanes.set(plane, mesh);
                    }
                }
            });

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
                    const radius = 0.5;
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

            const params = {
                timeScale: 1.0,
            };

            // mixamoアニメーションのLoad
            async function loadFBX(animationUrl: string, vrm: VRM): Promise<THREE.AnimationClip> {
                return loadMixamoAnimation(animationUrl, vrm);
            }

            let model: GLTF;
            let currentMixer: THREE.AnimationMixer;
            let vrm: VRM;

            try {
                model = await LoadVRM("https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm");
                vrm = model.userData.vrm;
                scene.add(model.scene);

                model.scene.position.x = 0;
                model.scene.position.y = -1.5;
                model.scene.position.z = 0;

                currentMixer = new THREE.AnimationMixer(model.scene)
                currentMixer.timeScale = params.timeScale;

                idolAnim = await loadFBX("./animations/Standing_Idle.fbx", vrm)
                walkAnim = await loadFBX("./animations/Walking.fbx", vrm)
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

            const clock = new THREE.Clock();
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
        <div></div>
    );
}
