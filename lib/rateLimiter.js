// Simple queue-based rate limiter to prevent DoS against Supabase or backend

class RateLimiter {
  constructor(maxRequests, perMilliseconds) {
    this.maxRequests = maxRequests;
    this.perMilliseconds = perMilliseconds;
    this.timestamps = [];
    this.queue = [];
    this.isProcessing = false;
  }

  async acquire(signal) {
    if (signal?.aborted) {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    }

    return new Promise((resolve, reject) => {
      const queueItem = { resolve, reject, signal };
      
      if (signal) {
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          const index = this.queue.indexOf(queueItem);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.queue.push(queueItem);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      if (item.signal?.aborted) {
        this.queue.shift();
        continue;
      }

      const now = Date.now();
      
      // Clean up old timestamps outside the window
      this.timestamps = this.timestamps.filter(t => now - t < this.perMilliseconds);

      if (this.timestamps.length < this.maxRequests) {
        // We have capacity
        this.timestamps.push(now);
        this.queue.shift();
        item.resolve();
      } else {
        // No capacity, wait until the oldest request falls out of the window
        const oldest = this.timestamps[0];
        const waitTime = this.perMilliseconds - (now - oldest);
        await new Promise(r => setTimeout(r, Math.max(waitTime, 10)));
      }
    }

    this.isProcessing = false;
  }
}

// Allow up to 30 requests per second (adjust as needed for Supabase free tier / custom backend limits)
export const globalRateLimiter = new RateLimiter(30, 1000);

export async function rateLimitedFetch(input, init) {
  if (init?.signal?.aborted) {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  }
  await globalRateLimiter.acquire(init?.signal);
  if (init?.signal?.aborted) {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  }
  return fetch(input, init);
}
