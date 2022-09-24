import {} from "mocha";
import { expect } from "chai";
import { getVisualizationInfo } from "../onRecordFound";
import path from "path";
import nock from "nock";

describe("Test getVisualizationInfo", () => {
    beforeEach(() => {
        nock("http://example.com")
            .get("/html/404")
            .replyWithFile(
                404,
                path.resolve(__dirname, "./test-dummy-file.html"),
                {
                    "Content-Type": "text/html; charset=UTF-8"
                }
            );
        nock.disableNetConnect();
        nock.enableNetConnect("127.0.0.1");
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    it("Should process correctly for html response with 404 status", async () => {
        const result = await getVisualizationInfo(
            "http://example.com/html/404"
        ).catch((e) => e);
        expect(result).to.be.an.instanceof(Error);
    });
});
