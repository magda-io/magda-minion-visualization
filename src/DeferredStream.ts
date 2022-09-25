import { Transform, TransformOptions } from "stream";

class DeferredStream extends Transform {
    constructor(options: TransformOptions = {}) {
        super({
            ...options,
            transform(chunk, encoding, callback) {
                setTimeout(() => {
                    callback(null, chunk);
                }, 100);
            }
        });
    }
}

export default DeferredStream;
