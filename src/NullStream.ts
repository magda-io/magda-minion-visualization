import { Writable, WritableOptions } from "stream";

class NullStream extends Writable {
    constructor(options: WritableOptions = {}) {
        super({
            ...options,
            write: (chunk, encoding, cb) => {
                setImmediate(cb);
                return true;
            }
        });
    }
}

export default NullStream;
