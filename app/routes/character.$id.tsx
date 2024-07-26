import { VRM } from "@pixiv/three-vrm";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createScene } from "~/utils/Three/createScene";
import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { loadMixamoAnimation } from "~/utils/VRM/loadMixamoAnimation";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "~/components/ui/avatar"
import { Form } from "@remix-run/react"
import { Button } from "~/components/ui/button"

export async function loader({ params, request }: LoaderFunctionArgs) {
    const response = new Response()
    const id = params.id;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const { data: character } = await supabase
        .from('characters')
        .select('id,name,model_url,firstperson,ending,details,postedby')
        .eq('id', id)
        .single();

    if (!character) return;

    const { data: user } = await supabase
        .from('profiles')
        .select('avatar_url,full_name')
        .eq('id', character.postedby)
        .single();

    return { user, character }
}

export async function action({ params, request }: ActionFunctionArgs) {
    const response = new Response()
    const id = params.id;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    if (typeof id !== "string") return;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('profiles')
        .update({ current_character: id })
        .eq('id', user?.id)

    if (!error) return "正常にキャラクターが更新されました！";

    return null;
}

export default function Character() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const data = useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();

    useEffect(() => {
        (async () => {
            if (canvasRef.current == null) { return; }
            const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
            renderer.setSize(window.innerWidth / 1.5, window.innerHeight / 1.5);
            renderer.setPixelRatio(window.devicePixelRatio);

            const { scene, camera } = createScene(renderer);
            const clock = new THREE.Clock();

            let idolAnim: THREE.AnimationClip;

            let model: GLTF;
            let currentMixer: THREE.AnimationMixer;
            let vrm: VRM;

            //animation用のパラメータ
            const params = {
                timeScale: 1.0,
            };

            if (!data || !data.character) return;

            //VRMモデルの設定
            try {
                model = await LoadVRM(data.character.model_url);
                vrm = model.userData.vrm;
                scene.add(model.scene);

                model.scene.position.x = 0;
                model.scene.position.y = 0;
                model.scene.position.z = 3;

                currentMixer = new THREE.AnimationMixer(model.scene)
                currentMixer.timeScale = params.timeScale;

                idolAnim = await loadMixamoAnimation("../animations/Dancing.fbx", vrm)
                currentMixer.clipAction(idolAnim).play();
            } catch (e) {
                console.log(e);
            }

            function animate() {
                requestAnimationFrame(animate);
                const deltaTime = clock.getDelta();

                if (vrm) {
                    vrm.update(deltaTime);
                }

                // if animation is loaded
                if (currentMixer) {
                    // update the animation
                    currentMixer.update(deltaTime);
                }
                renderer.render(scene, camera);
            }
            animate();
        })()
    }, [data])

    useEffect(() => {
        if (!result) return;
        alert(result);
    }, [result])

    if (!data || !data.user) return;

    return (
        <div className="m-auto">
            <canvas ref={canvasRef} className="m-auto"></canvas>

            <br className="py-2"></br>
            <div className="px-96">
                <h1 className="font-bold text-4xl py-2">{data.character.name}</h1>
                <div className="flex">
                    <Avatar>
                        <AvatarImage src={data.user.avatar_url} alt={data.user.full_name} />
                        <AvatarFallback>{data.user.full_name}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-gray-400 px-2">{data.user.full_name} が投稿</h1>
                </div>

                <Form method="post" className="py-5">
                    <Button type="submit">このキャラクターを使用</Button>
                </Form>

                {data.character.firstperson ? <h1 className="py-2">一人称:{data.character.firstperson}</h1> : ""}
                {data.character.ending ? <h1 className="py-2">語尾:{data.character.ending}</h1> : ""}
                {data.character.details ? <h1 className="py-4">詳細設定プロンプト : {data.character.details}</h1> : ""}
            </div>
        </div>
    )
}