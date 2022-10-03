import {} from "mocha";
import DeferredStream from "../DeferredStream";
import path from "path";
import nock from "nock";
import fs from "fs";
import { fetch } from "../onRecordFound";
import { expect } from "chai";
import { streamToBuffer } from "@jorgeferrero/stream-to-buffer";

describe("Test DeferredStream", () => {
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
        const res = await fetch("http://example.com/html/404");
        expect(res.status).to.equal(404);
        const deferredResStream = res.body.pipe(new DeferredStream());
        const buffer = await streamToBuffer(deferredResStream);

        const res2 = await fetch("http://example.com/html/404");
        const res2Text = await res2.text();
        expect(res2Text.length).to.equal(buffer.length);
        expect(res2Text).to.equal(buffer.toString());
    });

    it("Should process CSV file stream correctly", async () => {
        const deferredCsvStream = fs
            .createReadStream(path.resolve(__dirname, "./test.csv"))
            .pipe(new DeferredStream());
        const buffer = await streamToBuffer(deferredCsvStream);

        const fileContent = fs.readFileSync(
            path.resolve(__dirname, "./test.csv"),
            { encoding: "utf-8" }
        );

        expect(fileContent.length).to.equal(buffer.length);
        expect(fileContent).to.equal(buffer.toString());
    });
});
