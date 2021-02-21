
import asyncio
import json
import ssl
import websockets
import cv2
import logging
import time
import signal
import sys
from dataclasses import asdict

from aiortc import RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCIceGatherer, RTCConfiguration, RTCIceServer
from aiortc.contrib.media import MediaPlayer, MediaRecorder

from fuckery import candidate_from_sdp, candidate_to_sdp

logging.basicConfig(level=logging.DEBUG)

ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT, verify_mode=ssl.CERT_NONE)
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# ws_url = "wss://172.105.29.67:8443"
ws_url = "wss://localhost:8443"

players = {
    'webcam': MediaPlayer("/dev/video0", format='v4l2', options={
        'video_size': '640x480'
    }),

    'shemale': MediaPlayer('/tmp/shemale.mp4')
}

recorders = dict()

rec = MediaRecorder("out.mp3")

'''
peerConnConfig = RTCConfiguration(
    [
        RTCIceServer(**{ 'urls': 'stun:stun.stunprotocol.org:3478' }),
        RTCIceServer(**{ 'urls': 'stun:stun.l.google.com:19302' }),
    ]
)
'''

peerConnConfig = RTCConfiguration(
    [
        RTCIceServer(**{ 'urls': 'stun:stun.stunprotocol.org:3478' }),
        RTCIceServer(**{ 'urls': 'stun:stun.l.google.com:19302' }),
    ]
)

uuid = "3efc3d66-59e9-4f77-8d6a-329a0c7dea68"
peers = dict()
tracks = dict()

async def setupPeer(ws, peerId, displayName, initCall=False):
    peers[peerId] = { 'displayName': displayName, 'pc': RTCPeerConnection(peerConnConfig) }

    pc = peers[peerId]['pc']
    pc.addTrack(players['shemale'].audio)

    @pc.on("track")
    def on_track(track):
        print("Got track", track.kind, type(track))
        tracks[peerId] = track
        rec.addTrack(track)

    @pc.on('iceconnectionstatechange')
    def on_statechange():
        print("fuck", pc.iceConnectionState)

    @pc.on('icegatheringstatechange')
    def on_gatherchange():
        print("fuck beeta", pc.iceGatheringState)

    if initCall:
        desc = await pc.createOffer()
        await pc.setLocalDescription(desc)
        await ws.send(json.dumps({
            'sdp': asdict(peers[peerId]['pc'].localDescription),
            'uuid': uuid,
            'dest': peerId
        }))
    

async def client():
    async with websockets.connect(ws_url, ssl=ssl_ctx) as ws:
        # send hello message
        hello_msg = {
            "displayName": "fucker",
            "uuid": uuid,
            "dest": "all"
        }
        await ws.send(json.dumps(hello_msg))

        if False:
            for idx, c in enumerate(gatherer.getLocalCandidates()):
                print("Broadcasting candidate", idx)
                c.sdpMid = uuid
                shit = candidate_to_sdp(c)
                msg = {
                    "ice": {
                        "candidate": shit,
                        "sdpMLineIndex": 0,
                        "sdpMid": uuid
                    },
                    "uuid": uuid,
                    "dest": 'all'
                }
                print(msg)
                await ws.send(json.dumps(msg))

        async for msg in ws:
            msg = json.loads(msg)

            peerId = msg['uuid']

            if peerId == uuid or (msg['dest'] != uuid and msg['dest'] != 'all'): continue
            print("msg", msg)

            if 'displayName' in msg and msg['dest'] == 'all':
                print("1")
                await setupPeer(ws, peerId, msg['displayName'])
                await ws.send(json.dumps({
                    "displayName": 'fucker',
                    'uuid': uuid,
                    'dest': peerId
                }))

                pc = peers[peerId]['pc']
                print("Joining")

            elif 'displayName' in msg and msg['uuid'] == uuid:
                print("2")
                await setupPeer(ws, peerId, msg['displayName'], True)
                print("Initializing")
            elif 'sdp' in msg:
                print("3")
                # set remote description
                pc = peers[peerId]['pc']
                await pc.setRemoteDescription(RTCSessionDescription(**msg['sdp']))
                await rec.start()
                print("starting recorder")
                if msg['sdp']['type'] == 'offer':
                    answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    await ws.send(json.dumps({
                        'sdp': asdict(peers[peerId]['pc'].localDescription),
                        'uuid': uuid,
                        'dest': peerId
                    }))

            elif 'ice' in msg:
                print("4")
                pc = peers[peerId]['pc']
                print("====== ice", msg['ice'])
                if len(msg['ice']['candidate']) < 8:
                    print("======================== gather finished")
                    continue

                candidate = candidate_from_sdp(msg['ice']['candidate'])
                candidate.sdpMid = '0'
                await pc.addIceCandidate(candidate)

                if False:
                    for idx, c in enumerate(gatherer.getLocalCandidates()):
                        print("Broadcasting candidate", idx)
                        c.sdpMid = uuid
                        shit = candidate_to_sdp(c)
                        msg = {
                            "ice": {
                                "candidate": shit,
                                "sdpMLineIndex": 0,
                                "sdpMid": uuid
                            },
                            "uuid": uuid,
                            "dest": peerId
                        }
                        print(msg)
                        await ws.send(json.dumps(msg))

        print("Done")

async def stop_it():
    # for k in recorders:
        # await recorders[k].stop()
    await rec.stop()

try:
    # asyncio.get_event_loop().run_until_complete(rec.start())
    asyncio.get_event_loop().run_until_complete(client())
except KeyboardInterrupt:
    pass
finally:
    print("Stopping %d recorders" % len(recorders))
    asyncio.get_event_loop().run_until_complete(stop_it())
