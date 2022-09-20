import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SolidParticleSystem, PointLight, StandardMaterial, Texture, UniversalCamera } from "@babylonjs/core";
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
        var camera: UniversalCamera = new UniversalCamera("camera", new Vector3(0, 1, 1), scene);
        camera.attachControl(canvas, true);
        camera.target = Vector3.Zero();
        if (camera.speed > 0.1) {
            camera.speed = 0.1;
        };
        camera.minZ = 0.00000000000001;

        // adding sunlight
        var sunlight: PointLight = new PointLight("sunlight", Vector3.Zero(), scene);

        // make the backs of planets visible
        var ambLight: HemisphericLight = new HemisphericLight("ambient", Vector3.Zero(), scene);
        ambLight.intensity = 0.3;

        // spawning planets
        let planets = [];
        for (var i = 0; i < activeSystem.planets.length; i ++) {
            planets.push(
                MeshBuilder.CreateSphere("planet", { diameter: activeSystem.planets[i].info.magnitude.radius * 0.00002 }, scene)
            );

            planets[i].rotation.z = (Math.PI / 180) * activeSystem.planets[i].info.orbit["axial tilt"];

            planets[i].position = new Vector3(activeSystem.planets[i].position.x, activeSystem.planets[i].position.y, activeSystem.planets[i].position.z);
            let texture = new StandardMaterial("texture", scene);
            texture.diffuseTexture = new Texture(activeSystem.rootUrl + activeSystem.planets[i].texture);
            planets[i].material = texture;
        };
        // orbiting planets using given equations
        var time = 0;
        let orbit = setInterval(() => {
            for (var i = 0; i < planets.length; i ++) {
                planets[i].position.x = activeSystem.planets[i].equations.x.amplitude * Math.cos((2 * Math.PI / activeSystem.planets[i].equations.x.period) * time) + activeSystem.planets[i].equations.x.center;
                planets[i].position.y = activeSystem.planets[i].equations.y.amplitude * Math.cos((2 * Math.PI / activeSystem.planets[i].equations.y.period) * time) + activeSystem.planets[i].equations.y.center;
                planets[i].position.z = activeSystem.planets[i].equations.z.amplitude * Math.sin((2 * Math.PI / activeSystem.planets[i].equations.z.period) * time) + activeSystem.planets[i].equations.z.center;           
                console.log(planets[i].position.z);
                planets[i].rotate(planets[i].up, 2 * Math.PI / activeSystem.planets[i].info.orbit.lengthOfDay, scene);
            }
            time += 1;
        })

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}
new App();