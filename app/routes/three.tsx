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

import { LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useLoaderData } from "@remix-run/react";

interface CharacterData {
    name: string;
    ending: string;
    details: string;
    firstperson: string;
    model_url: string;
}

interface LoaderData {
    character: CharacterData;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<{ character: CharacterData } | null> {
    const response = new Response();

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profileData } = await supabase
        .from('profiles')
        .select('current_character')
        .eq("id", user.id);

    if (!profileData || profileData.length === 0) return null;
    const characterID = profileData[0].current_character;

    const { data: characterData } = await supabase
        .from('characters')
        .select('name, ending, details, firstperson, model_url')
        .eq("id", characterID)
        .single();

    if (!characterData) return null;

    return { character: characterData };
}

export default function Three() {
    const data = useLoaderData<LoaderData | null>();

    useEffect(() => {
        if (!data) return;

        (async () => {
            await init();

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setAnimationLoop(animate);
            renderer.xr.enabled = true;
            document.body.appendChild(renderer.domElement);

            document.body.appendChild(ARButton.createButton(renderer, {
                requiredFeatures: ['plane-detection', 'hand-tracking']
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
            let vrm: VRM;
            let currentMixer: THREE.AnimationMixer;

            let talking = false;
            let gazeStartTime: number | null = null;
            const gazeThreshold = 3000; //何ミリ秒間見続けるとAIが話しかけるか
            let nextTalkStartTime: number;
            let lastTalkStartTime: number | null = null;

            const params = {
                timeScale: 1.0,
            };

            function setupCrowd(grounds: Mesh[]): void {
                setTimeout(() => {
                    const { navMesh } = threeToSoloNavMesh(grounds);

                    if (!navMesh) return;

                    const maxAgents = 1;
                    const maxAgentRadius = 0.6;

                    crowd = new Crowd(navMesh, { maxAgents, maxAgentRadius });

                    const navMeshQuery = new NavMeshQuery(navMesh);
                    const radius = 0.3;
                    const { randomPoint: initialAgentPosition } = navMeshQuery.findRandomPointAroundCircle(new THREE.Vector3(), radius);

                    agent = crowd.addAgent(initialAgentPosition, {
                        radius: 0.3,
                        height: 2,
                        maxAcceleration: 4.0,
                        maxSpeed: 0.5,
                        collisionQueryRange: 0.5,
                        pathOptimizationRange: 0.0,
                        separationWeight: 1.0,
                    });

                    setInterval(() => {
                        const { randomPoint: point } = navMeshQuery.findRandomPointAroundCircle(new THREE.Vector3(), 1);
                        agent.requestMoveTarget(point);
                    }, 10000);
                }, 5000);
            }

            function updateCrowdAgentMovement(): void {
                if (agent && !talking) {
                    const agentPosition = new THREE.Vector3(agent.position().x, agent.position().y, agent.position().z);
                    const agentDestination = agent.target();
                    const distanceToTarget = agentPosition.distanceTo(agentDestination);
                    const thresholdDistance = 0.1;

                    if (distanceToTarget > thresholdDistance) {
                        currentMixer.clipAction(walkAnim).play();
                        currentMixer.clipAction(idolAnim).stop();

                        const direction = new THREE.Vector3().subVectors(agentDestination, agentPosition).normalize();
                        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

                        const euler = new THREE.Euler().setFromQuaternion(targetQuaternion, 'YXZ');
                        euler.x = 0;
                        euler.z = 0;
                        const fixedQuaternion = new THREE.Quaternion().setFromEuler(euler);

                        model.scene.quaternion.slerp(fixedQuaternion, 0.5);
                    } else {
                        currentMixer.clipAction(idolAnim).play();
                        currentMixer.clipAction(walkAnim).stop();
                    }
                }
            }

            xr.addEventListener('sessionstart', () => setupCrowd(grounds));

            const character = data.character;
            const modelURL = character.model_url;

            try {
                model = await LoadVRM(modelURL);
                vrm = model.userData.vrm;
                scene.add(model.scene);

                model.scene.position.set(0, -1.5, 0);

                currentMixer = new THREE.AnimationMixer(model.scene);
                currentMixer.timeScale = params.timeScale;

                idolAnim = await loadMixamoAnimation("./animations/Standing_Idle.fbx", vrm);
                walkAnim = await loadMixamoAnimation("./animations/Walking.fbx", vrm);
            } catch (e) {
                console.error(e);
            }

            setInterval(() => updateCrowdAgentMovement(), 500);

            async function requestToOpenAI(): Promise<{ content: string }> {
                const body = JSON.stringify({
                    "name": character.name,
                    "ending": character.ending,
                    "details": character.details,
                    "firstpeson": character.firstperson
                });

                const req = await fetch('/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: body
                });

                const result = await req.json();
                return result;
            }

            async function randomTalk() {
                if (!lastTalkStartTime || Date.now() > nextTalkStartTime) {
                    lastTalkStartTime = Date.now();
                    nextTalkStartTime = lastTalkStartTime + Math.floor(Math.random() * (150 - 40) + 40) * 1000;

                    const res = await requestToOpenAI();
                    const message = res.content;
                    console.log(message);

                    talking = true;

                    setTimeout(() => {
                        talking = false;
                    }, 20000);
                }
            }

            function lookingAtModel(): boolean {
                const raycaster = new THREE.Raycaster();
                const rayDirection = new THREE.Vector3();

                const xrCamera = renderer.xr.getCamera();
                rayDirection.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);

                raycaster.set(xrCamera.position, rayDirection);

                const intersects = raycaster.intersectObjects([model.scene], true);
                return intersects.length > 0;
            }

            function animate() {
                const deltaTime = clock.getDelta();

                if (currentMixer) {
                    currentMixer.update(deltaTime);
                }

                if (vrm) {
                    vrm.update(deltaTime);
                }

                if (crowd && agent && model && !talking) {
                    crowd.update(1 / 60.0);
                    const agentPos = agent.position();
                    model.scene.position.set(agentPos.x, -1.5, agentPos.z);
                }

                if (talking && agent) {
                    currentMixer.clipAction(walkAnim).stop();
                    currentMixer.clipAction(idolAnim).play();

                    const agentPosition = new THREE.Vector3(agent.position().x, agent.position().y, agent.position().z);
                    const userPosition = renderer.xr.getCamera().position;

                    const direction = new THREE.Vector3().subVectors(userPosition, agentPosition).normalize();
                    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

                    const euler = new THREE.Euler().setFromQuaternion(targetQuaternion, 'YXZ');
                    euler.x = 0;
                    euler.z = 0;
                    const fixedQuaternion = new THREE.Quaternion().setFromEuler(euler);

                    model.scene.quaternion.slerp(fixedQuaternion, 0.3);
                }

                if (renderer.xr && model && lookingAtModel()) {
                    if (!gazeStartTime) {
                        gazeStartTime = Date.now();
                    } else {
                        const gazeDuration = Date.now() - gazeStartTime;
                        if (gazeDuration > gazeThreshold) {
                            randomTalk();
                            gazeStartTime = null;
                        }
                    }
                } else {
                    gazeStartTime = null;
                }

                renderer.render(scene, camera);
            }
        })();
    }, [data]);

    return (
        <div>
        </div>
    );
}
