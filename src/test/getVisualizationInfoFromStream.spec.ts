import {} from "mocha";
import { expect } from "chai";
import { getVisualizationInfoFromStream } from "../onRecordFound";
import fs from "fs";
import path from "path";

describe("Test getVisualizationInfoFromStream", () => {
    it("Should process sample csv file correctly", async () => {
        const csvStream = fs.createReadStream(
            path.resolve(__dirname, "./test.csv")
        );
        const result = await getVisualizationInfoFromStream(csvStream);
        expect(result.format).to.equal("CSV");
        expect(result.wellFormed).to.equal(true);
        expect(result.timeseries).to.equal(true);
        expect(result.fields).to.deep.equal({
            australian_appl_no: { numeric: true, time: false },
            status_type: { numeric: false, time: false },
            opposition_decision_type: { numeric: false, time: false },
            application_filed_date: { numeric: false, time: true },
            application_published_date: { numeric: false, time: true },
            opposition_decision_date: { numeric: false, time: true },
            opposition_filed_date: { numeric: false, time: true },
            published_date: { numeric: false, time: true },
            restoration_date: { numeric: false, time: true }
        });
    });
});
