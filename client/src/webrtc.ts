export class WebRTCConnection {
    private websocket?: WebSocket;
    private stream?: MediaStream;
    private identifier?: string;

    private peers: {[id: string]: RTCPeerConnection} = {};

    constructor(private hiddenDiv: HTMLDivElement) {
    }

    async getUserMedia(): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
        });

        this.stream = stream;
    }

    connect(url: string, identifier: string): Promise<void> {
        const websocket = new WebSocket(url);
        this.identifier = identifier;

        return new Promise((resolve, reject) => {
            const openHandler = (_: Event) => {
                websocket.send(JSON.stringify({ method: 'connect', identifier }));
                websocket.removeEventListener('open', openHandler);
                websocket.removeEventListener('error', errorHandler);

                this.websocket = websocket;
                resolve();
            };

            const errorHandler = (_: Event) => {
                websocket.removeEventListener('open', openHandler);
                websocket.removeEventListener('error', errorHandler);

                reject();
            };

            websocket.addEventListener('open', openHandler);
            websocket.addEventListener('error', errorHandler);
        });
    }

    attach() {
        if (this.websocket === undefined) {
            throw "Piss the fuck off";
        }

        this.websocket.addEventListener('message', event => this.signalHandler(event));
    }

    private signalHandler(event: MessageEvent) {
        const message = JSON.parse(event.data) as Signal;

        if (message.identifier == this.identifier) {
            return;
        }
        switch (message.method) {
            case 'connect':
                if (message.dest === undefined) {
                    console.log('setup new peer');
                    /* the first message every new user sends is a broadcast message */
                    this.setUpPeer(message.identifier);
                    /* tell the new peer about us */
                    this.websocket?.send(JSON.stringify({ method: 'connect', identifier: this.identifier, dest: message.identifier }));
                } else {
                    console.log('setup existing peer');
                    /* we're being told about a existing client */
                    this.setUpPeer(message.identifier, true);
                }
                break;
            case 'sdp':
                this.peers[message.identifier].setRemoteDescription(new RTCSessionDescription(message.sdp)).then(() => {
                    if (message.sdp.type == 'offer') {
                        this.peers[message.identifier].createAnswer().then(desc => this.createdDescription(desc, message.identifier));
                    }
                });
                break;
            case 'ice':
                this.peers[message.identifier].addIceCandidate(new RTCIceCandidate(message.ice));
        }
    }

    private setUpPeer(identifier: string, init: boolean = false) {
        this.peers[identifier] = new RTCPeerConnection(peerConnectionConfig);

        this.peers[identifier].onicecandidate = event => this.gotIceCandidate(event, identifier);
        this.peers[identifier].ontrack = event => this.gotRemoteStream(event, identifier);
        this.peers[identifier].oniceconnectionstatechange = event => this.checkPeerDisconnect(event, identifier);

        const stream = this.stream!;
        const track = stream.getTracks()[0];
        this.peers[identifier].addTrack(track, stream);

        if (init) {
            this.peers[identifier].createOffer().then(desc => this.createdDescription(desc, identifier));
        }
    }

    private createdDescription(desc: RTCSessionDescriptionInit, identifier: string) {
        console.log(`got description, peer ${identifier}`);
        this.peers[identifier].setLocalDescription(desc).then(() => {
            const payload: PeerSDPSignal = {
                method: 'sdp',
                dest: identifier,
                identifier: this.identifier!,
                sdp: desc,
            };
            this.websocket?.send(JSON.stringify(payload));
        });
    }

    private gotIceCandidate(event: RTCPeerConnectionIceEvent, identifier: string) {
        if (event.candidate !== null) {
            console.log(`ice from ${identifier}`);
            const payload: PeerICESignal = {
                method: 'ice',
                dest: identifier,
                identifier: this.identifier!,
                ice: event.candidate,
            };
            this.websocket?.send(JSON.stringify(payload));
        }
    }

    private gotRemoteStream(event: RTCTrackEvent, identifier: string) {
        const vidElement = document.createElement('audio');
        vidElement.setAttribute('id', 'remoteVideo_' + identifier);
        vidElement.setAttribute('autoplay', '');
        vidElement.srcObject = event.streams[0];
        this.hiddenDiv.appendChild(vidElement);

        console.log(event.streams)
        console.log('creating stream for', identifier);
    }

    private checkPeerDisconnect(event: Event, identifier: string) {
        var state = this.peers[identifier].iceConnectionState;
        console.log(`connection with peer ${identifier} ${state}`);
        if (state === "failed" || state === "closed" || state === "disconnected") {
            delete this.peers[identifier];
            document.getElementById('remoteVideo_' + identifier)?.remove();
        }
    }
}

const peerConnectionConfig: RTCConfiguration = {
	'iceServers': [
		{ 'urls': 'stun:stun.stunprotocol.org:3478' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
};

type Signal = PeerConnectionSignal | PeerICESignal | PeerSDPSignal;

interface PeerSignal {
    identifier: string;
    dest?: string;
};

interface PeerConnectionSignal extends PeerSignal {
    method: 'connect';
}

interface PeerICESignal extends PeerSignal {
    method: 'ice';
    ice: RTCIceCandidate;
};

interface PeerSDPSignal extends PeerSignal {
    method: 'sdp';
    sdp: RTCSessionDescriptionInit;
};