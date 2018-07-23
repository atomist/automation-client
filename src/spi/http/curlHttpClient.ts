import * as _ from "lodash";
import * as os from "os";
import { logger } from "../..";
import { doWithRetry } from "../../util/retry";
import {
    spawnAndWatch,
    SuccessIsReturn0ErrorFinder,
    WritableLog,
} from "../../util/spawned";
import {
    DefaultHttpClientOptions,
    HttpClient,
    HttpClientFactory,
    HttpClientOptions,
    HttpResponse,
} from "./httpClient";

/**
 * Curl based HttpClient implementation.
 */
export class CurlHttpClient implements HttpClient {

    public exchange<T>(url: string,
                       options: HttpClientOptions = {}): Promise<HttpResponse<T>> {

        const optionsToUse: HttpClientOptions = {
            ...DefaultHttpClientOptions,
            ...options,
        };

        // Prepare headers
        const headers = [];
        _.forEach(optionsToUse.headers, (v, k) => {
            headers.push(`${k}: ${v}`);
        });

        // Prepare the provided raw curl options
        const rawOptions = [];
        _.forEach(optionsToUse.options, (v, k) => {
            if (k.length === 1) {
                rawOptions.push([ `-${k}`, v ]);
            } else {
                rawOptions.push([ `--${k}`, v ]);
            }
        });

        const request = () => {

            let log = "";
            const passthroughLog: WritableLog = {
                write(str: string) {
                    logger.debug(str);
                    log += str;
                },
            };

            return spawnAndWatch({
                    command: "curl",
                    args: [
                        "-X", optionsToUse.method,
                        url,
                        "-s",
                        "--write-out",
                        "HTTPSTATUS:%{http_code}",
                        ..._.flatten(headers.map(h => ([ "-H", h ]))),
                        ..._.flatten(rawOptions),
                        ...(options.body ? [ "-d", JSON.stringify(options.body) ] : []),
                    ],
                },
                {},
                passthroughLog,
                {
                    logCommand: false,
                    errorFinder: SuccessIsReturn0ErrorFinder,
                })
                .then(result => {
                    const parts = log.split("HTTPSTATUS:");
                    let body = parts[ 0 ];

                    try {
                        body = JSON.parse(body);
                    } catch (err) {
                        // ignore
                    }

                    return {
                        status: +parts[ 1 ],
                        body,
                    } as any as HttpResponse<T>;
                });
        };

        return doWithRetry<HttpResponse<T>>(request, `Requesting '${url}'`, optionsToUse.retry);
    }
}

/**
 * HttpClientFactory that creates HttpClient instances backed by curl.
 */
export class CurlHttpClientFactory implements HttpClientFactory {

    public create(url?: string): HttpClient {
        if (os.platform() === "win32") {
            throw new Error("CurlHttpClient is not available on Windows.");
        }
        return new CurlHttpClient();
    }
}
