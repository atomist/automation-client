import { AxiosRequestConfig } from "axios";
import * as url from "url";

export function configureProxy(config: AxiosRequestConfig): AxiosRequestConfig {
    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
        const proxyOpts = url.parse(proxy);
        config.proxy = {
            host: proxyOpts.hostname,
            port: +proxyOpts.port,
            auth: proxyOpts.auth ?
                { username: proxyOpts.auth.split(":")[0], password: proxyOpts.auth.split(":")[1] }
                : undefined,
        };
        (config.proxy as any).protocol = proxyOpts.protocol;
    }
    return config;
}
