class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  cp() {
    return new Vector(this.x, this.y);
  }

  mul(factor) {
    this.x *= factor;
    this.y *= factor;
    return this;
  }

  normalize() {
    const l = this.length();
    this.x /= l;
    this.y /= l;
    return this;
  }

  length() {
    const length = Math.sqrt(this.x * this.x + this.y * this.y);
    if (length < 0.005 && length > -0.005) {
      return 0.000001;
    }
    return length;
  }

  distance(vec) {
    const deltaX = this.x - vec.x;
    const deltaY = this.y - vec.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  distanceSquared(vec) {
    var deltaX = this.x - vec.x;
    var deltaY = this.y - vec.y;
    return deltaX * deltaX + deltaY * deltaY;
  }
}

class PackedCircle {
  constructor(id, radius, x = 0, y = 0) {
    this.id = id;

    this.targetPosition = new Vector(0, 0);
    this.position = new Vector(x, y);
    this.previousPosition = new Vector(x, y);

    this.setRadius(radius);
  }

  setPosition(aPosition) {
    this.previousPosition = this.position;
    this.position = aPosition.cp();
  }

  distanceSquaredFromTargetPosition() {
    const distanceSquared = this.position.distanceSquared(this.targetPosition);
    // if it's shorter than either radi, we intersect
    return distanceSquared < this.radiusSquared;
  }

  setRadius(aRadius) {
    this.radius = aRadius;
    this.radiusSquared = aRadius * aRadius;
    this.originalRadius = aRadius;
  }

  get delta() {
    return new Vector(
      this.position.x - this.previousPosition.x,
      this.position.y - this.previousPosition.y
    );
  }
}

class PackedCircleManager {
  constructor() {
    this.allCircles = [];
    this.desiredTarget = new Vector(0, 0);
    this.bounds = { left: 0, top: 0, right: 0, bottom: 0 };
    this.damping = 0.025;
    this.numberOfCenteringPasses = 1;
    this.numberOfCollisionPasses = 2;
  }

  setBounds(aBoundaryObject) {
    if (typeof aBoundaryObject.left === "number") {
      this.bounds.left = aBoundaryObject.left;
    }
    if (typeof aBoundaryObject.top === "number") {
      this.bounds.top = aBoundaryObject.top;
    }
    if (typeof aBoundaryObject.width === "number") {
      this.bounds.right = this.bounds.left + aBoundaryObject.width;
    }
    if (typeof aBoundaryObject.height === "number") {
      this.bounds.bottom = this.bounds.top + aBoundaryObject.height;
    }
    this.setTarget(
      new Vector(aBoundaryObject.width / 2, aBoundaryObject.height / 3)
    );
  }

  addCircle(aCircle) {
    this.allCircles.push(aCircle);
    aCircle.targetPosition = this.desiredTarget.cp();
  }

  removeCircle(circleToRemoveId) {
    const indicesToRemove = this.allCircles.reduce((indices, circle, index) => {
      if (circle.id === circleToRemoveId) {
        indices.push(index);
      }
      return indices;
    }, []);

    for (let n = indicesToRemove.length - 1; n >= 0; n--) {
      this.allCircles.splice(indicesToRemove[n], 1);
    }
  }

  updatePositions() {
    var circleList = this.allCircles;
    var circleCount = circleList.length;

    // store information about the previous position
    for (let i = 0; i < circleCount; ++i) {
      const circle = circleList[i];

      circle.previousPosition = circle.position.cp();
    }

    if (this.desiredTarget) {
      // Push all the circles to the target - in my case the center of the bounds
      this.pushAllCirclesTowardTarget(this.desiredTarget);
    }

    // Make the circles collide and adjust positions to move away from each other
    this.handleCollisions();

    // store information about the previous position
    for (let i = 0; i < circleCount; ++i) {
      const circle = circleList[i];

      this.handleBoundaryForCircle(circle);
    }
  }

  pushAllCirclesTowardTarget(aTarget) {
    var v = new Vector(0, 0);

    var circleList = this.allCircles;
    var circleCount = circleList.length;

    var len = circleList.length;

    for (var n = 0; n < this.numberOfCenteringPasses; n++) {
      var damping = 0.04;
      for (let i = 0; i < len; i++) {
        var c = circleList[i];

        v.x = c.position.x - aTarget.x;
        v.y = c.position.y - aTarget.y;
        v.mul(damping);

        c.position.x -= v.x;
        c.position.y -= v.y;
      }
    }
  }

