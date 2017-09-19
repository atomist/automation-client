let jwtToken: string = "";

export function setJwtToken(token: string) {
    jwtToken = token;
}

export function getJwtToken() {
    return jwtToken;
}
