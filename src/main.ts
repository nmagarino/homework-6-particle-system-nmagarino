import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Particle from './Particle'
import Mesh from './geometry/Mesh'
import {readTextFile} from './globals';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  numParticles: 125,
  disperse : false,
  bringToPoint : false,
  oscillate : true,
  clickAttract : false,
  'resetVelocities' : resetVelocities,
   'attractToMesh' : attractToMesh,
   mesh : 'wahoo',
   cameraControls : true,
   repel : false,
};

let square: Square;
let time: number = 0.0;
let particlesArray: Particle[] = [];
let n: number = controls.numParticles; // Determines number of particles!
let disperse: boolean = false;
let center : boolean = false;
let oscillation : boolean = true;
let pointAtrract : boolean = false;

// Globally keeps track of mouse coordinates on screen
let mouseX : number;
let mouseY : number;

// Globally tracks current camera
let cam : Camera;

// Make current mesh a subdivided cube for now
let wahoo : Mesh = new Mesh(document.getElementById('wahoo.obj').innerHTML, vec3.fromValues(0,0,0));
wahoo.create();

let cube : Mesh = new Mesh(document.getElementById('subdivCube.obj').innerHTML, vec3.fromValues(0,0,0));
cube.create();

let cow : Mesh = new Mesh(document.getElementById('cow.obj').innerHTML, vec3.fromValues(0,0,0));
cow.create();

let mesh : Mesh; // Just sets up positions for use here
//console.log(mesh.positions);
//console.log(mesh.positions.length / 4);

// Point that particles will converge to / repel from
let attractionPoint : vec3 = vec3.fromValues(0,0,0);

// Converts 2d mouse screen position to a 3d world space position
function screenToWorldPoint() {
  /*
  let x : number = (2.0 * mouseX) / window.innerWidth - 1;
  let y : number = (- 2.0 * mouseY) / window.innerHeight + 1;

  let viewProjInv : mat4 = mat4.create();
  viewProjInv = mat4.multiply(viewProjInv, cam.projectionMatrix, cam.viewMatrix);
  mat4.invert(viewProjInv, viewProjInv);

  let point3d : vec3 = vec3.fromValues(x, y, 0);

  let pointMat : mat4 = mat4.create();
  mat4.fromTranslation(pointMat, point3d);

  mat4.multiply(viewProjInv, viewProjInv, pointMat);
  //let viewProjInv = mat4.invert()

  
  let finalPoint : vec3 = vec3.create();
  mat4.getTranslation(finalPoint, viewProjInv);
  return finalPoint;//?
  */

  /*
  let projMat : mat4 = cam.projectionMatrix;
  let viewMat : mat4 = cam.viewMatrix;

  let viewProjMat : mat4 = mat4.create();
  mat4.multiply(viewProjMat, projMat, viewMat);
  mat4.invert(viewProjMat, viewProjMat);

  // z depth value????
  let vec : vec4 = vec4.fromValues(mouseX, mouseY, 0, 1.0);

  // * viewProjMat[0]

  let newVec : vec4 = vec4.fromValues(vec[0] * viewProjMat[0] + vec[1] * viewProjMat[4] + vec[2] * viewProjMat[8] + vec[3] * viewProjMat[12],
                                      vec[0] * viewProjMat[1] + vec[1] * viewProjMat[5] + vec[2] * viewProjMat[9] + vec[3] * viewProjMat[13],
                                      vec[0] * viewProjMat[2] + vec[1] * viewProjMat[6] + vec[2] * viewProjMat[10] + vec[3] * viewProjMat[14],
                                      vec[0] * viewProjMat[3] + vec[1] * viewProjMat[7] + vec[2] * viewProjMat[11] + vec[3] * viewProjMat[15]);

  vec4.scale(newVec, newVec, newVec[3]);

  */

  let rayOrig : vec3 = cam.position;

  let x : number = (2.0 * mouseX) / window.innerWidth - 1.0;
  let y : number = 1.0 - (2.0 * mouseY) / window.innerHeight;
  let z : number = 1.0;
  let rayNDC : vec3 = vec3.fromValues(x, y, z);

  let rayClip : vec4 = vec4.fromValues(rayNDC[0], rayNDC[1], -1.0, 1.0);


  let projMatInv : mat4 = mat4.create();
  mat4.invert(projMatInv, cam.projectionMatrix);

  let rayEye : vec4 = vec4.fromValues(rayClip[0] * projMatInv[0] + rayClip[1] * projMatInv[4] + rayClip[2] * projMatInv[8] + rayClip[3] * projMatInv[12],
                                      rayClip[0] * projMatInv[1] + rayClip[1] * projMatInv[5] + rayClip[2] * projMatInv[9] + rayClip[3] * projMatInv[13],
                                      rayClip[0] * projMatInv[2] + rayClip[1] * projMatInv[6] + rayClip[2] * projMatInv[10] + rayClip[3] * projMatInv[14],
                                      rayClip[0] * projMatInv[3] + rayClip[1] * projMatInv[7] + rayClip[2] * projMatInv[11] + rayClip[3] * projMatInv[15]);

  rayEye = vec4.fromValues(rayEye[0], rayEye[1], -1.0, 0.0);

  let viewMatInv : mat4 = mat4.create();
  mat4.invert(viewMatInv, cam.viewMatrix);

  let rayWorTemp : vec4 = vec4.fromValues(rayEye[0] * viewMatInv[0] + rayEye[1] * viewMatInv[4] + rayEye[2] * viewMatInv[8] + rayEye[3] * viewMatInv[12],
                                          rayEye[0] * viewMatInv[1] + rayEye[1] * viewMatInv[5] + rayEye[2] * viewMatInv[9] + rayEye[3] * viewMatInv[13],
                                          rayEye[0] * viewMatInv[2] + rayEye[1] * viewMatInv[6] + rayEye[2] * viewMatInv[10] + rayEye[3] * viewMatInv[14],
                                          rayEye[0] * viewMatInv[3] + rayEye[1] * viewMatInv[7] + rayEye[2] * viewMatInv[11] + rayEye[3] * viewMatInv[15]);
  
  let rayWorld : vec3 = vec3.fromValues(rayWorTemp[0], rayWorTemp[1], rayWorTemp[2]);
  vec3.normalize(rayWorld, rayWorld);

  // Need distance from camera to origin (the camera position)
  // Project this value along the ray by length of position vector (?)
  vec3.scale(rayWorld, rayWorld, vec3.length(cam.position));

  rayWorld[2] = cam.target[2];

  

  console.log('Ray: ' + '(' + rayWorld[0] + ', ' + rayWorld[1] + ', ' + rayWorld[2] + ')');


  //let point3d : vec3 = vec3.fromValues(0, 0, 0);
  if(!controls.clickAttract) {
    return vec3.create();
  }
  else {
    return rayWorld;

  }


  //let vecMat : mat4 = mat4.


}

