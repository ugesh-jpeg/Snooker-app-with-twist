// Global Variable Declarations

let Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events;

let engine, world;
let tableWidth, tableHeight, ballDiameter, pocketDiameter;
let balls = [];
let redBalls = [];
let coloredBalls = []; 
let cueBall;
let pockets = [];
let cueAim;
let tableBounds = [];
let power = 0;
let maxPower = 8;
let isCueAiming = false;
let cue;
let cueDistance = 10; 
let isDraggingCueBall = false; 
let lastPottedColor = null;
let arePowerUpsActive = false;
let powerUpRespawnInterval; 
let isMenuVisible = true;
let isGameStarted = false;

// Initialization and Setup

function setup() {
  createCanvas(1200, 600);

  // Initialize Matter.js engine and world
  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;

  // Table dimensions (dynamically set based on canvas size)
  tableWidth = width;
  tableHeight = height;

  // Ball and pocket sizes
  ballDiameter = tableWidth / 36;
  pocketDiameter = ballDiameter * 1.5;

  // Create table bounds
  createTableBounds();

  // Create pockets
  createPockets();

  // Adds an event listener for keyboard inputs to handle special actions like resetting positions.
  document.addEventListener("keydown", handleKeystrokes);

  // Initialise cue aim
  cueAim = new CueAim();

  // Initialise cue
  cue = new Cue(); 

  // Set up collision detection
  setupCollisionDetection();
}

function createTableBounds() {
  if (tableBounds.length > 0) {
    tableBounds.forEach(boundary => World.remove(world, boundary));
  }
  tableBounds = []; // Clear the array

  let thickness = 20;
  let offset = 80;
  let options = { isStatic: true, restitution: 0.6 };

  let top = Bodies.rectangle(tableWidth / 2, offset / 2, tableWidth - offset, thickness, options);
  let bottom = Bodies.rectangle(tableWidth / 2, tableHeight - offset / 2, tableWidth - offset, thickness, options);
  let left = Bodies.rectangle(offset / 2, tableHeight / 2, thickness, tableHeight - offset, options);
  let right = Bodies.rectangle(tableWidth - offset / 2, tableHeight / 2, thickness, tableHeight - offset, options);

  tableBounds = [top, bottom, left, right];
  World.add(world, tableBounds);
}

function createPockets() {
  let pocketPositions = [
    { x: 50, y: 50 }, // Top-left
    { x: tableWidth - 50, y: 50 }, // Top-right
    { x: tableWidth / 2, y: 50 }, // Top-center
    { x: 50, y: tableHeight - 50 }, // Bottom-left
    { x: tableWidth - 50, y: tableHeight - 50 }, // Bottom-right
    { x: tableWidth / 2, y: tableHeight - 50 } // Bottom-center
  ];

  pocketPositions.forEach(pos => {
    let pocket = new Pocket(pos.x, pos.y, pocketDiameter);
    pockets.push(pocket);
  });
}

// Entity Management

function createBalls() {
  redBalls = []; // Reset the global redBalls array
  coloredBalls = []; // Reset the global coloredBalls array

  let x = tableWidth / 1.5;
  let y = tableHeight / 2; 

  // Create red balls in a rotated triangular formation
  let rows = 5; 
  let offset = ballDiameter;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      let offsetX = i * offset;  
      let offsetY = j * offset - (i * offset) / 2;
      let redBall = new Ball(x + offsetX, y + offsetY, ballDiameter, "red");
      redBalls.push(redBall);
      balls.push(redBall);
    }
  }

  // Add the cue ball
  cueBall = new Ball(tableWidth / 2 - 350, tableHeight / 2, ballDiameter, "white");
  cueBall.body.isCueBall = true;
  balls.push(cueBall);

  let coloredBallPositions = [
    { color: "yellow", x: tableWidth / 4, y: tableHeight / 4 },
    { color: "green", x: tableWidth / 4, y: (3 * tableHeight) / 4 },
    { color: "brown", x: tableWidth / 2 - 100, y: tableHeight / 2 },
    { color: "blue", x: tableWidth / 2, y: tableHeight / 2 },
    { color: "pink", x: (3 * tableWidth) / 4, y: tableHeight / 2 - 100 },
    { color: "black", x: (3 * tableWidth) / 4, y: tableHeight / 4 }
  ];

  for (let pos of coloredBallPositions) {
    let coloredBall = new Ball(pos.x, pos.y, ballDiameter, pos.color);
    coloredBalls.push(coloredBall); 
    balls.push(coloredBall); 
  }
}

// Event Handlers

