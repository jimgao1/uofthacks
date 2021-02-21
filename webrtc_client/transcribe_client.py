
from six.moves import queue

from aiortc import MediaStreamTrack
from av import AudioFrame

import requests

from google.cloud import speech
from google.cloud import language_v1

import threading
import asyncio
import os

import numpy as np

class PyAVSource:
    def __init__(self):
        self.buf = queue.Queue()
        self.rate = 48000
        self.frames_per_buffer = 960

    def generator1(self):
        while True:
            mono = np.load("stereo.npy")
            print(mono.shape)
            raw = mono.tobytes()

            yield raw

    def generator(self):
        while True:
            frame = self.buf.get()
            if frame is None:
                return
            frame = frame.to_ndarray()
            frame = frame.reshape((960, 2))

            data = [frame]

            while True:
                try:
                    frame = self.buf.get(block=False)
                    if frame is None: break
                    frame = frame.to_ndarray()
                    frame = frame.reshape((960, 2))
                    data.append(frame)
                except queue.Empty:
                    break

            signal = np.concatenate(data, axis=0)
            # signal_mono = np.sum(signal, axis=0) // 2
            signal_mono = signal.reshape(-1)
            signal_mono = np.array(signal_mono[::2])

            raw = signal_mono.astype(np.int16).tobytes()
            yield raw
            # yield signal[1, :].astype(np.int16).tobytes()

class TranscriberClient(threading.Thread):
    def __init__(self, peerId, name, track):
        self.peerId = peerId
        self.displayName = name
        self.track = track
        self.source = PyAVSource()
        self.server_url = "http://localhost:6970/addtranscript"
        threading.Thread.__init__(self)

    def loop(self, responses):
        for res in responses:
            if not res.results: continue
            result = res.results[0]
            transcript = result.alternatives[0].transcript

            # if result.is_final:
            print(self.peerId, transcript, result.is_final)

            if result.is_final:
                req = {
                    "identifier": self.displayName,
                    "transcript": transcript
                }
                requests.post(self.server_url, req)

    def run(self):
        print("Starting TranscriberClient for", self.peerId)
        # GOOGLE_APPLICATION_CREDENTIALS=bruh-be270c8531f2.json
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'bruh-be270c8531f2.json'

        client = speech.SpeechClient()
        print(client)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=48000,
            language_code='en-US',
        )

        streaming_config = speech.StreamingRecognitionConfig(
            config=config, interim_results=True
        )

        audio_generator = self.source.generator()
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in audio_generator
        )

        responses = client.streaming_recognize(streaming_config, requests)
        self.loop(responses)

class TranscriberSourceReplenisher(threading.Thread):
    def __init__(self, track, source):
        self.track = track
        self.source = source
        threading.Thread.__init__(self)

    def run(self):
        print("Starting TranscriberSourceReplenisher")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        while True:
            # frame = await self.track.recv()
            frame = loop.run_until_complete(self.track.recv())
            self.source.buf.put(frame)

            threading.sleep(1)