// When the mouse is up, particles converge at origin
function mouseUp(event : MouseEvent) : void {
  attractionPoint = vec3.fromValues(0,0,0);
}

// When mouse is down, particles converge at mouse-specified point
function mouseDown(event: MouseEvent) : void {
  var x: number = event.x;
  var y: number = event.y;


  mouseX = x;
  mouseY = y;
  //x -= window.offs
  console.log('Mouse position: ' + '(' + x + ', ' + y + ')');
  console.log('Screen dimensions: ' + '(' + window.innerWidth + ', ' + window.innerHeight + ')');

  let point : vec3 = screenToWorldPoint();
  attractionPoint = point;
  console.log('3D point: ' + '(' + point[0] + ', ' + point[1] + ', ' + point[2] + ')')
}

function attractToMesh() {
  let count : number = 0;
  for(let j : number = 0; j < mesh.positions.length; j = j + 4) {

    // Throws an error, but not a breaking error
    if(count > particlesArray.length) {
      break;
    }
    

    let p0 = mesh.positions[j];
    let p1 = mesh.positions[j + 1];
    let p2 = mesh.positions[j + 2];
    let p3 = mesh.positions[j + 3];

    let meshPos : vec3 = vec3.fromValues(p0, p1, p2);
    vec3.scale(meshPos, meshPos, 10);


    
    particlesArray[count].pos = meshPos;
    vec3.scale(particlesArray[count].vel, particlesArray[count].vel, 1/10);
    // add an attractive force to particle pos
    count++;
    

    
    /*
    
    let attractVec : vec3 = vec3.create();
    vec3.subtract(attractVec, currParticle.pos, meshPos);
    vec3.scale(attractVec, attractVec, -1);
    vec3.normalize(attractVec, attractVec);
    vec3.scale(attractVec, attractVec, 1/100);

   let epsilon : number = 3.0;
   let diff : vec3 = vec3.create();
   vec3.subtract(diff, currParticle.pos, meshPos);
   let dist : number = vec3.length(diff);
   if(dist < epsilon) {
     // Halt particles
    currParticle.vel = vec3.scale(currParticle.vel, currParticle.vel, 1/10);
    currParticle.changeAcc(vec3.fromValues(Math.random() - .5, Math.random() - .5, Math.random() - .5));
    vec3.scale(currParticle.acc, currParticle.acc, 1/100);
    vec3.normalize(currParticle.acc, currParticle.acc);
    
   }
   */
 }
}