function handleKeystrokes(event) {
  switch (event.key) {
    case "1":
      setupStartingPositions();
      isMenuVisible = false; // Hide the menu
      isGameStarted = true;  // Game has started
      break;
    case "2":
      randomizePositions(true); // random red
      isMenuVisible = false;
      isGameStarted = true;
      break;
    case "3":
      randomizePositions(false); // random all
      isMenuVisible = false; 
      isGameStarted = true;  
      break;
      }
}

// Drawing Functions

function drawMenuScreen() {
  fill(0, 200);
  rect(0, 0, width, height);

  // Draw decorative cue sticks
  strokeWeight(8);
  stroke(139, 69, 19); // Brown for the cue stick
  line(50, 50, 200, 200); // Top-left cue
  line(width - 50, height - 50, width - 200, height - 200); // Bottom-right cue

  // Title text
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(48);
  text("Snooker Game Menu", width / 2, height / 6);

  // Main intsruction
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(28);
  text("Use the a and d key to respectively decrease / increase power", width / 2, height / 6 + 50);
  text("To aim and shoot, press and hold onto the cue ball \n aim to your desired power and release ", width / 2, height / 6 + 110);

  // Draw snooker ball options
  const options = [
    { label: "Press 1: Setup Starting Positions", yOffset: height / 2 - 20, color: "red" },
    { label: "Press 2: Randomize Red Ball Positions", yOffset: height / 2 + 25, color: "yellow" },
    { label: "Press 3: Randomize All Ball Positions", yOffset: height / 2 + 70, color: "green" },
    { label: "Press 8: Toggle Menu On/Off", yOffset: height / 2 + 115, color: "blue" },
    { label: "Press 9: Toggle Power Up On/Off \n 1) Activate one of the balls: \n Exploding, Speedy, Slowpoke", yOffset: height / 2 , color: "pink" },
    { label: "Press 0: Toggle Drag and Drop On/Off \n 1) Hover the mouse over the cue ball \n 2) Press 0, pick up the cue ball \n 3) Click on where you want it \n place it and carry on", yOffset: height / 2 + 130, color: "black" }
  ];

  options.forEach((option, index) => {
    let xBase, xBall, xText;
    if (index < 4) {
      xBase = width / 4; 
    } else {
      xBase = 3 * width / 4;
    }
    xBall = xBase - 220; 
    xText = xBase + 20;

    const y = option.yOffset;
    const radius = 20;
    const gradient = drawingContext.createRadialGradient(
      xBall - radius / 4,
      y - radius / 4,
      radius / 8,
      xBall,
      y,
      radius
    );
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.4, option.color);
    gradient.addColorStop(1, "black");

    // Apply gradient and draw the ball
    drawingContext.fillStyle = gradient;
    noStroke();
    ellipse(xBall, y, radius * 2);

    // Draw the corresponding text
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text(option.label, xText, y);
  });

  // Footer text
  fill(255);
  textSize(20);
  textStyle(NORMAL);
  text("Press either 1, 2, or 3 to start the game", width / 2, height - 70);
}

function drawGameScreen() {
  drawTable();
  Engine.update(engine);

  // Draw table overlay, pockets, cue ball, and other elements
  drawTableOverlay();
  drawPockets();
  if (cueBall) cueBall.show();
  balls.forEach((ball) => ball.show());
  if (isCueAiming) {
    cueAim.update(mouseX, mouseY);
    cueAim.show();
    cue.show(cueDistance);
  }
  stroke(255);
  textSize(16);
  let powerUpState;
  if (arePowerUpsActive) {
    powerUpState = "Active";
  } else {
    powerUpState = "Inactive";
  }
  text("Power-Ups: " + powerUpState, 880, height - 15);
  drawPowerMeter();
}

function drawTable() {
  // Draw the outer wooden frame
  for (let i = 0; i < 50; i++) {
    let colorIntensity = map(i, 0, 50, 139, 101);
    fill(colorIntensity, 69, 19);
    noStroke();
    rect(i, i, tableWidth - i * 2, tableHeight - i * 2);
  }

  // Draw the inner green felt playing area
  fill(50, 205, 50);
  noStroke();
  rect(50, 50, tableWidth - 100, tableHeight - 100);

  // Draw the inner green felt playing area
  stroke(255, 255, 0);
  rect(50, 50, tableWidth - 100, tableHeight - 100);

  // Draw cushion rails
  let cushionThickness = 20; // Thickness of cushion rails
  fill(1, 50, 32);

  // Top cushion
  rect(40, 30, tableWidth - 100, cushionThickness);
  // Bottom cushion
  rect(40, tableHeight - 40 - cushionThickness, tableWidth - 100, cushionThickness);
  // Left cushion
  rect(30, 60, cushionThickness, tableHeight - 100);
  // Right cushion
  rect(tableWidth - 30 - cushionThickness, 50, cushionThickness, tableHeight - 100);
}

