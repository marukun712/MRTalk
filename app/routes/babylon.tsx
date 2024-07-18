import { useEffect, useRef } from "react";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, WebXRFeatureName, RecastJSPlugin, Mesh, TransformNode, StandardMaterial, Color3, WebXRHandTracking } from "@babylonjs/core";
import Recast from "recast-detour";
import { WebXRMeshDetector } from "@babylonjs/core";

// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

export default function Babylon() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    async function createScene() {
        const engine = new Engine(canvasRef.current, true);
        const scene = new Scene(engine);
        const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);

        const camera = new ArcRotateCamera('Camera', Math.PI / 4, Math.PI / 3, 8, Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, true);

        const recast = await Recast();
        const navigationPlugin = new RecastJSPlugin(recast);

        const parameters = {
            cs: 0.1,  // スケールを小さくして精度を上げる
            ch: 0.1,
            walkableSlopeAngle: 35,
            walkableHeight: 0.1,  // 小さな段差も検出できるように調整
            walkableClimb: 0.1,
            walkableRadius: 0.1,
            maxEdgeLen: 12,
            maxSimplificationError: 1.3,
            minRegionArea: 0.01,  // 小さな領域も検出
            mergeRegionArea: 0.02,
            maxVertsPerPoly: 6,
            detailSampleDist: 6,
            detailSampleMaxError: 1,
        };

        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',
            },
        });

        const xrFeaturesManager = xrHelper.baseExperience.featuresManager;
        const meshDetector = xrFeaturesManager.enableFeature(
            WebXRFeatureName.MESH_DETECTION,
            "latest",
            { generateMeshes: true }
        ) as WebXRMeshDetector;

        xrFeaturesManager.enableFeature(
            WebXRFeatureName.HAND_TRACKING,
            "latest",
            { xrInput: true }
        ) as WebXRHandTracking;

        meshDetector.onMeshAddedObservable.add((mesh) => {
            console.log("Mesh added:", mesh);
            updateNavMesh(mesh);
        });

        meshDetector.onMeshUpdatedObservable.add((mesh) => {
            console.log("Mesh updated:", mesh);
            updateNavMesh(mesh);
        });

        meshDetector.onMeshRemovedObservable.add((mesh) => {
            console.log("Mesh removed:", mesh);

            if (mesh instanceof TransformNode) {
                mesh.dispose();
            }
            updateNavMesh(mesh);
        });

        function updateNavMesh(mesh: Mesh) {
            console.log("Run")
            navigationPlugin.createNavMesh([mesh], parameters);

            const navmeshdebug = navigationPlugin.createDebugNavMesh(scene);
            const matdebug = new StandardMaterial("matdebug", scene);
            matdebug.diffuseColor = new Color3(0.1, 0.2, 1);
            matdebug.alpha = 0.2;
            navmeshdebug.material = matdebug;
        }

        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        return scene;
    }

    useEffect(() => {
        createScene();
    }, []);

    return (
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
    );
}