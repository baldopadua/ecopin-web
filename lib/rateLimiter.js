// Simple queue-based rate limiter to prevent DoS against Supabase or backend

class RateLimiter {
  constructor(maxRequests, perMilliseconds) {
    this.maxRequests = maxRequests;
    this.perMilliseconds = perMilliseconds;
    this.timestamps = [];
    this.queue = [];
    this.isProcessing = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      
      // Clean up old timestamps outside the window
      this.timestamps = this.timestamps.filter(t => now - t < this.perMilliseconds);

      if (this.timestamps.length < this.maxRequests) {
        // We have capacity
        this.timestamps.push(now);
        const resolve = this.queue.shift();
        resolve();
      } else {
        // No capacity, wait until the oldest request falls out of the window
        const oldest = this.timestamps[0];
        const waitTime = this.perMilliseconds - (now - oldest);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    this.isProcessing = false;
  }
}

// Allow up to 30 requests per second (adjust as needed for Supabase free tier / custom backend limits)
export const globalRateLimiter = new RateLimiter(30, 1000);

export async function rateLimitedFetch(input, init) {
  await globalRateLimiter.acquire();
  // Using the native global fetch provided by the environment (browser or Node)
  return fetch(input, init);
}
