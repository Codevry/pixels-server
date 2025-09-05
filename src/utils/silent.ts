/**
 * silently execute the given function
 * @param name - function name
 * @param fn - actual function
 * @constructor
 */
export function Silent(name: string, fn: any) {
    (async () => {
        try {
            await fn;
            console.log(`${name} silent-fn is successful`);
        } catch (err) {
            console.error(`${name} silent-fn is failed`, err);
        }
    })();
}
