
import asyncio
import websockets

import json

async def test(ws):
    msg = await websockets.recv()
    print("Message", msg)
    ret = "fuck " + msg

    await websockets.send(ret)

start_server = websockets.serve(test, "0.0.0.0", 6969)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
