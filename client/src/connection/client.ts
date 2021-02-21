export type ClientMessage = ClientConnectMessage | ClientDrawMessage;

export interface ClientDrawMessage {
    method: typeof ClientMethod.DRAW;
    token: string;
    points: Array<[number, number]>;
    color: string;
    width: number;
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