// WebGL context, canvas and shaderprogram objects
var gl;
var canvas;
var shaderProgram;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = glMatrix.vec3.fromValues(0.0,2.0,70.0);
var viewDir = glMatrix.vec3.fromValues(0.0,0.0,-1.0);
var up = glMatrix.vec3.fromValues(0.0,1.0,0.0);
var viewPt = glMatrix.vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = glMatrix.mat3.create();

// Create ModelView matrix
var mvMatrix = glMatrix.mat4.create();

//Create Projection matrix
var pMatrix = glMatrix.mat4.create();

// Light parameters
//light position
var lightx=1.0;
var lighty=1.0;
var lightz=1.0;

//light intensity
var alight =0.0;
var dlight =1.0;
var slight =1.0;

/** @global The number of the balls */
var BallsNumber;

/** @global List to hold Ball objects */
var Balls = [];

/** @global Gravity value */
var Grav = -9.8 / 3000;

/** @global Friction values for each axis */
var xFriction = 1.001;
var yFriction = 1.001;
var zFriction = 1.001;

/** @global Box dimensions (2*xWidth * 2*yWidth * 2*zWidth) */
var xWidth = 30;
var yWidth = 30;
var zWidth = 30;

/** @global Translate vector to translate Balls */
var translateVec = glMatrix.vec3.create();

/** @global Placeholder matrix to hold the original mvMatrix value */
var mvMatrix_default = glMatrix.mat4.create();

/** 
 * @global A hashmap with a key as a keyboard input and a value as boolean
 *     which is true when the key is pressed and false if not
 */
var curKeys = {};

//----------------------------------------------------------------------------------
/**
 * Randomly set the initial positions of a ball
 */
function SetBallsPositions () {
  x = Math.floor(((Math.random() - 0.5) * xWidth * 2));
  // y position is set to be higher than 0 to show bouncing
  y = Math.floor((Math.random() * yWidth) + yWidth);
  z = Math.floor(((Math.random() - 0.5) * zWidth * 2));
  return [x,y,z];
}

//----------------------------------------------------------------------------------
/**
 * Set the initial positions, velocities, colors (including shininess) and 
 * reflectivity (degree of bouncing [0:1])
 */
function Ball () {
  this.Position = SetBallsPositions();
  this.xV = (Math.random() - 0.5);
  this.yV = (Math.random() - 0.5);
  this.zV = (Math.random() - 0.5);
  this.Radius = 1.0;

  var R = Math.random();
  var G = Math.random();
  var B = Math.random();
  // S (Shininess) is in [0:100] unlike RGB
  var S = Math.floor(Math.random() * 100);
  this.Color = [R, G, B, S];
  // Reflectivity is set to be higher than 0.5 to show bouncing
  this.Reflectivity = Math.random() * 0.5 + 0.5;
}

//----------------------------------------------------------------------------------
/**
 * Update the positions and velocities using Euler integration
 * Note:  
 * assumed the time difference between each frame to be 1s instead of using the 
 * actual time for easier calculations
 */
Ball.prototype.update = function () {
  // Update velocities using Euler integration
  this.xV /= xFriction;
  this.yV /= yFriction;
  this.zV /= zFriction;
  this.yV += Grav;
  // Update positions using Euler integration
  this.Position[0] += this.xV;
  this.Position[1] += this.yV;
  this.Position[2] += this.zV;

  // Edge cases for x-axis
  if (this.Position[0] - this.Radius < -xWidth) {
    this.Position[0] = 2 * (-xWidth) -this.Position[0] + 2 * this.Radius;
    this.xV = -this.xV * this.Reflectivity;
  }
  if (this.Position[0] + this.Radius >= xWidth) {
    this.Position[0] = 2 * xWidth - this.Position[0] - 2 * this.Radius;
    this.xV = -this.xV * this.Reflectivity;
  }
  // Edge cases for y-axis
  if (this.Position[1] - this.Radius < -yWidth) {
    this.Position[1] = 2 * (-yWidth) -this.Position[1] + 2 * this.Radius;
    this.yV = -this.yV * this.Reflectivity;
  }
  if (this.Position[1] + this.Radius >= yWidth) {
    this.Position[1] = 2 * yWidth - this.Position[1] - 2 * this.Radius;
    this.yV = -this.yV * this.Reflectivity;
  }
  // Edge cases for z-axis
  if (this.Position[2] - this.Radius < -zWidth) {
    this.Position[2] = 2 * (-zWidth) -this.Position[2] + 2 * this.Radius;
    this.zV = -this.zV * this.Reflectivity;
  }
  if (this.Position[2] + this.Radius >= zWidth) {
    this.Position[2] = 2 * zWidth - this.Position[2] - 2 * this.Radius;
    this.zV = -this.zV * this.Reflectivity;
  }
}

