import asyncio
import json
import websockets

clients = {}

async def handler(ws, path):
    async for msg in ws:
        try:
            req = json.loads(msg)
            clients[ws] = req['identifier']

            if 'dest' in req:
                for client, client_id in clients.items():
                    if client_id == req['dest']:
                        await client.send(msg)
            else:
                for client in clients:
                    await client.send(msg)
        except Exception as e:
            print("error:", e)
            ws.close()
    del clients[ws]

