export function hideString(value) {
    if (!value) {
        return value;
    }
    let newValue = "";
    for (let i = 0; i < value.length; i++) {
        if (i === 0) {
            newValue = value.charAt(0);
        } else if (i < value.length - 1) {
            newValue += "*";
        } else {
            newValue += value.slice(-1);
        }
    }
    return newValue;
}

export function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
        s4() + "-" + s4() + s4() + s4();
}

export function findLine(str, idx) {
    const first = str.substring(0, idx);
    const last = str.substring(idx);

    const firstNewLine = first.lastIndexOf("\n");

    let secondNewLine = last.indexOf("\n");

    if ( secondNewLine === -1 ) {
        secondNewLine = last.length;
    }
    return str.substring(firstNewLine + 1, idx + secondNewLine);
}
