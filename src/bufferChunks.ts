function bufferChunks(buffer: Buffer, size: number): Buffer[] {
    let total = buffer.length;
    if (!size || !total) {
        return [buffer];
    }
    const chunks: Buffer[] = [];
    let offset = 0;
    while (total > 0) {
        const length = Math.min(size, total);
        const chunk = Buffer.from(
            buffer.buffer,
            buffer.byteOffset + offset,
            length
        );
        chunks.push(chunk);
        offset += length;
        total -= length;
    }
    return chunks;
}

export default bufferChunks;
