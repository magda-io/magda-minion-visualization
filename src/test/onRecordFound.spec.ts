import {} from "mocha";
import onRecordFound from "../onRecordFound";
import path from "path";
import nock from "nock";

describe("Test onRecordFound", () => {
    let putRecordAspectCallHistory = [] as {
        recordId: string;
        aspectId: string;
        aspect: any;
        merge?: boolean;
        tenantId?: number;
    }[];

    const registryApi: any = {
        putRecordAspect: (
            recordId: string,
            aspectId: string,
            aspect: any,
            merge?: boolean,
            tenantId?: number
        ) => {
            putRecordAspectCallHistory.push({
                recordId,
                aspectId,
                aspect,
                merge,
                tenantId
            });
        }
    };

    beforeEach(() => {
        putRecordAspectCallHistory = [];
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

    it("Should process correctly (resolved without timeout & throwing error) for html response with 404 status", async () => {
        await onRecordFound(
            {
                id: "xxxx",
                name: "sssx",
                aspects: {
                    "dcat-distribution-strings": {
                        downloadURL: "http://example.com/html/404",
                        format: "csv"
                    }
                }
            } as any,
            registryApi
        ).catch((e) => e);
    });
});
