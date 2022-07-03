import "./nav.css";

import CirclePacker from "./circlePacker";

function updateCircleButtonPosition(node, x, y) {
  node.style.setProperty("--x", `${x}px`);
  node.style.setProperty("--y", `${y}px`);
}

const prevCircles = new Map();
function handleCirclePackerUpdate(newCirclePositions) {
  for (const newCirclePosition of newCirclePositions) {
    const { id, node, x, y } = newCirclePosition;

    if (prevCircles.has(id)) {
      const { x: prevX, y: prevY } = prevCircles.get(id);
      const fromX = prevX - x;
      const fromY = prevY - y;

      const effect = new KeyframeEffect(
        node,
        [
          { transform: `translate(${fromX}px, ${fromY}px)` },
          { transform: "translate(0px, 0px)" },
        ],
        {
          duration: 256,
          easing: "cubic-bezier(0.5, 0, 0.5, 1)",
          fill: "none",
          composite: "add",
        }
      );

      const animation = new Animation(effect, document.timeline);
      animation.ready.then(() => {
        updateCircleButtonPosition(node, x, y);
      });
      animation.play();
    } else {
      updateCircleButtonPosition(node, x, y);
      node.classList.add("entered");
    }

    prevCircles.set(id, { x, y });
  }
}

let __packer = null;
function getCirclePacker() {
  if (__packer === null) {
    __packer = new CirclePacker(handleCirclePackerUpdate);
  }
  return __packer;
}

function initializeCircleButton(listItemElem, delay) {
  setTimeout(() => {
    const circlePacker = getCirclePacker();
    circlePacker.addNode(listItemElem, 30);
  }, delay);
}

function handleContainerSizeChange(entries) {
  if (entries.length !== 1) {
    console.warn(
      `Container resizeobserver recieved unexpected number of entries: ${entries.length}`
    );
    return;
  }

  const { borderBoxSize } = entries[0];
  const { inlineSize, blockSize } = borderBoxSize[0];
  const packer = getCirclePacker();
  packer.setDimensions(inlineSize, blockSize);
}

function setupContainerSizeListening() {
  const observer = new ResizeObserver(handleContainerSizeChange);
  const container = document.getElementById("circle-button-nav");
  observer.observe(container);
}

function main() {
  setupContainerSizeListening();

  const navItemElements = document.querySelectorAll(".nav-circle-button");
  navItemElements.forEach((navItemElem, idx) => {
    initializeCircleButton(navItemElem, 175 * (idx + 1));
  });
}

main();
