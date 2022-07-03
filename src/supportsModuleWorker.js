export default function supportsModuleWorker() {
  let supports = false;
  const tester = {
    get type() {
      supports = true;
    },
  };
  try {
    const worker = new Worker("blob://", tester);
  } finally {
    return supports;
  }
}
