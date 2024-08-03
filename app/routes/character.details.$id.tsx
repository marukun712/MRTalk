import { VRM } from "@pixiv/three-vrm";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, Form, redirect } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useEffect, useRef, useCallback } from "react";
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
import { Button } from "~/components/ui/button"
import NotFound from "~/components/ui/404";
import { Heart, HeartOff, Edit, UserCheck, Eye } from "lucide-react";

export async function loader({ params, request }: LoaderFunctionArgs) {
    const response = new Response()
    const id = params.id;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { data: character } = await supabase
        .from('characters')
        .select('id,name,model_url,ending,details,firstperson,postedby,is_public')
        .eq('id', id)
        .single();

    if (!character || !currentUser) return null;

    const { data: currentUserData } = await supabase
        .from('profiles')
        .select('id,avatar_url,full_name,current_character')
        .eq('id', currentUser.id)
        .single();

    const { data: userData } = await supabase
        .from('profiles')
        .select('id,avatar_url,full_name')
        .eq('id', character.postedby)
        .single();

    const { data: favoriteData } = await supabase
        .from('favorites')
        .select('*')
        .eq('model_id', character.id)
        .single();

    return { userData, character, currentUser, favoriteData, currentUserData }
}

export async function action({ params, request }: ActionFunctionArgs) {
    const response = new Response()
    const id = params.id;

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        request,
        response,
    })

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'favorite') {
        await supabase
            .from('favorites')
            .insert({ model_id: id })

        return null;
    }

    if (action === 'deleteFavorite') {
        const model_id = formData.get('id');

        await supabase
            .from('favorites')
            .delete()
            .eq('model_id', model_id)

        return null;
    }

    if (action === 'use') {
        const { error } = await supabase
            .from('profiles')
            .update({ current_character: id })
            .eq('id', user.id)

        if (!error) return "正常にキャラクターが更新されました！";

        return null;
    }
}

export default function Character() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const data = useLoaderData<typeof loader>();
    const result = useActionData<typeof action>();
    const initialized = useRef(false);

    const setupThree = useCallback(async () => {
        if (canvasRef.current == null || !data || initialized.current) return;
        initialized.current = true;

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

            idolAnim = await loadMixamoAnimation("../../animations/Dancing.fbx", vrm)
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

            if (currentMixer) {
                currentMixer.update(deltaTime);
            }
            renderer.render(scene, camera);
        }
        animate();
    }, [data, canvasRef])

    useEffect(() => {
        setupThree();
    }, [setupThree])

    useEffect(() => {
        if (!result) return;
        alert(result);
    }, [result])

    if (!data || !data.userData || !data.currentUserData) return <NotFound />;

    return (
        <div className="m-auto">
            <canvas ref={canvasRef} className="m-auto"></canvas>

            <br className="py-2"></br>
            <div className="px-96">
                <h1 className="font-bold text-4xl py-2">{data.character.name}</h1>
                <div className="flex">
                    <a href={`/profile/${data.userData.id}`} className="flex">
                        <Avatar>
                            <AvatarImage src={data.userData.avatar_url} alt={data.userData.full_name} />
                            <AvatarFallback>{data.userData.full_name}</AvatarFallback>
                        </Avatar>
                        <h1 className="text-gray-400 px-2">{data.userData.full_name} が投稿</h1>
                    </a>
                    {data.currentUser && data.character.postedby === data.currentUser.id && data.character.is_public ? <p className="font-bold flex"><Eye className="mx-2" />公開されています</p> : ""}
                </div>

                <div className="flex">
                    {data.favoriteData ?
                        <Form method="post" className="py-5">
                            <input type="hidden" name="action" value="deleteFavorite" />
                            <input type="hidden" name="id" value={data.character.id} />

                            <Button type="submit">
                                <HeartOff className="px-1" />
                                お気に入りから削除
                            </Button>
                        </Form>
                        : <Form method="post" className="py-5">
                            <input type="hidden" name="action" value="favorite" />
                            <Button type="submit" className="bg-pink-300">
                                <Heart className="px-1" />
                                お気に入りに追加
                            </Button>
                        </Form>}

                    {data.currentUserData.current_character === data.character.id ? <p className="font-bold py-5 px-5 flex"><UserCheck className="px-1" />使用中</p> :
                        <Form method="post" className="py-5 px-5">
                            <input type="hidden" name="action" value="use" />
                            <Button type="submit"><UserCheck className="px-1" />このキャラクターを使用</Button>
                        </Form>
                    }

                    {data.currentUser && data.character.postedby === data.currentUser.id ? <a href={`/character/edit/${data.character.id}`} className="py-5"><Button><Edit className="px-1" />キャラクター情報を編集</Button></a> : ""}
                </div>
                {data.character.firstperson ? <h1 className="py-2">一人称:{data.character.firstperson}</h1> : ""}
                {data.character.ending ? <h1 className="py-2">語尾:{data.character.ending}</h1> : ""}
                {data.character.details ? <h1 className="py-4">詳細設定プロンプト : {data.character.details}</h1> : ""}
            </div>
        </div>
    )
}