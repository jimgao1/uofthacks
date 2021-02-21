from __future__ import division

import re
import sys

from google.cloud import speech
from google.cloud import language_v1

import pyaudio
import time

from six.moves import queue

from transcribe_client import PyAVSource

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms

transcript_list = []

start_time = time.perf_counter()

class MicrophoneStream(object):
    """Opens a recording stream as a generator yielding the audio chunks."""

    def __init__(self, rate, chunk):
        self._rate = rate
        self._chunk = chunk

        # Create a thread-safe buffer of audio data
        self._buff = queue.Queue()
        self.closed = True

    def __enter__(self):
        self._audio_interface = pyaudio.PyAudio()
        self._audio_stream = self._audio_interface.open(
            format=pyaudio.paInt16,
            # The API currently only supports 1-channel (mono) audio
            # https://goo.gl/z757pE
            channels=1,
            rate=self._rate,
            input=True,
            frames_per_buffer=self._chunk,
            # Run the audio stream asynchronously to fill the buffer object.
            # This is necessary so that the input device's buffer doesn't
            # overflow while the calling thread makes network requests, etc.
            stream_callback=self._fill_buffer,
        )

        self.closed = False

        return self

    def __exit__(self, type, value, traceback):
        self._audio_stream.stop_stream()
        self._audio_stream.close()
        self.closed = True
        # Signal the generator to terminate so that the client's
        # streaming_recognize method will not block the process termination.
        self._buff.put(None)
        self._audio_interface.terminate()

    def _fill_buffer(self, in_data, frame_count, time_info, status_flags):
        """Continuously collect data from the audio stream, into the buffer."""
        self._buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self):
        while not self.closed:
            # Use a blocking get() to ensure there's at least one chunk of
            # data, and stop iteration if the chunk is None, indicating the
            # end of the audio stream.
            chunk = self._buff.get()
            if chunk is None:
                return
            data = [chunk]

            # Now consume whatever other data's still buffered.
            while True:
                try:
                    chunk = self._buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            print(len(data))

            yield b"".join(data)


def listen_print_loop(responses):
    """Iterates through server responses and prints them.

    The responses passed is a generator that will block until a response
    is provided by the server.

    Each response may contain multiple results, and each result may contain
    multiple alternatives; for details, see https://goo.gl/tjCPAU.  Here we
    print only the transcription for the top alternative of the top result.

    In this case, responses are provided for interim results as well. If the
    response is an interim one, print a line feed at the end of it, to allow
    the next result to overwrite it, until the response is a final one. For the
    final one, print a newline to preserve the finalized transcription.
    """
    num_chars_printed = 0
    for response in responses:
        if not response.results:
            continue

        # The `results` list is consecutive. For streaming, we only care about
        # the first result being considered, since once it's `is_final`, it
        # moves on to considering the next utterance.
        result = response.results[0]
        if not result.alternatives:
            continue

        # Display the transcription of the top alternative.
        transcript = result.alternatives[0].transcript

        # Display interim results, but with a carriage return at the end of the
        # line, so subsequent lines will overwrite them.
        #
        # If the previous result was longer than this one, we need to print
        # some extra spaces to overwrite the previous result
        overwrite_chars = " " * (num_chars_printed - len(transcript))

        if not result.is_final:
            sys.stdout.write(transcript + overwrite_chars + "\r")
            sys.stdout.flush()

            num_chars_printed = len(transcript)

        else:
            message = transcript + overwrite_chars
            print("sentence:", message)

            sentence_info = {}
            
            sentence_info['message'] = message


                ####
            # sentiment analysis

            print(transcript_list)

            # meeting_text = ""
            # for oof in transcript_list:
            #     meeting_text += oof['message']

            # Instantiates a client
            client = language_v1.LanguageServiceClient()

            # The text to analyze
            text = message
            document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)

            # Detects the sentiment of the text
            sentiment = client.analyze_sentiment(request={'document': document}).document_sentiment
            # entities = client.analyze_entities(request={'document': document}).entities

            print("Text: {}".format(text))
            print("Sentiment: {}, {}".format(sentiment.score, sentiment.magnitude))

            sentence_info['sentiment'] = sentiment.score

            ####
            # entity recognition

            # Available types: PLAIN_TEXT, HTML
            type_ = language_v1.Document.Type.PLAIN_TEXT

            # Optional. If not specified, the language is automatically detected.
            # For list of supported languages:
            # https://cloud.google.com/natural-language/docs/languages
            language = "en"
            document = {"content": text_content, "type_": type_, "language": language}

            # Available values: NONE, UTF8, UTF16, UTF32
            encoding_type = language_v1.EncodingType.UTF8

            response = client.analyze_entities(request = {'document': document, 'encoding_type': encoding_type})

            # Loop through entitites returned from the API

            entity = response.entities[0]

            print(u"keyword of the sentence: {}".format(entity.name))

            sentence_info['keyword'] = entity.name 


            transcript_list.append(sentence_info)

            # Exit recognition if any of the transcribed phrases could be
            # one of our keywords.
            if re.search(r"\b(exit|quit)\b", transcript, re.I):
                print("Exiting..")
                break

            num_chars_printed = 0


