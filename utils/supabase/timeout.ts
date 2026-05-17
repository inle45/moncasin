export class RequestTimeoutError extends Error {
  constructor(ms: number) {
    super(`Délai dépassé (${ms}ms)`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * Coupe une promesse qui ne répond pas (évite les chargements infinis en local).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Requête"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RequestTimeoutError(ms));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
