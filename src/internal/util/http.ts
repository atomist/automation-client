import { AxiosRequestConfig } from "axios";
import * as url from "url";

export function configureProxy(config: AxiosRequestConfig): AxiosRequestConfig {
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        const proxyOpts = url.parse(proxy);
        config.proxy = {
            host: proxyOpts.hostname,
            port: +proxyOpts.port,
        };
        (config.proxy as any).protocol = proxyOpts.protocol;
    }
    return config;
}
