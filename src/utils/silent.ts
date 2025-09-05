/**
 * Executes an asynchronous function silently without throwing errors.
 * Logs success or error messages to the console but does not propagate errors.
 *
 * @param {string} name - Identifier for the function being executed (used in logging)
 * @param {() => Promise<unknown>} asyncFunction - Asynchronous function to execute
 * @returns {void} This function doesn't return anything
 */
export default function silent(
    name: string,
    asyncFunction: () => Promise<unknown>
): void {
    asyncFunction()
        .then((resp) =>
            console.log(
                `Silent function '${name}' completed successfully:`,
                resp
            )
        )
        .catch((error) => {
            console.error(`Silent function '${name}' caught an error:`, error);
            // No re-throwing, no return
        });
}
