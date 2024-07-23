import { useEffect } from "react";
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { LoadVRM } from "~/utils/VRM/LoadVRM";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { init, NavMeshQuery } from 'recast-navigation';
import { threeToSoloNavMesh } from 'recast-navigation/three';
import {
    BoxGeometry,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
} from 'three';

export default function Three() {
    useEffect(() => {
        (async () => {
            await init();

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setAnimationLoop(animate);
            renderer.xr.enabled = true;
            document.body.appendChild(renderer.domElement);

            document.body.appendChild(ARButton.createButton(renderer, {
                requiredFeatures: ['plane-detection']
            }));

            window.addEventListener('resize', onWindowResize);

            const scene = new THREE.Scene();
            const grounds: Mesh[] = new Array();

            const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
            light.position.set(0.5, 1, 0.25);
            scene.add(light);

            const matrix = new Matrix4();

            const currentPlanes = new Map();

            const xr = renderer.xr;

            xr.addEventListener('planesdetected', event => {

                const frame = event.data;
                const planes = frame.detectedPlanes;

                const referenceSpace = xr.getReferenceSpace();

                for (const [plane, mesh] of currentPlanes) {

                    if (planes.has(plane) === false) {

                        mesh.geometry.dispose();
                        mesh.material.dispose();
                        scene.remove(mesh);

                        currentPlanes.delete(plane);
                    }

                }

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
                            color: 0xffffff * Math.random(), transparent: true, opacity: 0.2
                        });

                        const mesh = new Mesh(geometry, material);
                        mesh.position.setFromMatrixPosition(matrix);
                        mesh.quaternion.setFromRotationMatrix(matrix);
                        scene.add(mesh);
                        grounds.push(mesh);

                        currentPlanes.set(plane, mesh);
                    }
                }
            });

            xr.addEventListener('sessionstart', start => {
                setTimeout(() => {
                    const { navMesh } = threeToSoloNavMesh(grounds);
                    console.log(navMesh)

                    if (!navMesh) return;
                    const navMeshQuery = new NavMeshQuery(navMesh);
                    const radius = 0.5;
                    const {
                        success,
                        status,
                        randomPolyRef,
                        randomPoint: initialAgentPosition,
                    } = navMeshQuery.findRandomPointAroundCircle(model!.scene.position, radius);

                    console.log(success, status, randomPolyRef, initialAgentPosition)
                }, 5000);
            })

            let model: GLTF;

            try {
                model = await LoadVRM("./models/school-girl.vrm");
                scene.add(model.scene);

                model.scene.position.x = 0;
                model.scene.position.y = -1.5;
                model.scene.position.z = 0;
            } catch (e) {
                console.log(e);
            }

            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(window.innerWidth, window.innerHeight);
            }

            function animate() {
                renderer.render(scene, camera);
            }
        })()
    }, []);

    return (
        <div></div>
    );
}
