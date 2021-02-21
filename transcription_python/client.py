
import six.moves import queue

from aiortc import MediaStreamTrack
from av import AudioFrame

from google.cloud import speech
from google.cloud import language_v1

class PyAVSource:
    def __init__(self):
        self.buf = queue.Queue()
        self.rate = 48000
        self.frames_per_buffer = 960

    def generator(self):
        frame = self.buf.get()
        if frame is None: return
        frame = frame.to_ndarray()
        frame = frame.reshape((2, 960))

        data = [frame]

        while True:
            try:
                frame = self.buf.get(block=False)
                if frame is None: return
                frame = frame.to_ndarray()
                frame = frame.reshape((2, 960))
                data.append(frame)
            except queue.Empty:
                break

        signal = np.concatenate(data, axis=1)
        signal_mono = np.sum(signal, axis=0) // 2

        raw = signal_mono.astype(np.int16).tobytes()
        return raw

class TranscriberClient(threading.Thread):
    def __init__(self, peerId):
        self.peerId = peerId
        self.source = PyAVSource()

    def loop(self, responses):
        for res in responses:
            if not res.results: continue
            result = res.results[0]
            transcript = result.alternatives[0].transcript

            if result.is_final:
                print(self.peerId, transcript)

    def run(self):
        client = speech.SpeechClient()

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=RATE,
            language_code=language_code,
        )

        streaming_config = speech.StreamingRecognitionConfig(
            config=config, interim_results=True
        )

        start_time = time.perf_counter()
        audio_generator = stream.generator()
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in audio_generator
        )

        responses = client.streaming_recognize(streaming_config, requests)

        self.listen_print_loop(responses)

class TranscriberSourceReplenisher(threading.Thread):
    def __init__(self, track, source):
        self.track = track
        self.source = source

    def run(self):
        while True:
            frame = self.track.recv()
            self.source.buf.put(frame)
