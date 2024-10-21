export function sleep<T>(ms: number, value: T) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

export async function withDelay<T>(
  delay: number,
  promise: T | Promise<T>,
): Promise<T> {
  // Ensure we throw if this throws
  const ret = await promise;
  return sleep(delay, ret);
}
