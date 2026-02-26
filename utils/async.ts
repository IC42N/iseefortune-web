/**
 * Race a promise against a timeout.
 *
 * Useful for RPC calls or any async operation that should not hang forever.
 *
 * @param promise - The promise to race
 * @param ms - Timeout in milliseconds (default: 12s)
 * @param message - Optional timeout error message
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 12_000,
  message = "RPC timeout"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}