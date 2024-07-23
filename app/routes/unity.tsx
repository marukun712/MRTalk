import { Unity, useUnityContext } from "react-unity-webgl";

export default function UnityPage() {
    const { unityProvider, isLoaded } = useUnityContext({
        loaderUrl: "build/webgl.loader.js",
        dataUrl: "build/webgl.data",
        frameworkUrl: "build/webgl.framework.js",
        codeUrl: "build/webgl.wasm",
    });

    return <div>{isLoaded ? "loaded" : "loading..."} <Unity unityProvider={unityProvider} id="unity-canvas" /></div>;
}