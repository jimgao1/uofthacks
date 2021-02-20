import { ClientConnectMessage, ClientDrawMessage, ClientMethod } from './client';
import { ServerMessage, ServerMethod } from './server';

export interface MessageHandler {
    [ServerMethod.CLIENT_DRAW]: (e: ServerMessage) => void;
};

export type ErrorHandler = (e: any) => void;

export class Connection {
    ws?: WebSocket;
    messageHandler: MessageHandler;
    errorHandler: ErrorHandler;

    token?: string;

    constructor(messageHandler: MessageHandler, errorHandler: ErrorHandler) {
        this.messageHandler = messageHandler;
        this.errorHandler = errorHandler;
    }

    connect(url: string, name: string, identifier: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);

            const tokenHandler = (event: MessageEvent) => {
                const msg = JSON.parse(event.data);
                if (msg.method === 'client_token') {
                    this.token = msg.client_token;
                }

                this.ws = ws;
                ws.removeEventListener('message', tokenHandler);
                resolve();
            };
            const openHandler = () => {
                const connectRequest: ClientConnectMessage = {
                    method: ClientMethod.CONNECT,
                    identifier,
                    name,
                };
                ws.send(JSON.stringify(connectRequest));

                ws.removeEventListener('open', openHandler);
                ws.removeEventListener('error', errorHandler);
                ws.addEventListener('message', tokenHandler);
            };
            const errorHandler = () => {
                reject();
            };

            ws.addEventListener('open', openHandler);
            ws.addEventListener('error', errorHandler);
        });
    }

    attach() {
        if (this.ws === undefined) {
            throw 'Please piss the fuck off';
        }

        this.ws.addEventListener('message', event => {
            const msg = JSON.parse(event.data) as ServerMessage;
            if (msg.method in this.messageHandler) {
                this.messageHandler[msg.method](msg);
            }
        });

        this.ws.addEventListener('error', this.errorHandler);
    }

    draw(points: Array<[number, number]>, color: string) {
        if (this.ws === undefined || this.token === undefined) {
            throw 'Please piss the fuck off';
        }

        const message: ClientDrawMessage = {
            method: ClientMethod.DRAW,
            token: this.token,
            points,
            color,
        };
        this.ws.send(JSON.stringify(message));
    }
};
