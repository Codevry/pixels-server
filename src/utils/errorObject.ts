export class ErrorObject {
    error: any;
    status: number;

    constructor(status: number, error: any) {
        this.error = error;
        this.status = status;
    }

    /**
     * return response
     */
    json() {
        return {
            success: false,
            error:
                this.error instanceof Error ? this.error.message : this.error,
        };
    }
}
