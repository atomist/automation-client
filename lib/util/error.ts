export function printError(e: any): void {
    if (e instanceof Error) {
        if (e.stack && e.stack.includes(e.message)) {
            console.error(e.stack);
        } else if (e.stack) {
            console.error(e.message);
            console.error(e.stack);
        } else {
            console.error(e.message);
        }
    } else {
        console.error(e);
    }
}
