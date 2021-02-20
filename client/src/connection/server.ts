export interface ServerMessage {
    method: ServerMethod;
};

export enum ServerMethod {
    CLIENT_DRAW = 'client_draw'
};