function drawTableOverlay() {
  // Draw "D" zone
  noFill();
  stroke(255);
  strokeWeight(2);
  arc(tableWidth - (600 + (tableWidth - 100) / 4), tableHeight / 2 , (2*tableHeight) / 4, (2*tableHeight) / 4, PI / 2, -PI / 2);

  // Draw other table markings (e.g., baulk line, spots, etc.)
  line(50 + (tableWidth - 100) / 4, 50, 50 + (tableWidth - 100) / 4, tableHeight - 60);
}

function drawPockets() {
  fill(255, 255, 0); // Set the fill to yellow for the squares
  noStroke();
  const squareSize = pocketDiameter + 20; // Define the size of the square around the pocket

  // Define individual offsets for each pocket's square
  const offsets = [
    { xOffset: -15, yOffset: -15 },  // Top-left
    { xOffset: +15, yOffset: -15 }, // Top-right
    { xOffset: 0, yOffset: - 35 },   // Top-center
    { xOffset: - 15, yOffset: + 15 }, // Bottom-left
    { xOffset: + 15, yOffset: + 15 },// Bottom-right
    { xOffset: 0, yOffset: + 25 }   // Bottom-center
  ];

  // Draw yellow squares behind each pocket with individual offsets
  for (let i = 0; i < pockets.length; i++) {
    let pocket = pockets[i];
    let offset = offsets[i];

    // Draw each square with its unique offset
    rect(pocket.x - squareSize / 2 + offset.xOffset, pocket.y - squareSize / 2 + offset.yOffset, squareSize, squareSize,5,5);
  }

  fill(0); 
  stroke(255); 
  for (let pocket of pockets) {
    ellipse(pocket.x, pocket.y, pocketDiameter, pocketDiameter);
  }
}

function drawPowerMeter() {
  fill(255, 0, 0);
  noStroke();
  let barWidth = 200;
  let barHeight = 20;
  let powerWidth = map(power, 0, maxPower, 0, barWidth);
  rect(width - barWidth - 5, height - barHeight - 5, powerWidth, barHeight);
  stroke(255);
  noFill();
  rect(width - barWidth - 5 , height - barHeight - 5, barWidth, barHeight);
}

// Utility Functions

function setupStartingPositions() {
  // Clear existing balls and arrays
  clearBalls();
  redBalls = [];
  coloredBalls = [];
  balls = [];

  let x = tableWidth / 1.5; 
  let y = tableHeight / 2;
  let rows = 5;
  let offset = ballDiameter;

  // Create red balls
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      let offsetX = i * offset;
      let offsetY = j * offset - (i * offset) / 2;
      let redBall = new Ball(x + offsetX, y + offsetY, ballDiameter, "red");
      redBalls.push(redBall);
      balls.push(redBall);
    }
  }

  // Create colored balls
  let coloredBallPositions = [
    { color: "yellow", x: tableWidth / 2 - 275 , y: tableHeight / 4 },
    { color: "green", x: tableWidth / 2 - 275, y: (3 * tableHeight) / 4 },
    { color: "brown", x: tableWidth / 2 - 275, y: tableHeight / 2 },
    { color: "blue", x: tableWidth / 2, y: tableHeight / 2 },
    { color: "pink", x: tableWidth / 2 + 165, y: tableHeight / 2 },
    { color: "black", x: tableWidth - 150 , y: tableHeight / 2 }
  ];

  for (let pos of coloredBallPositions) {
    let coloredBall = new Ball(pos.x, pos.y, ballDiameter, pos.color);
    coloredBalls.push(coloredBall);
    balls.push(coloredBall);
  }
}

