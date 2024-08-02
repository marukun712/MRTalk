import {
    BoxGeometry,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Scene,
    WebXRManager
} from 'three';

export function XRPlanes(xr: WebXRManager, scene: Scene) {
    const matrix = new Matrix4();
    const currentPlanes = new Map();
    const grounds: Mesh[] = new Array();

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

    return grounds
}