function resetVelocities() {
  for(let i : number = 0 ; i < n ; i++) {
    particlesArray[i].vel = vec3.create();
  }
}

function switchOscillate() {
  oscillation = !oscillation; 
}

function switchPointAtrract() {
  pointAtrract = !pointAtrract;
}

function switchDisperse() {
  disperse = !disperse;
  console.log(disperse);
}

function bringToCenter() {
  center = !center;
  console.log(center);
}

function loadScene() {
  particlesArray = [];
  n = controls.numParticles;
  square = new Square();
  square.create();

  // Set up particles here. Hard-coded example data for now
  /*
  let offsetsArray = [];
  let colorsArray = [];
  let n: number = 100.0;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      offsetsArray.push(i);
      offsetsArray.push(j);
      offsetsArray.push(0);

      colorsArray.push(i / n);
      colorsArray.push(j / n);
      colorsArray.push(1.0);
      colorsArray.push(1.0); // Alpha channel
    }
  }
  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(n * n); // 10x10 grid of "particles"
  */
  

  
   for(let i = 0; i < n; i++) {
     for(let j = 0; j < n; j++) {

      let pos : vec3 = vec3.fromValues(i, j, 0.0);
      let vel : vec3 = vec3.fromValues(0,0,0);

      // For testing, give particles some random acceleration
      let acc: vec3;
      if(controls.disperse) {
        acc = vec3.fromValues(Math.random() - .5,Math.random() - .5,Math.random() - .5);
      }
      else {
        acc = vec3.fromValues(0,0,0);
      }
      //acc = vec3.fromValues(0.0,0.0,1.0);
      vec3.normalize(acc, acc);
      vec3.scale(acc, acc, 1/1000);

      let col : vec4 = vec4.fromValues(i / n, j / n, 1.0, 1.0);
      col  = vec4.fromValues(0.0,1.0,.3,1.0);

      let currTime : number = time;

      //console.log(pos);
      //console.log(col);

      let newParticle : Particle = new Particle(pos, vel, acc, col, currTime);

      particlesArray.push(newParticle);
       /*
       offsetsArray.push(i);
       offsetsArray.push(j);
       offsetsArray.push(0);

       colorsArray.push(i / n);
       colorsArray.push(j / n);
       co///lorsArray.push(1.0);
       colorsArray.push(1.0); // Alpha channel
       */
     }
   }
}