function randomizePositions(redsOnly) {
  // Clear existing balls and arrays
  clearBalls();
  redBalls = [];
  coloredBalls = [];
  balls = [];

  let numRedBalls = 15;
  let padding = ballDiameter / 2;

  // Randomize red balls
  for (let i = 0; i < numRedBalls; i++) {
    let posX = random(50 + padding, tableWidth - 50 - padding);
    let posY = random(50 + padding, tableHeight - 50 - padding);
    let redBall = new Ball(posX, posY, ballDiameter, "red");
    redBalls.push(redBall);
    balls.push(redBall);
  }

  if (!redsOnly) {
    // Randomize colored balls
    let coloredBallColors = ["yellow", "green", "brown", "blue", "pink", "black"];
    for (let color of coloredBallColors) {
      let posX = random(50 + padding, tableWidth - 50 - padding);
      let posY = random(50 + padding, tableHeight - 50 - padding);
      let coloredBall = new Ball(posX, posY, ballDiameter, color);
      coloredBalls.push(coloredBall);
      balls.push(coloredBall);
    }
  } else {
    // Keep colored balls in their default positions
    let coloredBallPositions = [
      { color: "yellow", x: tableWidth / 2 - 275 , y: tableHeight / 4 },
    { color: "green", x: tableWidth / 2 - 275, y: (3 * tableHeight) / 4 },
    { color: "brown", x: tableWidth / 2 - 275, y: tableHeight / 2 },
    { color: "blue", x: tableWidth / 2, y: tableHeight / 2 },
    { color: "pink", x: tableWidth / 2 + 165, y: tableHeight / 2 },
    { color: "black", x: tableWidth - 150 , y: tableHeight / 2 }
    ];

    for (let pos of coloredBallPositions) {
      let coloredBall = new Ball(pos.x, pos.y, ballDiameter, pos.color);
      coloredBalls.push(coloredBall);
      balls.push(coloredBall);
    }
  }
}

function clearBalls() {
  balls.forEach(ball => World.remove(world, ball.body));
  balls = [];
  redBalls = [];
  coloredBalls = [];
  cueBall = null; // Reset cue ball
}

// Game Loop

function draw() {

  // Draw table and pockets
  drawTable();

  // Run the physics engine
  Engine.update(engine);

  // Draw table overlay (for lines, baulk line, etc.)
  drawTableOverlay();

  // Draw pockets
  drawPockets();

  // Draw cueBall
  if (cueBall) { 
    cueBall.show();
  }

  // Draw all the balls
  balls.forEach(ball => ball.show());

  // Handle cue aiming and power
  if (isCueAiming) {
    cueAim.update(mouseX, mouseY); // Updated reference
    cueAim.show(); // Updated reference
    cue.show(cueDistance);
  }

// Draw Power up state
stroke(255);
textSize(16);

let powerUpState;
if (arePowerUpsActive) {
  powerUpState = "Active";
} else {
  powerUpState = "Inactive";
}

text("Power-Ups: " + powerUpState, 880, height - 15);

  // Menu screen
  if (isMenuVisible) {
    drawMenuScreen();
  } else {
    drawGameScreen();
  }

  // Draw the power meter
  drawPowerMeter();
}

// Collision and Physics

function setupCollisionDetection() {
  Events.on(engine, "collisionStart", (event) => {
    let pairs = event.pairs;

    for (let pair of pairs) {
      let bodyA = pair.bodyA;
      let bodyB = pair.bodyB;

      // Only handle collisions involving the cue ball
      if (bodyA.isCueBall || bodyB.isCueBall) {
        let otherBody;
        let color = "unknown"; // Default color if the ball doesn't have a color

        // Determine which body is the cue ball
        if (bodyA.isCueBall) {
          otherBody = bodyB;
        } else {
          otherBody = bodyA;
        }

        // Identify the color of the ball the cue ball collided with
        if (otherBody.label === "Circle Body" && otherBody.customProperties && otherBody.customProperties.color) {
          color = otherBody.customProperties.color;
        }

        // Check for collision with red balls
        if (redBalls.some(b => b.body === otherBody)) {
          console.log("Cue ball collided with a red ball.");
        }
        // Check for collision with colored balls
        else if (coloredBalls.some(b => b.body === otherBody)) {
          console.log("Cue ball collided with a " + color + " ball.");
        }
        // Check for collision with cushions (table boundaries)
        else if (tableBounds.some(boundary => boundary === otherBody)) {
          console.log("Cue ball collided with a cushion.");
        }
      }

      // Check if either body is a power-up ball
      let powerUpBody = null;

      if (bodyA.label === "Circle Body" && bodyA.customProperties && bodyA.customProperties.powerUpType) {
        powerUpBody = bodyA;
      } else if (bodyB.label === "Circle Body" && bodyB.customProperties && bodyB.customProperties.powerUpType) {
        powerUpBody = bodyB;
      }

      if (powerUpBody && arePowerUpsActive) { // Only process if power-ups are active
        let otherBody;

        if (powerUpBody === bodyA) {
          otherBody = bodyB;
        } else {
          otherBody = bodyA;
        }

        if (otherBody.label === "Circle Body") {
          let powerUpType = powerUpBody.customProperties.powerUpType;
          console.log("Power-up ball of type \"" + powerUpType + "\" was activated by collision.");
          handlePowerUp(powerUpBody, powerUpType);
        }
      }

      // Check if a ball enters a pocket
      for (let pocket of pockets) {
        if (isBallInPocket(bodyA, pocket) || isBallInPocket(bodyB, pocket)) {
          handlePocketing(bodyA);
          handlePocketing(bodyB);
        }
      }
    }
  });
}


