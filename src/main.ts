import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Particle from './Particle'

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  numParticles: 100,
  'disperse': switchDisperse,
  'bringToCenter': bringToCenter,
};

let square: Square;
let time: number = 0.0;
let particlesArray: Particle[] = [];
let n: number = controls.numParticles; // Determines number of particles!
let disperse: boolean = false;
let center : boolean = false;

// Globally keeps track of mouse coordinates on screen
let mouseX : number;
let mouseY : number;

// Globally tracks current camera
let cam : Camera;

// Point that particles will converge to / repel from
let attractionPoint : vec3 = vec3.fromValues(0,0,0);

// Converts 2d mouse screen position to a 3d world space position
function screenToWorldPoint() {
  let x : number = 2.0 * mouseX / window.innerWidth - 1;
  let y : number = - 2.0 * mouseY / window.innerHeight + 1;

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
      if(disperse) {
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
       colorsArray.push(1.0);
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
  gui.add(controls, 'bringToCenter');

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

  const camera = new Camera(vec3.fromValues(50, 50, 10), vec3.fromValues(50, 50, 0));
  cam = camera;

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
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



   // Instead, render particles every tick (so we can affect velocity)
   let offsetsArray = [];
   let colorsArray = [];
   for(let i = 0; i < particlesArray.length; i++) {
     
     let currParticle = particlesArray[i];

     
     //console.log(disperse);

     // Either disperse or freeze particles
     if(disperse) {
      currParticle.acc = vec3.fromValues(Math.random() - .5,Math.random() - .5,Math.random() - .5);
      vec3.normalize(currParticle.acc, currParticle.acc);
      vec3.scale(currParticle.acc, currParticle.acc, 1/100);
     }
     else {
      currParticle.changeAcc(vec3.fromValues(0,0,0));
      currParticle.vel = vec3.create();
      //vec3.normalize(currParticle.acc, currParticle.acc);
      //vec3.scale(currParticle.acc, currParticle.acc, 1/1000);
     }

     // Bring particles to origin
     // But we can do this for any arbitrary point
     if(center) {
       // Need acc vector from pos to origin
       // This vector will be the pos vector negated.
       let originVec : vec3 = vec3.create(); 
       vec3.copy(originVec, currParticle.pos);

       vec3.subtract(originVec, originVec, attractionPoint);

       vec3.scale(originVec, originVec, -1);
       vec3.normalize(originVec, originVec);
       vec3.scale(originVec, originVec, 1/100);

       currParticle.changeAcc(originVec);
       //if()
     }


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

    camera.update();
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
