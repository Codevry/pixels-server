export type TypeRedisStatus =
    | "wait"
    | "reconnecting"
    | "connecting"
    | "connect"
    | "ready"
    | "close"
    | "end";

export type TypeRedisOptions = {
    maxRetriesPerRequest: number | null;
    host: string;
    port: number;
    user: string;
    pass: string;
    db: number;
};