function isBallInPocket(ball, pocket) {
  if (ball.label === "Circle Body") {
    let dx = ball.position.x - pocket.x;
    let dy = ball.position.y - pocket.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance < pocket.d / 2;
  }
  return false;
}

function handlePocketing(ball) {
  if (ball.label === "Circle Body") {
    let ballColor = "unknown";

    // Check if customProperties exists and if it has the color property
    if (ball.customProperties && ball.customProperties.color) {
      ballColor = ball.customProperties.color;
    }

    if (!ball.isCueBall) {
      if (redBalls.some(b => b.body === ball)) {
        console.log("A red ball was potted.");
        redBalls = redBalls.filter(b => b.body !== ball); // Remove from redBalls array
        balls = balls.filter(b => b.body !== ball); // Remove from main balls array
        World.remove(world, ball);
      } else if (coloredBalls.some(b => b.body === ball)) {
        // Handle colored balls: re-spot them
        console.log("A " + ballColor + " ball was potted.");
        if (lastPottedColor === ballColor) {
          console.log("Error: Consecutive pocketing of the " + ballColor + " ball is not allowed.");
        }
        lastPottedColor = ballColor;

        let respotPositions = {
          "yellow": { x: tableWidth / 4, y: tableHeight / 4 },
          "green": { x: tableWidth / 4, y: (3 * tableHeight) / 4 },
          "brown": { x: tableWidth / 2 - 100, y: tableHeight / 2 },
          "blue": { x: tableWidth / 2, y: tableHeight / 2 },
          "pink": { x: (3 * tableWidth) / 4, y: tableHeight / 2 - 100 },
          "black": { x: (3 * tableWidth) / 4, y: tableHeight / 4 }
        };

        let ballObj = coloredBalls.find(b => b.body === ball);
        if (ballObj) {
          let respotPosition = respotPositions[ballObj.color];
          if (respotPosition) {
            Body.setPosition(ballObj.body, respotPosition); // Move the ball to its re-spot position
            Body.setVelocity(ballObj.body, { x: 0, y: 0 }); // Stop its motion
            World.add(world, ballObj.body);
          } else {
            console.error("Re-spot position for " + ballObj.color + " ball not defined.");
          }
        }
      } else {
        console.error("Ball not identified in redBalls or coloredBalls arrays.");
      }
    } else {
      // Handle cue ball pocketing
      console.log("The cue ball was potted.");
      Body.setPosition(cueBall.body, { x: tableWidth / 4, y: tableHeight / 2 });
      Body.setVelocity(cueBall.body, { x: 0, y: 0 });
    }
  }
}

function applyCueBallForce() {
  let forceX = power * cos(cueAim.angle) / 100;
  let forceY = power * sin(cueAim.angle) / 100;

  Body.applyForce(cueBall.body, cueBall.body.position, { x: -forceX, y: -forceY });
  power = 0;
  resetCueBallIfNeeded();
}

// Power-ups and Mechanics

function assignPowerUpToRedBalls() {
  const powerUps = ["slowMotion", "explosion", "fastMotion"];
  const chosenBalls = [];

  while (chosenBalls.length < 3 && redBalls.length > 0) {
      const randomIndex = Math.floor(Math.random() * redBalls.length);
      const selectedBall = redBalls[randomIndex];

      if (!chosenBalls.includes(selectedBall)) {
          selectedBall.powerUpType = powerUps[chosenBalls.length];
          selectedBall.body.customProperties.powerUpType = powerUps[chosenBalls.length];
          chosenBalls.push(selectedBall);
          console.log(`Assigned power-up "${selectedBall.powerUpType}" to a red ball.`);
      }
  }
}

