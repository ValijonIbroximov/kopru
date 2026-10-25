/** Serial writes preserve SRS order; failed writes remain available for an explicit retry. */
export function createReviewQueue() {
  let tail: Promise<void> = Promise.resolve();
  const failed: Array<() => Promise<void>> = [];
  function add(write: () => Promise<void>) {
    tail = tail.then(async () => { if (failed.length) { failed.push(write); return; } try { await write(); } catch { failed.push(write); } });
  }
  return {
    add,
    async flush(retry = false) {
      await tail;
      if (retry) { const jobs = failed.splice(0); jobs.forEach(add); await tail; }
      return failed.length;
    },
  };
}