function main() {


  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'numParticles', 0, 300).step(1);
  gui.add(controls, 'disperse');
  gui.add(controls, 'bringToPoint');
  gui.add(controls, 'oscillate');
  gui.add(controls, 'clickAttract');
  gui.add(controls, 'repel');
  gui.add(controls, 'attractToMesh');
  gui.add(controls, 'mesh', ['wahoo', 'moobeast', 'cube']);
  gui.add(controls, 'cameraControls');

  //gui.add(controls, 'resetVelocities');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  //const camera = new Camera(vec3.fromValues(50, 50, 10), vec3.fromValues(50, 50, 0));
  // How to make camera further back??
  const camera = new Camera(vec3.fromValues(0, 0, 120), vec3.fromValues(0, 0, 0));
  cam = camera;

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.0, 0.0, 0.0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  // Add mouse click event listener
  

  window.addEventListener("mousedown", mouseDown, false);
  window.addEventListener("mouseup", mouseUp, false);
  


  // This function will be called every frame
  function tick() {
    
    switch(controls.mesh) {
      case 'wahoo': 
      mesh = wahoo;
      break;
      case 'moobeast': 
      mesh = cow;
      break;
      case 'cube': 
      mesh = cube;
      break;
    }
    //mesh.create();



   // Instead, render particles every tick (so we can affect velocity)
   let offsetsArray = [];
   let colorsArray = [];
   for(let i = 0; i < particlesArray.length; i++) {
     
     let currParticle = particlesArray[i];

     
     //console.log(disperse);

     // Either disperse or freeze particles
     if(controls.disperse) {

      //currParticle.changeAcc(vec3.fromValues(0,0,0));
      //currParticle.vel = vec3.create();

      currParticle.acc = vec3.fromValues(Math.random() - .5,Math.random() - .5,Math.random() - .5);
      vec3.normalize(currParticle.acc, currParticle.acc);
      vec3.scale(currParticle.acc, currParticle.acc, 1/100);
     }
     else {
      currParticle.changeAcc(vec3.fromValues(0,0,0));
      currParticle.vel = vec3.create();

      currParticle.acc = vec3.fromValues(Math.random() - .5,Math.random() - .5,Math.random() - .5);
      vec3.normalize(currParticle.acc, currParticle.acc);
      vec3.scale(currParticle.acc, currParticle.acc, 1/100);

      //vec3.normalize(currParticle.acc, currParticle.acc);
      //vec3.scale(currParticle.acc, currParticle.acc, 1/1000);
     }

     // Bring particles to origin
     // But we can do this for any arbitrary point
     if(controls.bringToPoint) {
       // Need acc vector from pos to origin
       // This vector will be the pos vector negated.
       let originVec : vec3 = vec3.create(); 
       vec3.copy(originVec, currParticle.pos);

       vec3.subtract(originVec, originVec, attractionPoint);

       //vec3.scale(originVec, originVec, -1);
       // If not repelling particles, pull them in
       if(!controls.repel) {
         vec3.scale(originVec, originVec, -1);
       }
       vec3.normalize(originVec, originVec);
       vec3.scale(originVec, originVec, 1/100);

       currParticle.changeAcc(originVec);

       let epsilon : number = 5.0;
       let diff : vec3 = vec3.create();
       vec3.subtract(diff, currParticle.pos, attractionPoint);
       let dist : number = vec3.length(diff);

       if(!controls.oscillate && (dist < epsilon)) {
         //console.log('Yeet');
         currParticle.vel = vec3.scale(currParticle.vel, currParticle.vel, 1/10);
         //currParticle.changeVel(vec3.create());
         currParticle.changeAcc(vec3.fromValues(Math.random() - .5, Math.random() - .5, Math.random() - .5));
         vec3.scale(currParticle.acc, currParticle.acc, 1/100);
         //currParticle.changeAcc(vec3.create());
         //currParticle.changePos(attractionPoint);
         vec3.normalize(currParticle.acc, currParticle.acc);
       }
       //if()
     }

     /*
     if(controls.attractToMesh) {
       currParticle.changeAcc(vec3.create()); //?
       // If attracting to mesh, pull particles to each vertex, stopping them 
       // once near enough to a vertex position
       // May need to reset all forces?
       // Need all vertex positions
       // Add a attracting force from each mesh position to the particle pos
       for(let j : number = 0; j < mesh.positions.length; j = j + 4) {
         let p0 = mesh.positions[j];
         let p1 = mesh.positions[j + 1];
         let p2 = mesh.positions[j + 2];
         let p3 = mesh.positions[j + 3];

         let meshPos : vec3 = vec3.fromValues(p0, p1, p2);

         /*
         let attractVec : vec3 = vec3.create();
         vec3.subtract(attractVec, currParticle.pos, meshPos);
         vec3.scale(attractVec, attractVec, -1);
         vec3.normalize(attractVec, attractVec);
         vec3.scale(attractVec, attractVec, 1/100);

        let epsilon : number = 3.0;
        let diff : vec3 = vec3.create();
        vec3.subtract(diff, currParticle.pos, meshPos);
        let dist : number = vec3.length(diff);
        if(dist < epsilon) {
          // Halt particles
         currParticle.vel = vec3.scale(currParticle.vel, currParticle.vel, 1/10);
         currParticle.changeAcc(vec3.fromValues(Math.random() - .5, Math.random() - .5, Math.random() - .5));
         vec3.scale(currParticle.acc, currParticle.acc, 1/100);
         vec3.normalize(currParticle.acc, currParticle.acc);
         
        }
       }
       controls.attractToMesh = false;
     }*/

     // Finally, update positions
     currParticle.update(time);

     let pos : vec3 = currParticle.pos;
     offsetsArray.push(pos[0]);
     offsetsArray.push(pos[1]);
     offsetsArray.push(pos[2]);

     //console.log(pos);

     let col : vec4 = currParticle.col;
     colorsArray.push(col[0]);
     colorsArray.push(col[1]);
     colorsArray.push(col[2]);
     colorsArray.push(col[3]);

     //console.log(col);
   }
   /*
   let n: number = 100.0;
   for(let i = 0; i < n; i++) {
     for(let j = 0; j < n; j++) {
       offsetsArray.push(i);
       offsetsArray.push(j);
       offsetsArray.push(0);

       colorsArray.push(i / n);
       colorsArray.push(j / n);
       colorsArray.push(1.0);
       colorsArray.push(1.0); // Alpha channel
     }
   }
   */
   let offsets: Float32Array = new Float32Array(offsetsArray);
   let colors: Float32Array = new Float32Array(colorsArray);
   square.setInstanceVBOs(offsets, colors);
   square.setNumInstances(n * n); // 10x10 grid of "particles"

   // Regular tick functions

    if(controls.cameraControls) {
      camera.update();
    }
  
    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  

  // Start the render loop
  tick();
}

main();