function handlePowerUp(ball, powerUpType) {
  switch (powerUpType) {
    case "slowMotion":
      console.log("Slowpoke Rodriguez power-up activated!");
      balls.forEach((b) => {
        if (b !== ball) {
          Body.setVelocity(b.body, {
            x: b.body.velocity.x * 0.5,
            y: b.body.velocity.y * 0.5,
          });
        }
      });

      // Reset velocities back to normal after 5 seconds
      setTimeout(() => {
        balls.forEach((b) => {
          if (b !== ball) {
            Body.setVelocity(b.body, {
              x: b.body.velocity.x * 2,
              y: b.body.velocity.y * 2,
            });
          }
        });
        console.log("Slowpoke Rodriguez power-up effect ended.");
      }, 5000);

      break;

      case "explosion":
        console.log("Explosion power-up activated!");
      
        balls.forEach((b) => {
          if (b !== ball) { // Exclude the power-up ball itself
            Body.setVelocity(b.body, {
              x: b.body.velocity.x * 5,
              y: b.body.velocity.y * 5,
            });
          }
        });
        World.remove(world, ball); // Remove the exploding ball
        break;

    case "fastMotion":
      console.log("Speedy Gonzalez power-up activated!");
      balls.forEach((b) => {
        if (b !== ball) {
          Body.setVelocity(b.body, {
            x: b.body.velocity.x * 2,
            y: b.body.velocity.y * 2,
          });
        }
      });

      // Reset velocities back to normal after 5 seconds
      setTimeout(() => {
        balls.forEach((b) => {
          if (b !== ball) {
            Body.setVelocity(b.body, {
              x: b.body.velocity.x / 2,
              y: b.body.velocity.y / 2,
            });
          }
        });
        console.log("Speedy Gonzalez power-up activated.");
      }, 5000);

      break;

    default:
      console.log("Unknown power-up type:", powerUpType);
  }

  // Remove the power-up ball from the game
  balls = balls.filter((b) => b.body !== ball);
  redBalls = redBalls.filter((b) => b.body !== ball);
  World.remove(world, ball);
}

function respawnPowerUpBalls() {
  const powerUps = ["slowMotion", "explosion", "fastMotion"];
  const chosenBalls = [];

  // Filter out and retain only balls that are active
  redBalls = redBalls.filter((ball) => {
    if (ball.powerUpType && !world.bodies.includes(ball.body)) {
      // Ball has been removed; it needs to be respawned
      ball.powerUpType = null; // Reset power-up type for re-assignment
      return true; 
    }
    return true;
  });

  // Respawn power-up balls if they were removed
  while (chosenBalls.length < 3 && redBalls.length > 0) {
    const randomIndex = Math.floor(Math.random() * redBalls.length);
    const selectedBall = redBalls[randomIndex];

    if (!chosenBalls.includes(selectedBall) && !selectedBall.powerUpType) {
      selectedBall.powerUpType = powerUps[chosenBalls.length];
      selectedBall.body.customProperties.powerUpType = powerUps[chosenBalls.length];
      chosenBalls.push(selectedBall);

      if (!world.bodies.includes(selectedBall.body)) {
        World.add(world, selectedBall.body);
      }
    }
  }
}

function startPowerUpRespawn() {
  if (!powerUpRespawnInterval) {
      powerUpRespawnInterval = setInterval(() => {
          if (arePowerUpsActive) {
              console.log("Respawning power-up balls... Respawned");
              respawnPowerUpBalls();
          }
      }, 10000);
  }
}

function stopPowerUpRespawn() {
  if (powerUpRespawnInterval) {
      clearInterval(powerUpRespawnInterval);
      powerUpRespawnInterval = null;

      // Remove power-ups from all red balls
      redBalls.forEach((ball) => {
          if (ball.powerUpType) {
              console.log(`Deactivating power-up "${ball.powerUpType}" from a red ball.`);
              ball.powerUpType = null;
              ball.body.customProperties.powerUpType = null;
          }
      });
  }
}

function deactivatePowerUps() {
  redBalls.forEach(ball => {
      if (ball.powerUpType) {
          console.log(`Removing power-up "${ball.powerUpType}" from a red ball.`);
          ball.powerUpType = null;
      }
  });
}

// Input Interaction Handlers

function mousePressed() {
  if (!isGameStarted) {
    console.log("You cannot place the cue ball yet. Press 1, 2, or 3 to start the game.");
    return;
  }
  if (!cueBall) {
    // Define the exact arc (D zone)
    let dCenterX = tableWidth - (600 + (tableWidth - 100) / 4);
    let dCenterY = tableHeight / 2; 
    let dRadius = (2 * tableHeight) / 4 / 2; 

    // Check if the click is within the semi-circle (D zone)
    if (
      dist(mouseX, mouseY, dCenterX, dCenterY) <= dRadius && 
      mouseX <= dCenterX
    ) {
      // Create the cue ball within the D zone
      cueBall = new Ball(mouseX, mouseY, ballDiameter, "white");
      cueBall.body.isCueBall = true;
      balls.push(cueBall);
      World.add(world, cueBall.body);
    } else {
      console.log("Invalid placement: You must place the cue ball inside the D zone!");
    }
  } else {
    // Handle aiming logic if cue ball already exists
    if (dist(mouseX, mouseY, cueBall.body.position.x, cueBall.body.position.y) < ballDiameter) {
      isCueAiming = true;
      power = 0; // Reset power
    }
  }
}

