import * as _ from "lodash";
import { Configuration } from "../configuration";
import { automationClientInstance } from "../globals";
import {
    DefaultHttpClientFactory,
    HttpClient,
} from "../spi/http/httpClient";

/**
 * Return a HttpClient for given url
 */
export function httpClient(url: string,
                           configuration?: Configuration): HttpClient {
    const cfg = !!configuration ? configuration : automationClientInstance().configuration;
    return _.get(cfg, "http.client.factory", DefaultHttpClientFactory).create(url);
}
