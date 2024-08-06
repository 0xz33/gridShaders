const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec2 u_delayedMouse;
  
  float smoothGrid(vec2 st, float width, float feather) {
    vec2 grid = fract(st);
    vec2 smoothGrid = smoothstep(0.0, feather, grid) * (1.0 - smoothstep(width - feather, width, grid));
    return smoothGrid.x + smoothGrid.y;
  }
  
  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    vec2 mouse = u_mouse / u_resolution;
    vec2 delayedMouse = u_delayedMouse / u_resolution;
    
    // Make grid cells uniform size
    vec2 scaledSt = st * 20.0;
    
    float distToMouse = distance(st, delayedMouse);
    
    // Only show grid lines near the mouse
    float visibility = smoothstep(0.3, 0.0, distToMouse);
    
    // Make the effect more pronounced near the mouse
    float lineWidth = mix(0.02, 0.1, smoothstep(0.2, 0.0, distToMouse));
    float lineFeather = mix(0.002, 0.05, smoothstep(0.2, 0.0, distToMouse));
    
    // Smoother grid lines that blur near the mouse
    float gridLine = smoothGrid(scaledSt, lineWidth, lineFeather) * visibility;
    
    // Black grid color
    vec3 gridColor = vec3(0.0);
    gl_FragColor = vec4(mix(vec3(1.0), gridColor, gridLine), 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function initShaders(canvas) {
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL not supported");

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const resolutionUniformLocation = gl.getUniformLocation(
    program,
    "u_resolution"
  );
  const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
  const delayedMouseUniformLocation = gl.getUniformLocation(
    program,
    "u_delayedMouse"
  );

  let currentMousePos = { x: 0, y: 0 };
  let delayedMousePos = { x: 0, y: 0 };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  canvas.addEventListener("mousemove", (event) => {
    currentMousePos.x = event.clientX;
    currentMousePos.y = canvas.height - event.clientY;
  });

  function updateDelayedMouse() {
    const lerp = (start, end, t) => start * (1 - t) + end * t;
    const lerpFactor = 0.1; // Adjust this value to change the delay (0.1 = 10% movement per frame)

    delayedMousePos.x = lerp(delayedMousePos.x, currentMousePos.x, lerpFactor);
    delayedMousePos.y = lerp(delayedMousePos.y, currentMousePos.y, lerpFactor);

    gl.uniform2f(mouseUniformLocation, currentMousePos.x, currentMousePos.y);
    gl.uniform2f(
      delayedMouseUniformLocation,
      delayedMousePos.x,
      delayedMousePos.y
    );
  }

  function render() {
    updateDelayedMouse();
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  render();
}
