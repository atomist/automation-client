import { ProjectOperationCredentials } from "./ProjectOperationCredentials";

export interface BasicAuthCredentials extends ProjectOperationCredentials {

    username: string;

    password: string;
}

export function isBasicAuthCredentials(o: any): o is BasicAuthCredentials {
    const c = o as BasicAuthCredentials;
    return !!c.username && !!c.password;
}
