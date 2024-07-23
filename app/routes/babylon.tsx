import { useEffect, useRef } from "react";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Vector2, Quaternion, WebXRFeatureName, RecastJSPlugin, Mesh, PolygonMeshBuilder, StandardMaterial, Color3, WebXRHandTracking, SceneLoader, Material } from "@babylonjs/core";
import Recast from "recast-detour";
import { WebXRPlaneDetector, IWebXRPlane } from "@babylonjs/core";
import cannon from "cannon";
import earcut from "earcut";

// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

export default function Babylon() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const planeMap = new Map<number, Mesh>();

    async function createScene() {
        const engine = new Engine(canvasRef.current, true);
        const scene = new Scene(engine);
        const light = new HemisphericLight('light', new Vector3(1, 1, 0), scene);

        scene.enablePhysics();

        await import('babylonjs-vrm-loader')

        const model = await SceneLoader.AppendAsync("./models/", "AliciaSolid.vrm", scene);

        const vrmManager = model.metadata.vrmManagers[0];

        // Update secondary animation
        scene.onBeforeRenderObservable.add(() => {
            vrmManager.update(scene.getEngine().getDeltaTime());
        });

        // Model Transformation
        vrmManager.rootMesh.translate(new Vector3(1, 0, 0), 1);

        const camera = new ArcRotateCamera('Camera', Math.PI / 4, Math.PI / 3, 8, Vector3.Zero(), scene);
        camera.attachControl(canvasRef.current, true);

        const recast = await Recast();
        const navigationPlugin = new RecastJSPlugin(recast);

        const parameters = {
            cs: 0.1,
            ch: 0.1,
            walkableSlopeAngle: 35,
            walkableHeight: 0.1,
            walkableClimb: 0.1,
            walkableRadius: 0.1,
            maxEdgeLen: 12,
            maxSimplificationError: 1.3,
            minRegionArea: 0.01,
            mergeRegionArea: 0.02,
            maxVertsPerPoly: 6,
            detailSampleDist: 6,
            detailSampleMaxError: 1,
        };

        const agentParameters = {
            radius: 0.1,
            height: 0.2,
            maxAcceleration: 4.0,
            maxSpeed: 1.0,
            collisionQueryRange: 0.5,
            pathOptimizationRange: 0.0,
            separationWeight: 1.0
        };

        navigationPlugin.createNavMesh([], parameters);

        const crowd = navigationPlugin.createCrowd(10, 0.1, scene);
        const agentIndex = crowd.addAgent(vrmManager.rootMesh.position, agentParameters, vrmManager.rootMesh);

        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',
            },
        });

        const xrFeaturesManager = xrHelper.baseExperience.featuresManager;
        const planeDetector = xrFeaturesManager.enableFeature(
            WebXRFeatureName.PLANE_DETECTION,
            "latest",
            { doNotRemovePlanesOnSessionEnded: true }
        ) as WebXRPlaneDetector;

        xrFeaturesManager.enableFeature(
            WebXRFeatureName.HAND_TRACKING,
            "latest",
            { xrInput: xrHelper.input, jointMeshes: { enablePhysics: true } }
        ) as WebXRHandTracking;

        const createPlaneMaterial = (scene: Scene) => {
            const mat = new StandardMaterial("mat", scene);
            mat.alpha = 0.5;
            mat.diffuseColor = Color3.Random();
            return mat;
        };

        const createPlane = (plane: IWebXRPlane, scene: Scene, mat: Material) => {
            plane.polygonDefinition.push(plane.polygonDefinition[0]);
            const polygon_triangulation = new PolygonMeshBuilder(
                "plane_" + plane.id,
                plane.polygonDefinition.filter(p => p).map(p => new Vector2(p.x, p.z)),
                scene,
                earcut,
            );
            const polygon = polygon_triangulation.build(false, 0.001);

            polygon.createNormals(false);

            polygon.material = mat;
            polygon.rotationQuaternion = new Quaternion();
            plane.transformationMatrix.decompose(
                polygon.scaling,
                polygon.rotationQuaternion,
                polygon.position,
            );

            return polygon;
        };

        const updateNavMesh = (mesh: Mesh | undefined) => {
            if (!mesh) return;

            navigationPlugin.createNavMesh([mesh], parameters);

            const navmeshdebug = navigationPlugin.createDebugNavMesh(scene);
            const matdebug = new StandardMaterial("matdebug", scene);
            matdebug.diffuseColor = new Color3(0.1, 0.2, 1);
            matdebug.alpha = 0.3;
            navmeshdebug.material = matdebug;
        }

        planeDetector.onPlaneAddedObservable.add(plane => {
            const mat = createPlaneMaterial(scene);
            const mesh = createPlane(plane, scene, mat);
            planeMap.set(plane.id, mesh);
            updateNavMesh(mesh);
        });
        planeDetector.onPlaneUpdatedObservable.add(plane => {
            const mesh = planeMap.get(plane.id);
            const mat = mesh?.material;
            if (mat) {
                mesh.dispose();
                const newMesh = createPlane(plane, scene, mat);
                planeMap.set(plane.id, newMesh);
            }
        });
        planeDetector.onPlaneRemovedObservable.add(plane => {
            const mesh = planeMap.get(plane.id);
            if (mesh) {
                mesh.dispose();
                planeMap.delete(plane.id);
            }
        });

        setInterval(() => {
            const targetPosition = navigationPlugin.getRandomPointAround(vrmManager.rootMesh.position, 5);

            crowd.agentGoto(agentIndex, targetPosition);
        }, 3000);

        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        return scene;
    }

    useEffect(() => {
        window.CANNON = cannon;

        createScene();
    }, []);

    return (
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
    );
}