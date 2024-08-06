import { VRMUtils } from "@pixiv/three-vrm";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import * as THREE from "three";

export function LoadVRM(path: string): Promise<GLTF> {
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  const helperRoot = new THREE.Group();

  loader.register((parser) => {
    return new VRMLoaderPlugin(parser, {
      helperRoot: helperRoot,
      autoUpdateHumanBones: true,
    });
  });

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf: GLTF) => {
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        if (gltf.userData.gltfExtensions?.VRM) { //VRM-0.xのモデルかどうかチェックする
          reject(
            "モデルのバージョンに互換性がありません。VRM-1.xのモデルを使用してください。",
          );
        }

        gltf.userData.vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        resolve(gltf);
      },
      (progress: { loaded: number; total: number }) =>
        console.log(
          "Loading model...",
          100.0 * (progress.loaded / progress.total),
          "%",
        ),
      (error) => {
        reject(error);
      },
    );
  });
}
