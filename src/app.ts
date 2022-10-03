import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SolidParticleSystem, PointLight, StandardMaterial, Texture, UniversalCamera, Color3, GlowLayer, Color4, AbstractMesh, LinesMesh, FreeCameraMouseWheelInput, PhotoDome, ActionManager, ExecuteCodeAction, HighlightLayer } from "@babylonjs/core";
import activeSystem from "./solar-systems/sol.json";
import { pointCloudVertex } from "@babylonjs/core/Shaders/ShadersInclude/pointCloudVertex";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true, {stencil: true});
        var scene = new Scene(engine);

        // configuring camera
        var camera: UniversalCamera = new UniversalCamera("camera", new Vector3(0, 1, 1), scene);
        camera.attachControl(canvas, true);
        camera.target = Vector3.Zero();
        if (camera.speed > 0.1) {
            camera.speed = 0.1;
        };
        camera.minZ = 0.001;

        // adding info camera
        var infoCam: ArcRotateCamera = new ArcRotateCamera("info", 0, 0, 0, Vector3.Zero(), scene)
        infoCam.minZ = 0.00001;

        // adding sunlight
        var sunlight: PointLight = new PointLight("sunlight", Vector3.Zero(), scene);
        sunlight.specular = new Color3(0, 0, 0)

        // make the backs of planets visible
        var ambLight: HemisphericLight = new HemisphericLight("ambient", Vector3.Zero(), scene);
        ambLight.intensity = 0.3;
        ambLight.specular = new Color3(0,0,0);

        // spawning sun
        let sun: Mesh = MeshBuilder.CreateSphere("sun", { diameter: activeSystem.sun.radius * 0.0000002}, scene)
        let sunTexture = new StandardMaterial("sun", scene)
        sunTexture.diffuseTexture = new Texture(activeSystem.rootUrl + activeSystem.sun.texture)
        sun.material = sunTexture
        sun.rotate(Vector3.Backward(), Math.PI);

        // making sun bright
        let sunVisiblity: HemisphericLight = new HemisphericLight("sunvis", Vector3.Zero(), scene)
        sunVisiblity.intensity = 1.5
        sunVisiblity.specular = new Color3(0,0,0)
        sunVisiblity.includedOnlyMeshes = [sun]
        let sunGlow: GlowLayer = new GlowLayer("sunglow", scene)
        sunGlow.addIncludedOnlyMesh(sun)
        sunGlow.intensity = 0.5
        sunGlow.blurKernelSize = 64
        sunGlow.neutralColor = new Color4(1,1,1,0)

        

        // spawning planets
        let planets = [];
        let orbitLines = [];
        for (var i = 0; i < activeSystem.planets.length; i ++) {
            planets.push(
                MeshBuilder.CreateSphere(activeSystem.planets[i].name, { diameter: (activeSystem.planets[i].info.magnitude.radius * 0.00002) }, scene)
            );            

            if (activeSystem.planets[i].hasOwnProperty("rings")) {
                let ring = MeshBuilder.CreateDisc("rings", { radius: activeSystem.planets[i].rings.radius, sideOrientation: Mesh.DOUBLESIDE })
                let ringText = new StandardMaterial("rings", scene)
                ringText.diffuseTexture = new Texture(activeSystem.rootUrl + activeSystem.planets[i].rings.texture)
                ringText.diffuseTexture.hasAlpha = true;
                ring.material = ringText;

                let texture = new StandardMaterial("texture", scene);
                texture.diffuseTexture = new Texture(activeSystem.rootUrl + activeSystem.planets[i].texture);
                planets[i].material = texture;

                ring.isPickable = false;

                ring.rotate(Vector3.Right(), Math.PI/2)                
                ring.rotate(Vector3.Forward(), (Math.PI / 180) * activeSystem.planets[i].info.orbit["axial tilt"])

                planets[i] = Mesh.MergeMeshes([ring, planets[i]], true, true, undefined, true, true)
            } else {
                let texture = new StandardMaterial("texture", scene);
                texture.diffuseTexture = new Texture(activeSystem.rootUrl + activeSystem.planets[i].texture);
                planets[i].material = texture;
            }

            planets[i].rotation.z = (Math.PI / 180) * activeSystem.planets[i].info.orbit["axial tilt"];
            planets[i].rotate(Vector3.Backward(), Math.PI, scene);
            
            var options = []
            for (var j = 0; j < activeSystem.planets[i].info.orbit.lengthOfYear; j ++) {
                options.push(new Vector3(activeSystem.planets[i].equations.x.amplitude * Math.cos(j * 2 * Math.PI / (activeSystem.planets[i].info.orbit.lengthOfYear)) + activeSystem.planets[i].equations.x.center, activeSystem.planets[i].equations.y.amplitude * Math.cos(j * 2 * Math.PI / (activeSystem.planets[i].info.orbit.lengthOfYear)) + activeSystem.planets[i].equations.y.center, activeSystem.planets[i].equations.z.amplitude * Math.sin(j * 2 * Math.PI / (activeSystem.planets[i].info.orbit.lengthOfYear)) + activeSystem.planets[i].equations.z.center))
            }
            var orbitLine: LinesMesh = MeshBuilder.CreateLines("orbit", { points: options }, scene)
            orbitLine.isPickable = false;
            orbitLines.push(orbitLine);
            
        };

        // adding info sheets
        sun.isPickable = false;
        var currentPlanetIndex: number; 
        var isCurrentTab: boolean;
        scene.onPointerDown = (ev, pickResult) => {
            if (pickResult.hit && pickResult.pickedMesh.isPickable) {
                currentPlanetIndex = planets.indexOf(pickResult.pickedMesh);
                scene.activeCamera = infoCam;
                infoCam.target = pickResult.pickedMesh.position;
                infoCam.radius = activeSystem.planets[currentPlanetIndex].info.magnitude.radius * 0.00005;
                document.getElementById("infoSheet").style.opacity = "1";
                document.getElementById("infoSheet").style.zIndex = "1";
                document.getElementById("info").innerText = "Length of Solar Day: " + activeSystem.planets[currentPlanetIndex].info.orbit.lengthOfDay + " hours\nLength of Solar Year: " + activeSystem.planets[currentPlanetIndex].info.orbit.lengthOfYear + " hours\nFurthest distance from sun (Aphelion): " + activeSystem.planets[currentPlanetIndex].info.orbit.aphelion + " km\nClosest distance from sun (Perihelion): " + activeSystem.planets[currentPlanetIndex].info.orbit.perihelion + " km\nAxial Tilt: " + activeSystem.planets[currentPlanetIndex].info.orbit["axial tilt"] + " degrees";
                document.getElementById("magnitude").style.backgroundColor = "rgb(143, 143, 143)";
                document.getElementById("atmosphere").style.backgroundColor = "rgb(143, 143, 143)";
                document.getElementById("funFacts").style.backgroundColor = "rgb(143, 143, 143)";
                document.getElementById("orbit").style.backgroundColor = "rgb(80, 80, 80)";

                // adding hover effects
                document.getElementById("magnitude").onmouseenter = () => {
                    if (document.getElementById("magnitude").style.backgroundColor == "rgb(143, 143, 143)") {
                        isCurrentTab = false;
                    } else {
                        isCurrentTab = true;
                    }
                    document.getElementById("magnitude").style.backgroundColor = "rgb(100, 100, 100)";
                }
                document.getElementById("magnitude").onmouseleave = () => {
                    if (isCurrentTab == true) {
                        document.getElementById("magnitude").style.backgroundColor = "rgb(80, 80, 80)";
                    } else {
                        document.getElementById("magnitude").style.backgroundColor = "rgb(143, 143, 143)";
                    }
                    
                }
                document.getElementById("orbit").onmouseenter = () => {
                    if (document.getElementById("orbit").style.backgroundColor == "rgb(143, 143, 143)") {
                        isCurrentTab = false;
                    } else {
                        isCurrentTab = true;
                    }
                    document.getElementById("orbit").style.backgroundColor = "rgb(100, 100, 100)";
                }
                document.getElementById("orbit").onmouseleave = () => {
                    if (isCurrentTab == true) {
                        document.getElementById("orbit").style.backgroundColor = "rgb(80, 80, 80)";
                    } else {
                        document.getElementById("orbit").style.backgroundColor = "rgb(143, 143, 143)";
                    }
                    
                }
                document.getElementById("atmosphere").onmouseenter = () => {
                    if (document.getElementById("atmosphere").style.backgroundColor == "rgb(143, 143, 143)") {
                        isCurrentTab = false;
                    } else {
                        isCurrentTab = true;
                    }
                    document.getElementById("atmosphere").style.backgroundColor = "rgb(100, 100, 100)";
                }
                document.getElementById("atmosphere").onmouseleave = () => {
                    if (isCurrentTab == true) {
                        document.getElementById("atmosphere").style.backgroundColor = "rgb(80, 80, 80)";
                    } else {
                        document.getElementById("atmosphere").style.backgroundColor = "rgb(143, 143, 143)";
                    }
                    
                }
                document.getElementById("funFacts").onmouseenter = () => {
                    if (document.getElementById("funFacts").style.backgroundColor == "rgb(143, 143, 143)") {
                        isCurrentTab = false;
                    } else {
                        isCurrentTab = true;
                    }
                    document.getElementById("funFacts").style.backgroundColor = "rgb(100, 100, 100)";
                }
                document.getElementById("funFacts").onmouseleave = () => {
                    if (isCurrentTab == true) {
                        document.getElementById("funFacts").style.backgroundColor = "rgb(80, 80, 80)";
                    } else {
                        document.getElementById("funFacts").style.backgroundColor = "rgb(143, 143, 143)";
                    }
                    
                }

                document.getElementById("orbit").onclick = () => {
                    document.getElementById("info").innerText = "Length of Solar Day: " + activeSystem.planets[currentPlanetIndex].info.orbit.lengthOfDay + " hours\nLength of Solar Year: " + activeSystem.planets[currentPlanetIndex].info.orbit.lengthOfYear + " hours\nFurthest distance from sun (Aphelion): " + activeSystem.planets[currentPlanetIndex].info.orbit.aphelion + " km\nClosest distance from sun (Perihelion): " + activeSystem.planets[currentPlanetIndex].info.orbit.perihelion + " km\nAxial Tilt: " + activeSystem.planets[currentPlanetIndex].info.orbit["axial tilt"] + " degrees"
                    
                    document.getElementById("magnitude").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("atmosphere").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("funFacts").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("orbit").style.backgroundColor = "rgb(80, 80, 80)";
                    isCurrentTab = true;
                }
                document.getElementById("magnitude").onclick = () => {
                    document.getElementById("info").innerText = "Gravitational Pull: " + activeSystem.planets[currentPlanetIndex].info.magnitude.gravity + "\nRadius: " + activeSystem.planets[currentPlanetIndex].info.magnitude.radius + " km";
                    
                    document.getElementById("orbit").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("atmosphere").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("funFacts").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("magnitude").style.backgroundColor = "rgb(80, 80, 80)";
                    isCurrentTab = true;
                }
                document.getElementById("atmosphere").onclick = () => {
                    document.getElementById("info").innerText = "Atmospheric Pressure: " + activeSystem.planets[currentPlanetIndex].info.atmosphere.pressure + "\nAtmospheric Composition: " + activeSystem.planets[currentPlanetIndex].info.atmosphere.composition
                
                    document.getElementById("orbit").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("magnitude").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("funFacts").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("atmosphere").style.backgroundColor = "rgb(80, 80, 80)";
                    isCurrentTab = true;
                }
                document.getElementById("funFacts").onclick = () => {
                    document.getElementById("info").innerText = "";
                    for (var i = 0; i < activeSystem.planets[currentPlanetIndex].info["fun facts"].length; i ++) {
                        document.getElementById("info").innerText += activeSystem.planets[currentPlanetIndex].info["fun facts"][i];
                        document.getElementById("info").innerText += ".\n";
                    };

                    document.getElementById("orbit").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("magnitude").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("atmosphere").style.backgroundColor = "rgb(143, 143, 143)";
                    document.getElementById("funFacts").style.backgroundColor = "rgb(80, 80, 80)";
                    isCurrentTab = true;
                }

            } else {
                if (scene.activeCamera != camera) {
                    scene.activeCamera = camera;
                    camera.position = infoCam.position
                    camera.target = infoCam.target
                    document.getElementById("infoSheet").style.opacity = "0";
                    document.getElementById("infoSheet").style.zIndex = "-2";
                }
            }
        }

        // makes hovered planet glow
        var glow: HighlightLayer = new HighlightLayer("glow", scene);
        let actionManager = new ActionManager(scene)
        for (i = 0; i < planets.length; i ++) {
            planets[i].actionManager = actionManager
            actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                glow.addMesh(<Mesh>scene.meshUnderPointer, Color3.Gray());
            }))
            actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                glow.removeMesh(<Mesh>scene.meshUnderPointer);
            }))
        }

        // orbiting planets using given equations
        var time = 0;
        let orbit = setInterval(() => {
            for (var i = 0; i < planets.length; i ++) {
                planets[i].position.x = activeSystem.planets[i].equations.x.amplitude * Math.cos((2 * Math.PI / activeSystem.planets[i].info.orbit.lengthOfYear) * time) + activeSystem.planets[i].equations.x.center;
                planets[i].position.y = activeSystem.planets[i].equations.y.amplitude * Math.cos((2 * Math.PI / activeSystem.planets[i].info.orbit.lengthOfYear) * time) + activeSystem.planets[i].equations.y.center;
                planets[i].position.z = activeSystem.planets[i].equations.z.amplitude * Math.sin((2 * Math.PI / activeSystem.planets[i].info.orbit.lengthOfYear) * time) + activeSystem.planets[i].equations.z.center;           
                planets[i].rotate(planets[i].up, 2 * Math.PI * parseFloat((<HTMLSelectElement>document.getElementById("speed")).value) / activeSystem.planets[i].info.orbit.lengthOfDay, scene);
            }
            time += parseFloat((<HTMLSelectElement>document.getElementById("speed")).value);
            console.log(time);
        }, 1000/60)

        // checking if checkbox is checked
        document.getElementById("lines").onmousedown = () => {
            if ((document.getElementById("lines") as HTMLInputElement | null)?.checked == false) {
                for (i = 0; i < orbitLines.length; i ++) {
                    orbitLines[i].alpha = 1;
                }
            } else {
                for (i = 0; i < orbitLines.length; i ++) {
                    orbitLines[i].alpha = 0;
                }
            }
        }

        // recenter button
        let positions = [new Vector3(0, 10, 0), new Vector3(0, 5 * Math.sqrt(2), 5 * Math.sqrt(2)), new Vector3(0, 0, 10)]
        document.getElementById("recenter").onmousedown = () => {
            scene.activeCamera = camera;
            camera.position = positions[parseInt((<HTMLSelectElement>document.getElementById("centerMode")).value)];
            camera.target = Vector3.Zero();
        }

        // photodome
        var background: PhotoDome = new PhotoDome("photodome", "https://raw.githubusercontent.com/YuuTohkaWasTaken/planettextures/main/space.jpg", {}, scene)
        background.mesh.isPickable = false;
        background.material.alpha = 0.2;    

        scene.clearColor = new Color4(0, 0, 0, 1);

        camera.inputs.addMouseWheel()
        camera.inputs._mouseWheelInput.wheelPrecisionX = 0.01
        camera.inputs._mouseWheelInput.wheelPrecisionY = 0.01
        camera.inputs._mouseWheelInput.wheelPrecisionZ = 0.01

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}
new App();
