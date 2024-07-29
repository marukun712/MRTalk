import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createScene(renderer: THREE.WebGLRenderer) {
    //シーンの作成
    const scene = new THREE.Scene();

    //カメラを追加
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0.0, 1.4, 7);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.screenSpacePanning = true;
    orbitControls.target.set(0.0, 0.0, 0.0);
    orbitControls.update();

    //ライトを追加
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    return { scene, camera };
} 
