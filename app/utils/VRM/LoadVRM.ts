import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMUtils } from '@pixiv/three-vrm'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function LoadVRM(path: string): Promise<GLTF> {
    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";

    return new Promise((resolve, reject) => {
        loader.load(
            path,

            (gltf: GLTF) => {
                VRMUtils.removeUnnecessaryJoints(gltf.scene);

                resolve(gltf);
            },

            (progress: { loaded: number, total: number }) => console.log("Loading model...", 100.0 * (progress.loaded / progress.total), "%"),

            (error: Error) => { reject(error); }
        );
    });
}