export abstract class Agent<T, R> {
  abstract execute(input: T): Promise<R>;
}
