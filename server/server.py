
import asyncio
import json
import random
import websockets

clients = dict()

async def connect(ws, req):
    # generate a new user identifier
    if ws not in clients:
        d = "0123456789abcdef"
        clients[ws] = "".join([ d[random.randrange(len(d))] for _ in range(32) ])

    return {
        "client_id": clients[ws]
    }

async def disconnect(ws, req):
    if ws not in clients or 'token' not in req or req['token'] != clients[ws]:
        return {
            "error": "Invalid or missing token"
        }

    del clients[ws]
    return {
        "result": "Okay"
    }

routes = {
    "/connect": connect
    "/disconnect": disconnect
}

async def handler(ws, path):
    print("Request:", path)

    msg = await ws.recv()
    try:
        req = json.loads(msg)

        if path in routes:
            res = await routes[path](ws, req)
            await ws.send(json.dumps(res))
        else:
            raise Error("Invalid path", path)

    except Exception as e:
        print(e)
        await ws.send(json.dumps({
            "error": "Invalid message"
        }))


start_server = websockets.serve(handler, "0.0.0.0", 6969)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
