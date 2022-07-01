import { CIRCLE_SPACING } from "./config";
import randRange from "./randRange";

const DEFAULT_NODE_SIZE = CIRCLE_SPACING / 2 + 30;

export default class CirclePacker {
  #updateHandler;
  #nodes;
  #idCounter;

  #width;
  #height;

  #worker;

  constructor(onUpdate) {
    this.#updateHandler = onUpdate;
    this.#nodes = {};
    this.#idCounter = 0;

    this.#width = 0;
    this.#height = 0;

    this.#worker = new Worker(
      new URL("./circlePacker.worker.js", import.meta.url),
      { type: "module" }
    );
    this.#worker.addEventListener(
      "message",
      this.#handleWorkerMessage.bind(this)
    );
  }

  #handleWorkerMessage(e) {
    const { type, payload } = e.data;
    switch (type) {
      case "update": {
        const processedPayload = payload.map((circle) => ({
          ...circle,
          node: this.#nodes[circle.id],
        }));
        this.#updateHandler(processedPayload);
        break;
      }
      default: {
        console.warn(`Unknown message type recieved from worker: ${type}`);
      }
    }
  }

  addNode(node, size) {
    const nodeId = this.#idCounter++;
    this.#nodes[nodeId] = node;

    const resolvedRadius = CIRCLE_SPACING / 2 + size;

    const initialX = this.#width / 2 + randRange(-5, 5);
    const initalY = this.#height / 2 + randRange(-5, 5);

    this.#worker.postMessage({
      type: "addNode",
      payload: {
        id: nodeId,
        radius: resolvedRadius,
        x: initialX,
        y: initalY,
      },
    });
  }

  update(iterations = 1) {
    this.#worker.postMessage({
      type: "update",
      payload: { iterations },
    });
  }

  setDimensions(width, height) {
    this.#width = width;
    this.#height = height;
    this.#worker.postMessage({
      type: "setDimensions",
      payload: { width, height },
    });
  }
}
