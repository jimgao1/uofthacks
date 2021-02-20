export type ClientMessage = ClientConnectMessage;

export interface ClientConnectMessage {
    method: typeof ClientMethod.CONNECT;
    identifier: string;
    name: string;
}

export enum ClientMethod {
    CONNECT = 'connect'
};