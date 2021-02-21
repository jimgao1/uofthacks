export type ServerMessage = ServerDrawMessage;

export interface ServerDrawMessage {
    method: typeof ServerMethod.CLIENT_DRAW;
    identifier: string;
    points: Array<[number, number]>;
    color: string;
    width: number;
}

export enum ServerMethod {
    CLIENT_DRAW = 'client_draw'
};