  handleCollisions() {
    var v = new Vector(0, 0);

    var dragCircle = null;
    var circleList = this.allCircles;
    var circleCount = circleList.length;

    // Collide circles

    for (var n = 0; n < this.numberOfCollisionPasses; n++) {
      for (var i = 0; i < circleCount; i++) {
        var ci = circleList[i];

        for (var j = i + 1; j < circleCount; j++) {
          var cj = circleList[j];
          if (ci == cj) continue; // It's us!

          var dx = cj.position.x - ci.position.x;
          var dy = cj.position.y - ci.position.y;
          var r = (ci.radius + cj.radius) * 1.08; // The distance between the two circles radii, but we're also gonna pad it a tiny bit

          //					console.log(ci.position.distanceSquared(new Vector(10, 10)));
          var d = ci.position.distanceSquared(cj.position);

          if (d < r * r - 0.02) {
            v.x = dx;
            v.y = dy;
            v.normalize();

            var inverseForce = (r - Math.sqrt(d)) * 0.5;
            v.mul(inverseForce);

            if (cj != dragCircle) {
              if (ci == dragCircle) v.mul(2.2); // Double inverse force to make up for the fact that the other object is fixed

              cj.position.x += v.x;
              cj.position.y += v.y;
            }

            if (ci != dragCircle) {
              if (cj == dragCircle) v.mul(2.2); // Double inverse force to make up for the fact that the other object is fixed

              ci.position.x -= v.x;
              ci.position.y -= v.y;
            }
          }
        }
      }
    }
  }

  handleBoundaryForCircle(aCircle) {
    const x = aCircle.position.x;
    const y = aCircle.position.y;
    const radius = aCircle.radius;

    let overEdge = false;

    if (x + radius >= this.bounds.right) {
      aCircle.position.x = this.bounds.right - radius;
      overEdge = true;
    } else if (x - radius < this.bounds.left) {
      aCircle.position.x = this.bounds.left + radius;
      overEdge = true;
    }

    if (y + radius > this.bounds.bottom) {
      aCircle.position.y = this.bounds.bottom - radius;
      overEdge = true;
    } else if (y - radius < this.bounds.top) {
      aCircle.position.y = this.bounds.top + radius;
      overEdge = true;
    }
  }

  setTarget(aPosition) {
    this.desiredTarget = aPosition;
  }
}

const ITERATIONS_PER_UPDATE = 8;
const REST_THRESHOLD = 4;

const packer = new PackedCircleManager();

let prevPositions = {};

function updatePositions() {
  for (let i = 0; i < ITERATIONS_PER_UPDATE; i++) {
    packer.updatePositions();
  }

  const updatedPositions = packer.allCircles.map((circle) => ({
    id: circle.id,
    x: circle.position.x,
    y: circle.position.y,
  }));

  self.postMessage({
    type: "update",
    payload: updatedPositions,
  });

  // determine if we should continue running the simulation
  let diffAmt = 0;
  for (const newPosition of updatedPositions) {
    const prevPosition = prevPositions[newPosition.id];
    if (prevPosition == null) {
      diffAmt += 999;
    } else {
      diffAmt += Math.sqrt(
        Math.pow(newPosition.x - prevPosition.x, 2) +
          Math.pow(newPosition.y - prevPosition.y, 2)
      );
    }
  }
  // if the total distance traveled by all circles is greater than
  // a given threshold
  if (diffAmt > REST_THRESHOLD) {
    requestTick();
  }

  // store the previous positions
  prevPositions = updatedPositions.reduce(
    (acc, cur) => ({ ...acc, [cur.id]: cur }),
    {}
  );
}

let ticking = false;
function requestTick() {
  if (!ticking) {
    ticking = true;
    setTimeout(() => {
      ticking = false;
      updatePositions();
    }, ITERATIONS_PER_UPDATE * 16);
  }
}

function handleMessage(e) {
  const { type, payload } = e.data;
  switch (type) {
    case "setDimensions": {
      const { width, height } = payload;
      packer.setBounds({ left: 0, top: 0, width, height });
      requestTick();
      break;
    }
    case "addNode": {
      const { id, radius, x, y } = payload;
      packer.addCircle(new PackedCircle(id, radius, x, y));
      requestTick();
      break;
    }
    default: {
      console.warn(`Unknown message type recieved from main thread: ${type}`);
    }
  }
}

self.addEventListener("message", handleMessage);
