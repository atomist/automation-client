// tslint:disable-next-line:import-blacklist
import axios, { AxiosRequestConfig } from "axios";
import { configureProxy } from "../../internal/util/http";
import { doWithRetry } from "../../util/retry";
import {
    DefaultHttpClientOptions,
    HttpClient,
    HttpClientFactory,
    HttpClientOptions,
    HttpResponse,
} from "./httpClient";

/**
 * Axios based HttpClient implementation.
 */
export class AxiosHttpClient implements HttpClient {

    public exchange<T>(url: string, options: HttpClientOptions = {}): Promise<HttpResponse<T>> {

        const optionsToUse: HttpClientOptions = {
            ...DefaultHttpClientOptions,
            ...options,
        };

        const request = () => {
            return axios.request(this.configureOptions(configureProxy({
                url,
                headers: optionsToUse.headers,
                method: optionsToUse.method.toString().toUpperCase(),
                data: optionsToUse.body,
                ...optionsToUse.options,
            })))
                .then(result => {
                    return {
                        status: result.status,
                        headers: result.headers,
                        body: result.data,
                    };
                });
        };

        return doWithRetry<HttpResponse<T>>(request, `Requesting '${url}'`, optionsToUse.retry);
    }

    protected configureOptions(options: AxiosRequestConfig): AxiosRequestConfig {
        return options;
    }
}

/**
 * HttpClientFactory that creates HttpClient instances backed by Axios.
 */
export class AxiosHttpClientFactory implements HttpClientFactory {

    public create(url?: string): HttpClient {
        return new AxiosHttpClient();
    }
}
