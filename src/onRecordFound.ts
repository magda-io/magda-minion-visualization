import { parse, CastingFunction } from "csv-parse";
import URI from "urijs";
import moment from "moment";
import NullStream from "./NullStream";
import isDate from "lodash/isDate";
import {
    AuthorizedRegistryClient as Registry,
    Record
} from "@magda/minion-sdk";
import type { RequestInfo, RequestInit, Response } from "node-fetch";
import _importDynamic from "./_importDynamic";
import fse from "fs-extra";
import path from "path";
import AbortController from "abort-controller";
import DeferredStream from "./DeferredStream";

class SkipError extends Error {}

const pkgPromise = fse.readJSON(path.resolve(__dirname, "../package.json"), {
    encoding: "utf-8"
});

export async function fetch(url: RequestInfo, init?: RequestInit) {
    const { default: fetch } = await _importDynamic<
        typeof import("node-fetch")
    >("node-fetch");
    return fetch(url, init);
}

const MAX_CHECK_ROW_NUM = 50;
// in seconds
const CONNECTION_TIMEOUT = 120;

/**
 * A error that will be thrown once we reach a conclusion.
 * Used to interrupt the stream processing.
 *
 * @class VisualizationInfoDeterminedError
 * @extends {Error}
 */
class VisualizationInfoDeterminedError extends Error {
    public result: VisualizationInfo | undefined;

    constructor(result: VisualizationInfo | undefined) {
        super();
        this.result = result;
    }
}

const timeFormats = [
    moment.ISO_8601,
    "D-M-YYYY",
    "D/M/YYYY",
    "D/M/YY",
    "D-M-YY",
    "YYYY-[Q]Q"
];

const fieldCastFunc: CastingFunction = (value, context) => {
    if (context.header) {
        // not touch header row
        return value;
    }
    let v: any = moment(value, timeFormats, true);
    if (v.isValid()) {
        return v.toDate();
    }
    v = parseFloat(value);
    if (typeof v === "number" && isFinite(v)) {
        return v;
    }
    return value;
};

export async function getVisualizationInfo(
    downloadURL: string
): Promise<VisualizationInfo | undefined> {
    const pkg = await pkgPromise;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, CONNECTION_TIMEOUT * 1000);

    let res: Response;
    try {
        res = await fetch(downloadURL, {
            redirect: "follow",
            headers: {
                "User-Agent": `${pkg.name}/${pkg.version}`
            },
            signal: controller.signal
        });
    } catch (e) {
        throw e;
    } finally {
        clearTimeout(timeout);
    }
    return getVisualizationInfoFromStream(res.body, () => {
        controller.abort();
    });
}

export async function getVisualizationInfoFromStream(
    csvStream: NodeJS.ReadableStream,
    onAbort?: () => void
): Promise<VisualizationInfo | undefined> {
    const fields: { [key: string]: any[] } = {};

    const parser = parse({
        delimiter: ",",
        columns: true,
        bom: true,
        skip_empty_lines: true,
        skip_records_with_empty_values: true,
        relax_column_count: true,
        trim: true,
        cast: fieldCastFunc,
        on_record: (record, context) => {
            const keys = Object.keys(record);
            for (let key of keys) {
                if (!fields[key]) {
                    fields[key] = [];
                }
                fields[key].push(record[key]);
            }
            if (context.records >= MAX_CHECK_ROW_NUM) {
                if (typeof onAbort === "function") {
                    onAbort();
                }
                throw new VisualizationInfoDeterminedError(
                    determineVisualizationInfo()
                );
            }
        }
    });

    function determineVisualizationInfo() {
        const keys = Object.keys(fields);
        const fieldInfo = {} as any;
        for (const key of keys) {
            fieldInfo[key] = {
                numeric: false,
                time: false
            };
            if (fields[key].every((item) => isDate(item))) {
                fieldInfo[key]["time"] = true;
            } else if (fields[key].every((item) => typeof item === "number")) {
                fieldInfo[key]["numeric"] = true;
            }
        }
        const timeseries =
            keys.some((key) => fieldInfo[key].time) &&
            keys.some((key) => fieldInfo[key].numeric);

        return {
            format: "CSV",
            wellFormed: true,
            fields: fieldInfo,
            // At least one time and one numeric column
            timeseries
        };
    }

    return new Promise((resolve, reject) => {
        let ifResolved = false;

        csvStream
            .pipe(new DeferredStream())
            .pipe(parser)
            .pipe(new DeferredStream({
                readableObjectMode: true,
                writableObjectMode: true
            }))
            .pipe(new NullStream({ objectMode: true }))
            .on("close", () => {
                if (!ifResolved) {
                    ifResolved = true;
                    resolve(determineVisualizationInfo());
                }
            });

        parser.on("error", (err) => {
            if (ifResolved) {
                console.error(
                    "determineVisualizationInfo promise resolve unexpectedly early: ",
                    err
                );
                return;
            }
            ifResolved = true;
            if (err instanceof VisualizationInfoDeterminedError) {
                resolve(err.result);
            } else {
                reject(err);
            }
        });
    });
}

export default function onRecordFound(
    record: Record,
    registry: Registry
): Promise<void> {
    const theTenantId = record.tenantId;

    const { downloadURL, format } = record.aspects["dcat-distribution-strings"];
    if (downloadURL && /csv/i.test(format)) {
        const parsedURL = new URI(downloadURL);
        if (
            parsedURL.protocol() === "http" ||
            parsedURL.protocol() === "https"
        ) {
            console.log(
                `Processing visualizationInfo for record ${record.id}, URL: ${downloadURL}...`
            );
            return getVisualizationInfo(downloadURL)
                .then(
                    async (
                        visualizationInfo: VisualizationInfo | undefined
                    ) => {
                        if (!visualizationInfo) {
                            throw new Error(
                                `Couldn't determine VisualizationInfo: No visualizationInfo data has been produced.`
                            );
                        }
                        return visualizationInfo;
                    }
                )
                .catch((err) => {
                    console.log(
                        `Failed to generate visualizationInfo for record ${
                            record.id
                        }, URL: ${downloadURL}.\nReason: ${
                            err.errorDetails || err.httpStatusCode || err
                        }`
                    );
                    throw new SkipError();
                })
                .then(async (visualizationInfo: VisualizationInfo) => {
                    await registry.putRecordAspect(
                        record.id,
                        "visualization-info",
                        visualizationInfo,
                        true,
                        theTenantId
                    );
                })
                .catch((err) => {
                    if (err instanceof SkipError) {
                        return;
                    }
                    throw err;
                });
        } else {
            console.log(`Unsupported URL: ${downloadURL}`);
        }
    }
    return undefined;
}

interface VisualizationInfo {
    format: string;
    wellFormed?: boolean;
    fields?: { [key: string]: Field };
    timeseries?: boolean;
}

interface Field {
    numeric?: boolean;
    time?: boolean;
}
