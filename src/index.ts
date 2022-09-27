import minion, { commonYargs } from "@magda/minion-sdk";
import onRecordFound from "./onRecordFound";
const ID = "minion-visualization";
const argv = commonYargs(6311, "http://localhost:6311");

const aspectDefinition = {
    id: "visualization-info",
    name: "Information to power smart visualisations for distributions in the front-end",
    jsonSchema: require("@magda/registry-aspects/visualization-info.schema.json")
};

minion({
    argv,
    aspects: ["dcat-distribution-strings"],
    async: true,
    id: ID,
    onRecordFound,
    optionalAspects: [],
    writeAspectDefs: [aspectDefinition],
    dereference: false
}).catch((e: Error) => {
    console.error("Error: " + e.message, e);
    process.exit(1);
});
