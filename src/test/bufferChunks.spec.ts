import {} from "mocha";
import bufferChunks from "../bufferChunks";
import path from "path";
import nock from "nock";
import { fetch } from "../onRecordFound";
import { expect } from "chai";

describe("Test bufferChunks", () => {
    beforeEach(() => {
        nock("http://example.com")
            .get("/html/404")
            .replyWithFile(
                404,
                path.resolve(__dirname, "./test-dummy-file.html"),
                {
                    "Content-Type": "text/html; charset=UTF-8"
                }
            )
            .persist(true);
        nock.disableNetConnect();
        nock.enableNetConnect("127.0.0.1");
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    it("Should process HTML response correctly", async () => {
        //return;
        const res = await fetch("http://example.com/html/404");
        expect(res.status).to.equal(404);
        const buffer = Buffer.from(await res.text());
        const chunks = bufferChunks(buffer, 100);
        let totalChunkSize = 0;
        let chunkedStr = "";
        for (const chunk of chunks) {
            totalChunkSize += chunk.length;
            chunkedStr += chunk.toString();
        }
        expect(totalChunkSize).to.equal(buffer.length);
        expect(chunkedStr).to.equal(buffer.toString());
    });
});