function mouseReleased() {
  if (isDraggingCueBall) {
    console.log("Stopping drag of cue ball.");
    Matter.Body.setStatic(cueBall.body, false);
    isDraggingCueBall = false;
  } else if (isCueAiming && cueBall) {
    console.log("Applying force to shoot cue ball.");
    let forceX = power * Math.cos(cue.angle)/ 300;
    let forceY = power * Math.sin(cue.angle)/ 300;
    
    Matter.Body.applyForce(cueBall.body, cueBall.body.position, { x: -forceX, y: -forceY });
    
    isCueAiming = false;
    cueDistance = 10;
    power = 0;
  }
}

function mouseDragged() {
  // Check if the cue ball is being dragged
  if (isDraggingCueBall) {
    // Move the cue ball with the mouse
    Matter.Body.setPosition(cueBall.body, { x: mouseX, y: mouseY });
  } else if (isCueAiming) {
    // Update aiming direction for both the cueAim and cue stick
    cueAim.update(mouseX, mouseY);
    cue.update(mouseX, mouseY);
  }
}

function keyPressed() {
if (key === '8') {
  isMenuVisible = !isMenuVisible; // Toggle menu visibility
}

if (key === '9') {
  arePowerUpsActive = !arePowerUpsActive;
  if (arePowerUpsActive) {
    console.log("Power-ups are now Active");
  } else {
    console.log("Power-ups are now Inactive");
  }
  if (arePowerUpsActive) {
    assignPowerUpToRedBalls();
    startPowerUpRespawn();
  } else {
    deactivatePowerUps();
    stopPowerUpRespawn();
  }
}

if (key === '0') {
  // Check distance from mouse to cue ball for toggle dragging
  if (cueBall && cueBall.body) { 
    let distance = dist(mouseX, mouseY, cueBall.body.position.x, cueBall.body.position.y);
    if (distance < ballDiameter / 2) {
      isDraggingCueBall = !isDraggingCueBall;
      Matter.Body.setStatic(cueBall.body, !isDraggingCueBall);
      console.log("Dragging toggle for cue ball:", isDraggingCueBall);
    } else {
      console.log("Cue ball not able to drag and drop. Mouse too far from cue ball.");
    }
  } else {
    console.log("Cue ball not detected. Place the cueball on table first");
  }
}

if (isCueAiming) {
  if (key === "A" || key === "a") {
    power = max(0, power - 1); // Decrease power
    if (cueDistance > 20) {
      cueDistance -= 10; // Move cue closer
    }
    console.log("Power decreased: ", power, "Cue Distance: ", cueDistance);
  } else if (key === "D" || key === "d") {
    power = min(maxPower, power + 1); // Increase power
    if (cueDistance < 20 + maxPower * 10) {
      cueDistance += 10; // Move cue farther
    }
    console.log("Power increased: ", power, "Cue Distance: ", cueDistance);
  }
}
}

// Classes and Constructors

class Cue {
  constructor() {
    this.angle = 0;
    this.length = 400; 
    this.width = 6; 
    this.tipWidth = 4;
    this.tipColor = [255, 255, 255];
    this.power = 0; // Power controlled by keyboard
    this.maxPower = 20;
  }

  // Updates the angle of the cue based on mouse or keyboard input
  update(mouseX, mouseY) {
    let dx = mouseX - cueBall.body.position.x;
    let dy = mouseY - cueBall.body.position.y;
    this.angle = atan2(dy, dx);
  }

  adjustAngle(direction) {
    let angleChange = radians(5);
    if (direction === "increase") {
      this.angle -= angleChange;
    } else if (direction === "decrease") {
      this.angle += angleChange;
    }
  }

  show(distance) {
    drawingContext.save();

    // Start of cue stick
    let startX = cueBall.body.position.x + distance * cos(this.angle);
    let startY = cueBall.body.position.y + distance * sin(this.angle);

    // End of cue stick
    let endX = startX + this.length * cos(this.angle);
    let endY = startY + this.length * sin(this.angle);

    // Shaft of stick with rainbow
    let gradient = drawingContext.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.1, "red");
    gradient.addColorStop(0.16, "orange");
    gradient.addColorStop(0.33, "yellow");
    gradient.addColorStop(0.5, "green");
    gradient.addColorStop(0.66, "blue");
    gradient.addColorStop(0.83, "indigo");
    gradient.addColorStop(1, "black");