def main():
    # See http://g.co/cloud/speech/docs/languages
    # for a list of supported languages.
    language_code = "en-US"  # a BCP-47 language tag

    client = speech.SpeechClient()
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code=language_code,
        audio_channel_count=2
    )

    streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
    )
    shit = PyAVSource()

    start_time = time.perf_counter()

    audio_generator = shit.generator1()

    requests = (
        speech.StreamingRecognizeRequest(audio_content=content)
        for content in audio_generator
    )

    responses = client.streaming_recognize(streaming_config, requests)

    # Now, put the transcription responses to use.
    listen_print_loop(responses)


if __name__ == "__main__":
    # transcript_list = [{'message': "what's the actual suck", 'time': 3.7776398999999996},
    #         {'message': ' is it possible', 'time': 28.997634599999998},
    #         {'message': ' this is private right what can deposit something into this', 'time': 37.842910599999996},
    #         {'message': ' quit', 'time': 56.5095233}] * 10

    # meeting_text = ""
    # for oof in transcript_list:
    #     meeting_text += oof['message']


    # client = language_v1.LanguageServiceClient()
    # # text_content = 'California is a state.'

    # ####
    # # sentiment analysis

    # print(transcript_list)

    # meeting_text = ""
    # for oof in transcript_list:
    #     meeting_text += oof['message']

    # # Instantiates a client
    # client = language_v1.LanguageServiceClient()

    # # The text to analyze
    # text = meeting_text
    # document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)

    # # Detects the sentiment of the text
    # sentiment = client.analyze_sentiment(request={'document': document}).document_sentiment
    # # entities = client.analyze_entities(request={'document': document}).entities

    # print("Text: {}".format(text))
    # print("Sentiment: {}, {}".format(sentiment.score, sentiment.magnitude))

    # ####
    # # entity recognition

    # # Available types: PLAIN_TEXT, HTML
    # type_ = language_v1.Document.Type.PLAIN_TEXT

    # # Optional. If not specified, the language is automatically detected.
    # # For list of supported languages:
    # # https://cloud.google.com/natural-language/docs/languages
    # language = "en"
    # document = {"content": meeting_text, "type_": type_, "language": language}

    # # Available values: NONE, UTF8, UTF16, UTF32
    # encoding_type = language_v1.EncodingType.UTF8

    # response = client.analyze_entities(request={'document': document, 'encoding_type': encoding_type})

    # # Loop through entitites returned from the API
    # for entity in response.entities:
    #     print(u"Representative name for the entity: {}".format(entity.name))

    #     # Get entity type, e.g. PERSON, LOCATION, ADDRESS, NUMBER, et al
    #     print(u"Entity type: {}".format(language_v1.Entity.Type(entity.type_).name))

    #     # Get the salience score associated with the entity in the [0, 1.0] range
    #     print(u"Salience score: {}".format(entity.salience))

    #     # Loop over the metadata associated with entity. For many known entities,
    #     # the metadata is a Wikipedia URL (wikipedia_url) and Knowledge Graph MID (mid).
    #     # Some entity types may have additional metadata, e.g. ADDRESS entities
    #     # may have metadata for the address street_name, postal_code, et al.
    #     for metadata_name, metadata_value in entity.metadata.items():
    #         print(u"{}: {}".format(metadata_name, metadata_value))

    #     # Loop over the mentions of this entity in the input document.
    #     # The API currently supports proper noun mentions.
    #     for mention in entity.mentions:
    #         print(u"Mention text: {}".format(mention.text.content))

    #         # Get the mention type, e.g. PROPER for proper noun
    #         print(
    #             u"Mention type: {}".format(language_v1.EntityMention.Type(mention.type_).name)
    #         )

    # # Get the language of the text, which will be the same as
    # # the language specified in the request or, if not specified,
    # # the automatically-detected language.
    # print(u"Language of the text: {}".format(response.language))


    # ####
    # # classify content

    # # text_content = 'That actor on TV makes movies in Hollywood and also stars in a variety of popular new TV shows.'

    # # Available types: PLAIN_TEXT, HTML
    # type_ = language_v1.Document.Type.PLAIN_TEXT

    # # Optional. If not specified, the language is automatically detected.
    # # For list of supported languages:
    # # https://cloud.google.com/natural-language/docs/languages
    # language = "en"
    # document = {"content": meeting_text, "type_": type_, "language": language}

    # response = client.classify_text(request = {'document': document})
    # # Loop through classified categories returned from the API
    # for category in response.categories:
    #     # Get the name of the category representing the document.
    #     # See the predefined taxonomy of categories:
    #     # https://cloud.google.com/natural-language/docs/categories
    #     print(u"Category name: {}".format(category.name))
    #     # Get the confidence. Number representing how certain the classifier
    #     # is that this category represents the provided text.
    #     print(u"Confidence: {}".format(category.confidence))







    main()
