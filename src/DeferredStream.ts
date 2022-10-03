import { Transform, TransformCallback, TransformOptions } from "stream";
import bufferChunks from "./bufferChunks";

export interface DeferredStreamOptions extends TransformOptions {
    byteChunkSize?: number;
}

// by default, process byte data in 100 bytes chunk
const DEFAULT_BYTE_CHUNK_SIZE = 100;

interface TransformWorkItem {
    buffer?: Buffer;
    object?: any;
    callback?: TransformCallback;
}

const deferred = () =>
    new Promise<void>((resolve, reject) => setImmediate(() => resolve()));

class DeferredStream extends Transform {
    private queue: TransformWorkItem[] = [];
    private backpressure: Boolean = false;
    public readonly byteChunkSize: number;

    constructor(options: DeferredStreamOptions = {}) {
        const { byteChunkSize, ...streamOpts } = options;
        super(streamOpts);
        this.byteChunkSize = byteChunkSize
            ? byteChunkSize
            : DEFAULT_BYTE_CHUNK_SIZE;
    }

    _transform(
        chunk: any,
        encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
        if (this.readableObjectMode) {
            this.queue.push({
                object: chunk,
                callback
            });
        } else {
            const buffer =
                typeof chunk === "string"
                    ? Buffer.from(chunk, encoding)
                    : Buffer.from(chunk);

            const chunks = bufferChunks(buffer, this.byteChunkSize);
            const lastChunk = chunks.pop();
            const workItems: TransformWorkItem[] = chunks.map((c) => ({
                buffer: c
            }));
            workItems.push({
                buffer: lastChunk,
                callback
            });
            this.queue.push(...workItems);
        }
        this._doTransform().catch((e) => this.emit("error", e));
    }

    _read(size: number): void {
        if(this.queue.length) {
            this.backpressure = false;
            this._doTransform().catch((e) => this.emit("error", e));
        } else {
            super._read(size);
        }
    }

    async _doTransform() {
        if (!this.queue.length) {
            return;
        }
        while (!this.backpressure) {
            const workItem = this.queue.pop();
            if (!workItem) {
                // queue is empty
                return;
            }
            // send to the pipe and record backpressure result
            const result = this.push(
                workItem?.buffer ? workItem.buffer : workItem.object
            );
            // if push didn't explicitly return a boolean, we will consider as "no backpressure"
            this.backpressure = result === false ? true : false;
            if (workItem?.callback) {
                // when workItem.callback exist, that must be the last chunk of incoming chunk
                // call `callback` to notify the completion of incoming chunk
                workItem.callback();
            }
            // defer next chunk process to next event loop to avoid blocking main thread
            await deferred();
        }
    }
}

export default DeferredStream;
