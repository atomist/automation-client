import { AxiosRequestConfig } from "axios";
import * as url from "url";

export function configureProxy(config: AxiosRequestConfig): AxiosRequestConfig {
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        const proxyOpts = url.parse(proxy);

        config.proxy = {
            host: proxyOpts.hostname,
            port: +proxyOpts.port,
            auth: proxyAuth(proxyOpts),
        };
        (config.proxy as any).protocol = proxyOpts.protocol;
    }
    return config;
}

function proxyAuth(proxyOpts: url.UrlWithStringQuery) {
    if (proxyOpts.auth) {
        const parts = proxyOpts.auth.split(":");
        if (parts.length === 2) {
            return {
                username: parts[0],
                password: parts[1],
            };
        }
        throw new Error("Malformed Proxy authentication");
    }
}
