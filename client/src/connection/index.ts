import { ClientConnectMessage, ClientMessage, ClientMethod } from './client';
import { ServerMessage, ServerMethod } from './server';

interface MessageHandler {
    [ServerMethod.CLIENT_DRAW]: (e: ServerMessage) => void;
};

type ErrorHandler = (e: any) => void;

export class Connection {
    ws?: WebSocket;
    messageHandler: MessageHandler;
    errorHandler: ErrorHandler;

    token?: string;

    constructor(messageHandler: MessageHandler, errorHandler: ErrorHandler) {
        this.messageHandler = messageHandler;
        this.errorHandler = errorHandler;
    }

    connect(url: string, name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);

            const tokenHandler = (event: MessageEvent) => {
                const msg = JSON.parse(event.data);
                if (msg.method === 'client_token') {
                    this.token = msg.client_token;
                }
                ws.removeEventListener('message', tokenHandler);
                resolve();
            };
            const openHandler = () => {
                const connectRequest: ClientConnectMessage = {
                    method: ClientMethod.CONNECT,
                    identifier: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
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
};