function AddBalls(N) {
  // Create Ball objects and push it to the list
  for (i = 0; i < N; i++) {
    Balls.push(new Ball());
  }
}

//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere(){
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  glMatrix.mat3.fromMat4(nMatrix,mvMatrix);
  glMatrix.mat3.transpose(nMatrix,nMatrix);
  glMatrix.mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders(vshader,fshader) {
  vertexShader = loadShaderFromDOM(vshader);
  fragmentShader = loadShaderFromDOM(fshader);
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

  shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");    
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);
    
  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s); 
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
  setupSphereBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */

/** @global Flags for key inputs */
var aFlag = false;
var rFlag = false;

function draw () { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    glMatrix.mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, .1, 100);

    // We want to look down -z, so create a lookat point in that direction    
    glMatrix.vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    glMatrix.mat4.lookAt(mvMatrix,eyePt,viewPt,up); 
    
    uploadLightsToShader([lightx,lighty,lightz],[alight,alight,alight],[dlight,dlight,dlight],[slight,slight,slight]);

    // Add a ball on 'a'
    if (curKeys['a'] && !aFlag) aFlag = true;
    if (!curKeys['a'] && aFlag) {
      BallsNumber += 5;
      AddBalls(5);
      console.log("5 Balls added");
      aFlag = false;
    }
    // Reset Balls on 'r'
    if (curKeys['r'] && !rFlag) rFlag = true;
    if (!curKeys['r'] && rFlag) {
      BallsNumber = 0;
      Balls = [];
      console.log("Reset complete");
      rFlag = false;
    }
    // Draw each ball per iteration
    for (i = 0; i < BallsNumber; i++) {
      // Get colors and upload them to the shader
      R = Balls[i].Color[0];
      G = Balls[i].Color[1];
      B = Balls[i].Color[2];
      shiny = Balls[i].Color[3];
      uploadMaterialToShader([R,G,B],[R,G,B],[1.0,1.0,1.0],shiny);
      // Get positions and upload them to the shader
      x = Balls[i].Position[0];
      y = Balls[i].Position[1];
      z = Balls[i].Position[2];
      // Backup the original mvMatrix
      mvMatrix_default = glMatrix.mat4.clone(mvMatrix);
      glMatrix.vec3.set(translateVec,x,y,z);
      glMatrix.mat4.translate(mvMatrix,mvMatrix,translateVec);

      setMatrixUniforms();
      drawSphere();
      // Restore the original mvMatrix after drawing is finished
      mvMatrix = glMatrix.mat4.clone(mvMatrix_default);
      // Update the ball positions and velocities
      Balls[i].update();
    }
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function setPhongShader() {
    setupShaders("shader-phong-phong-vs","shader-phong-phong-fs");
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function setGouraudShader() {
    setupShaders("shader-gouraud-phong-vs","shader-gouraud-phong-fs");
}


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById('responsive-canvas');
  canvas.height = canvas.width;
  // Initial Balls Number
  BallsNumber = 5;
  AddBalls(BallsNumber);
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(100.0);
  gl.enable(gl.DEPTH_TEST);
  setupShaders("shader-gouraud-phong-vs","shader-gouraud-phong-fs");
  setupBuffers();
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
  requestAnimationFrame(tick);
  draw ();
}

/**
 * Function to detect the key pressed, log information about the pressed key, prevent
 * default actions if the key is 'ArrowUp' or 'ArrowDown' (in default, it scrolls the page 
 * up and down) and set the key in hashmap curKeys true
 * @param {KeyboardEvent} event Contains information about the key pressed
 */
function handleKeyDown(event) {
  // console.log("Key down:", event.key, " Code:", event.code);
  if (event.key == "ArrowDown" || event.key == "ArrowUp")
    event.preventDefault();
  curKeys[event.key] = true;
}

/**
 * Function to detect the key released, log information about the released key
 * and set the key in hasmap curKeys false
 * @param {KeyboardEvent} event Contains information about the key pressed 
 */
function handleKeyUp(event) {
  // console.log("Key up:", event.key, " Code:", event.code);
  curKeys[event.key] = false;
}