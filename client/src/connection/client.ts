export type ClientMessage = ClientConnectMessage | ClientDrawMessage;

export interface ClientDrawMessage {
    method: typeof ClientMethod.DRAW;
    token: string;
    base: [number, number];
    deltas: Array<[number, number]>;
    color: string;
};

export interface ClientConnectMessage {
    method: typeof ClientMethod.CONNECT;
    identifier: string;
    name: string;
};

export enum ClientMethod {
    CONNECT = 'connect',
    DRAW = 'draw',
};