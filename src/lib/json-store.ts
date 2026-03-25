import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class JsonStore<T extends object> {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filename: string, private readonly defaults: T) {}

  private get filepath(): string {
    return path.join(process.cwd(), "data", this.filename);
  }

  async read(): Promise<T> {
    try {
      const content = await readFile(this.filepath, "utf8");
      return {
        ...this.defaults,
        ...JSON.parse(content)
      } as T;
    } catch {
      return this.defaults;
    }
  }

  async write(value: T): Promise<void> {
    await mkdir(path.dirname(this.filepath), { recursive: true });
    await writeFile(this.filepath, JSON.stringify(value, null, 2), "utf8");
  }

  async update(mutator: (value: T) => T | Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      const current = await this.read();
      const next = await mutator(current);
      await this.write(next);
      return next;
    });

    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
}
