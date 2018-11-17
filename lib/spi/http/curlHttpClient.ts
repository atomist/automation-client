import * as _ from "lodash";
import * as os from "os";
import { execPromise } from "../../util/child_process";
import { logger } from "../../util/logger";
import { doWithRetry } from "../../util/retry";
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

    public exchange<T>(url: string, options: HttpClientOptions = {}): Promise<HttpResponse<T>> {

        const optionsToUse: HttpClientOptions = {
            ...DefaultHttpClientOptions,
            ...options,
        };

        // Prepare headers
        const headers = _.map(optionsToUse.headers, (v, k) => `${k}: ${v}`);

        // Prepare the provided raw curl options
        const rawOptions = _.map(optionsToUse.options, (v, k) => {
            if (k.length === 1) {
                return [`-${k}`, v];
            } else {
                return [`--${k}`, v];
            }
        });

        const request = async () => {

            try {
                const result = await execPromise("curl", [
                    "-X", optionsToUse.method,
                    url,
                    "-s",
                    "--write-out",
                    "HTTPSTATUS:%{http_code}",
                    ..._.flatten(headers.map(h => (["-H", h]))),
                    ..._.flatten(rawOptions),
                    ...(options.body ? ["-d", JSON.stringify(options.body)] : []),
                ]);
                const parts = result.stdout.split("HTTPSTATUS:");
                let body: any;
                try {
                    body = JSON.parse(parts[0]);
                } catch (e) {
                    logger.warn(`Failed to parse response from curl: ${e.message}`);
                }
                return {
                    status: +parts[1],
                    body: (body) ? body : parts[0],
                } as any as HttpResponse<T>;
            } catch (e) {
                logger.error(`Failed to curl: ${e.message}`);
                throw e;
            }
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
