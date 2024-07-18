import { useEffect, useRef } from "react";
import { Engine, Scene, MeshBuilder, ArcRotateCamera, HemisphericLight, Vector3, Color3, WebXRFeatureName, StandardMaterial, RecastJSPlugin } from "@babylonjs/core";
// side effects that register the loader
import "babylon-mmd/esm/Loader/pmxLoader";
// side effects that register the animation runtime
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation"
import "babylon-vrm-loader";

export default function Babylon() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    async function createScene() {
        const engine = new Engine(canvasRef.current, true);

        const scene = new Scene(engine)
        const light = new HemisphericLight('light1', new Vector3(1, 1, 0), scene);

        // カメラの設定
        const camera = new ArcRotateCamera('Camera', Math.PI / 4, Math.PI / 3, 8, Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, true);

        const ground = MeshBuilder.CreateGround("ground", { width: 4, height: 4 });

        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: { sessionMode: "immersive-ar" },
            floorMeshes: [ground]
        })

        const featuresManager = xr.baseExperience.featuresManager

        featuresManager.enableFeature(
            WebXRFeatureName.PLANE_DETECTION,
            WebXRFeatureName.HAND_TRACKING
        )

        const navigationPlugin = new RecastJSPlugin();

        const navmeshdebug = navigationPlugin.createDebugNavMesh(scene);
        const matdebug = new StandardMaterial("matdebug", scene);
        matdebug.diffuseColor = new Color3(0.1, 0.2, 1);
        matdebug.alpha = 0.2;
        navmeshdebug.material = matdebug;

        engine.runRenderLoop(() => {
            scene.render();
        });

        return scene;
    }

    useEffect(() => {
        createScene();
    })

    return (
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
    )
}