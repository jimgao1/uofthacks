import asyncio
import json
import random
import threading
import time
import websockets

import rtc

class Client:
    def __init__(self, ws, req):
        self.ws = ws
        self.name = req['name']
        self.identifier = req['identifier']

        d = "0123456789abcdef"
        self.token = "".join([ d[random.randrange(len(d))] for _ in range(32) ])

clients = dict()
strokes = list()
transcripts = list()

oof = "http://192.168.1.124:8080/test.html"

async def connect(ws, req):
    # generate a new user identifier
    if ws not in clients:
        clients[ws] = Client(ws, req)

    # tell everyone else that a client joined
    msg = {
        "method": "client_message",
        "identifier": clients[ws].identifier,
        "message": "what the actual fuck " + clients[ws].identifier + " joined"
    }

    for cl in clients:
        if cl != ws:
            print("broadcasting to client with id", clients[cl].identifier)
            await clients[cl].ws.send(json.dumps(msg))

    print("New client", clients[ws].identifier)

    return {
        "method": "client_token",
        "client_token": clients[ws].token
    }

async def disconnect(ws, req):
    # check which user it is 
    if ws not in clients or 'token' not in req or req['token'] != clients[ws].token:
        return {
            "error": "Invalid or missing token"
        }

    # client can fuck off here 
    del clients[ws]
    return {
        "result": "Okay"
    }

async def draw(ws, req):
    # check which user it is and user is valid 
    if ws not in clients or 'token' not in req or req['token'] != clients[ws].token:
        print("not authenticated")
        return {
            "error": "Invalid or missing token"
        }

    # create message to broadcast
    user = clients[ws]

    # this is a stroke to a pp 
    msg = {
        "method": "client_draw",
        "timestamp": int(time.time()),
        "identifier": user.identifier,
        "name": user.name,
        # "base": req['base'],
        # "deltas": req['deltas'],
        "points": req['points'],
        "color": req['color'],
        "width": req['width']
    }

    strokes.append(msg)

    # broadcast message
    for cl in clients:
        if cl != ws:
            print("broadcasting to client with id", clients[cl].identifier)
            await clients[cl].ws.send(json.dumps(msg))

async def heartbeat(ws):
    # make sure there is stream of traffic 
    while True:
        await ws.send("")
        await asyncio.sleep(10)

routes = {
    "connect": connect,
    "disconnect": disconnect,
    "draw": draw
}

async def broadcast_message(msg, ws_exclude=None):
    ret = {
        "method": "client_message",
        "message": msg
    }
    
    for cl in clients:
        if cl != ws_exclude:
            await clients[cl].ws.send(json.dumps(ret))

async def poke(ws, req):
    """ 
    pokey pokey 
    """

    if ws not in clients:
        clients[ws] = Client(ws, req)

    msg = "hey " + clients[ws].identifier + " wanna fuck?"
    await broadcast_message(msg, ws)

    print("New client", clients[ws].identifier)

    # return fuck shit 
    return {
        "fuck": "shit"
    }

async def handler(ws, path):
    print("Request:", path)

    # begin heartbeats
    # loop = asyncio.get_event_loop()
    # task = loop.create_task(heartbeat(ws))

    async for msg in ws:
        try:
            req = json.loads(msg)

            # ignore keepalives
            if req == {}: continue

            print("Message:", msg)

            if 'method' in req:
                res = await routes[req['method']](ws, req)
                print("Response", res)
                if res: 
                    await ws.send(json.dumps(res))
            else:
                pass
                # raise Error("Invalid path", path) 
 
        except Exception as e:
            print("Error!", e)
            await ws.send(json.dumps({
                "error": "Invalid message"
            }))

    # tell everyone else that the client disconnected 
    msg = {
        "method": "client_message",
        "identifier": clients[ws].identifier,
        "message": "what the actual fuck " + clients[ws].identifier + " left"
    }

    for cl in clients:
        print("broadcasting to client with id", clients[cl].identifier)
        if cl != ws:
            await clients[cl].ws.send(json.dumps(msg))

    # client can fuck off here 
    del clients[ws]

    print("Closed")

# initialize webserver
from flask import Flask, make_response, request
import json

app = Flask(__name__)

@app.route("/")
def index():
    return b"Hello"

@app.route("/strokes")
def route_strokes():
    resp = make_response(json.dumps(strokes))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@app.route("/users")
def route_users():
    resp = make_response(json.dumps(list(map(lambda k: (clients[k].name, clients[k].identifier), clients))))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@app.route("/transcriptions")
def route_transcriptions():
    resp = make_response(json.dumps(transcripts))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@app.route("/addtranscript", methods=['POST'])
def route_add_transcript():
    transcript = {
        "timestamp": int(time.time()),
        "identifier": request.form['identifier'],
        "transcript": request.form['transcript']
    }

    transcripts.append(transcript)


webserver_thread = threading.Thread(target=app.run, kwargs={"host": "0.0.0.0", "port": 6970})
webserver_thread.start()

async def ws_start():
    main_server = await websockets.serve(handler, "0.0.0.0", 6969, ping_timeout=None, max_size=None)
    rtc_server = await websockets.serve(rtc.handler, "0.0.0.0", 6968, ping_timeout=None, max_size=None)
    await asyncio.gather(main_server.wait_closed(), rtc_server.wait_closed())

asyncio.run(ws_start())

webserver_thread.join()
