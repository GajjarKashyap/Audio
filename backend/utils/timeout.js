function withTimeout(task, timeoutMs, fallbackValue) {
  return Promise.race([
    task,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    })
  ]);
}

module.exports = {
  withTimeout
};
