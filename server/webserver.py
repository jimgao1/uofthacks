
# initialize webserver

from flask import Flask
import json
app = Flask(__name__)

@app.route("/")
def index():
    return b"Hello"

@app.route("/strokes")
def strokes()
    return json.dumps(strokes, indent=2)
