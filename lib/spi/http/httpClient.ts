import {
    DefaultRetryOptions,
    RetryOptions,
} from "../../util/retry";
import { AxiosHttpClientFactory } from "./axiosHttpClient";

/**
 * Available HTTP request methods to use with HttpClient.
 */
export enum HttpMethod {
    Get = "GET",
    Post = "POST",
    Put = "PUT",
    Delete = "DELETE",
    Options = "OPTIONS",
    Patch = "PATCH",
    Head = "HEAD",
}

/**
 * HTTP options to pass into HttpClient.exchange.
 */
export interface HttpClientOptions {
    /** Optional HTTP request method; defaults to HtppMethod.Get */
    method?: HttpMethod;

    /** Optional HTTP headers to be included in the request */
    headers?: { [name: string]: string };

    /** Optional payload body to be sent */
    body?: any;

    /** Optional retry options */
    retry?: RetryOptions;

    /** Raw options to be passed to the underlying implementation; Please use with care */
    options?: any;
}

/**
 * HTTP response from HttpClient.exchange.
 */
export interface HttpResponse<T> {
    /** HTTP status code */
    status: number;

    /** Optional HTTP headers to server returned */
    headers?: { [name: string]: string };

    /** Optional response body of type T */
    body?: T;
}

/**
 * HTTP request abstraction to be implemented by different frameworks and command line
 * tools.
 */
export interface HttpClient {

    /**
     * Exchange the given HTTP request with the server at url.
     * @param {string} url
     * @param {HttpClientOptions} options
     * @returns {Promise<HttpResponse<T>>}
     */
    exchange<T>(url: string,
                options?: HttpClientOptions): Promise<HttpResponse<T>>;
}

/**
 * Factory to construct HttpClient instances.
 */
export interface HttpClientFactory {

    /**
     * Create a HttpClient for the given url.
     * @param {string} url
     * @returns {HttpClient}
     */
    create(url?: string): HttpClient;
}

/**
 * Default HTTP client options each implementation to should use.
 * @type {{method: HttpMethod; headers: {}; retry: WrapOptions}}
 */
export const DefaultHttpClientOptions: HttpClientOptions = {
    method: HttpMethod.Get,
    headers: {},
    retry: DefaultRetryOptions,
};

/**
 * Default HttpClientFactory which gets registered in the automation-client if not a
 * different HttpClientFactory implementation is configured.
 * @see Configuration.http.client.factory
 * @type {HttpClientFactory}
 */
export const DefaultHttpClientFactory = new AxiosHttpClientFactory();