    drawingContext.strokeStyle = gradient;
    strokeWeight(this.width);
    line(startX, startY, endX, endY);

    drawingContext.restore();
  }
}

// Ball class
class Ball {
  constructor(x, y, d, color, powerUpType = null) {
    this.body = Bodies.circle(x, y, d / 2, {
        restitution: 0.9,
        friction: 0.05,
        frictionAir: 0.01,
    });
    this.body.label = "Circle Body";
    this.body.customProperties = { color, powerUpType };
    this.color = color;
    this.radius = d / 2;
    this.powerUpType = powerUpType;
    World.add(world, this.body);
  }

  show() {
    if (this.powerUpType && !arePowerUpsActive) {
        return; // Skip rendering if power-ups are inactive
    }

    let pos = this.body.position;

    // White outline for power-up balls
    if (this.powerUpType) {
        stroke(255);
        strokeWeight(4);
    } else {
        noStroke();
    }

    let gradient = drawingContext.createRadialGradient(
        pos.x - this.radius / 4, pos.y - this.radius / 4, this.radius / 8,
        pos.x, pos.y, this.radius
    );

    gradient.addColorStop(0, "white");
    gradient.addColorStop(0.4, this.color);
    gradient.addColorStop(1, "black");

    drawingContext.fillStyle = gradient;
    ellipse(pos.x, pos.y, this.radius * 2);
  }
}

class Pocket {
  constructor(x, y, d) {
    this.x = x;
    this.y = y;
    this.d = d;
  }

  show() {
    fill(0);
    noStroke();
    ellipse(this.x, this.y, this.d);
  }
}

class CueAim {
  constructor() {
    this.angle = 0;
    this.length = 150;
  }

  update(mouseX, mouseY) {
    let dx = mouseX - cueBall.body.position.x;
    let dy = mouseY - cueBall.body.position.y;
    this.angle = atan2(dy, dx);
  }

  show() {
    let x1 = cueBall.body.position.x;
    let y1 = cueBall.body.position.y;
    let x2 = x1 - this.length * cos(this.angle);
    let y2 = y1 - this.length * sin(this.angle);

    stroke(255);
    strokeWeight(4);
    line(x1, y1, x2, y2);
  }
}

//--------
// Report
//--------
/* 
The app is designed to be a dynamic snooker game where players can interact with the game through various mechanics like cue aiming, power control, and ball physics.
The game leverages the Matter.js physics engine for real-time collision detection and ball movement, allowing for a more immersive and realistic snooker experience.
The table, balls, and pockets are all rendered with specific dimensions, and there is a well-defined user interface (UI) for managing the game.

Key Features:

Ball Setup and Management: 
The game creates a variety of balls, including red and colored balls. The cue ball is also present, and players interact with it using a cue stick.
Balls are randomly placed on the table when required.

Power-ups: 
The extension of the game includes power-ups like "Exploding Balls," "Speedy," and "Slowpoke" where their effect lasts for 5 seconds.
These power-ups are assigned randomly to red balls. When a player collides with one of these balls, it activates the power-up:

Slowpoke Rodriguez reduces the speed of all balls.
Speedy Gonzalez doubles the speed of balls.
Explosion increases the velocity of balls.

Respawn Feature: 
The power-up balls have a respawn feature, where they regenerate every 10 seconds. If a power-up ball is removed from the game (due to collision or other interactions), 
it will respawn as a random last few red balls remaining on the table.

Cue Mechanism: 
The cue stick allows the player to aim at the cue ball and control its velocity by adjusting the power. 
Players can increase or decrease the power by pressing specific keys ("A" or "D"), and the cue distance adjusts accordingly. There’s also an option to toggle the
dragging of the cue ball for repositioning.

Game Interaction: 
Users interact with the game by dragging and dropping the cue ball, adjusting power, and activating power-ups. 
The game's visual and interactive elements are designed to provide clear feedback on the state of power-ups, the position of the cue ball, and other dynamic elements.

Unique Extension (Power-up Feature): 
The addition of the power-up system introduces a unique layer of strategy and excitement to the game. 
Players not only focus on precision but also on exploiting power-ups for an advantage. These power-ups significantly impact the flow of the game, 
adding an element of unpredictability. Additionally, the respawn feature ensures that power-ups remain a dynamic part of the gameplay, requiring the player
to continuously adapt their strategy. This makes the game more engaging, as players can plan around the power-up balls’ effects and their respawn cycles.

In summary, this app not only functions as a traditional snooker game but also incorporates innovative elements such as power-ups and 
respawn mechanics that enhance gameplay and create unique, unpredictable challenges for players. 
*/