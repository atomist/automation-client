import * as _ from "lodash";
import { Configuration } from "../configuration";
import { automationClientInstance } from "../globals";
import {
    defaultHttpClientFactory,
    HttpClient,
} from "../spi/http/httpClient";

/**
 * Return a HttpClient for given url
 *
 * This implementation falls back to the DefaultHttpClientFactory if no
 * configuration is provided and no running client instance can be found.
 */
export function httpClient(url: string,
                           configuration?: Configuration): HttpClient {
    let cfg = configuration;
    if (!cfg && !!automationClientInstance()) {
        cfg = automationClientInstance().configuration;
    }
    return _.get(cfg, "http.client.factory", defaultHttpClientFactory()).create(url);
}
