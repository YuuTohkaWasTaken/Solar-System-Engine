import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SolidParticleSystem } from "@babylonjs/core";
import activeSystem from "./solar-systems/sol.json";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene = new Scene(engine);

        // configuring camera
        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", 0, Math.PI / 2, 15, Vector3.Zero(), scene);
        camera.attachControl(canvas, true);

        // spawning planets
        let planets = [];
        for (var i = 0; i < activeSystem.planets.length; i ++) {
            planets.push(
                MeshBuilder.CreateSphere("planet", { diameter: 0.4878 }, scene)
            );
            planets[i].position = new Vector3(activeSystem.planets[i].position.x, activeSystem.planets[i].position.y, activeSystem.planets[i].position.z);
        };

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}
new App();