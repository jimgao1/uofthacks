
from aiortc import RTCPeerConnection, RTCIceCandidate, RTCSessionDescription

def candidate_from_sdp(sdp: str) -> RTCIceCandidate:
    bits = sdp.split()
    if len(bits) < 8: return ""
    assert len(bits) >= 8

    candidate = RTCIceCandidate(
        component=int(bits[1]),
        foundation=bits[0],
        ip=bits[4],
        port=int(bits[5]),
        priority=int(bits[3]),
        protocol=bits[2],
        type=bits[7],
    )

    for i in range(8, len(bits) - 1, 2):
        if bits[i] == "raddr":
            candidate.relatedAddress = bits[i + 1]
        elif bits[i] == "rport":
            candidate.relatedPort = int(bits[i + 1])
        elif bits[i] == "tcptype":
            candidate.tcpType = bits[i + 1]

    return candidate

def candidate_to_sdp(candidate: RTCIceCandidate) -> str:
    sdp = (
        f"{candidate.foundation} {candidate.component} {candidate.protocol} "
        f"{candidate.priority} {candidate.ip} {candidate.port} typ {candidate.type}"
    )

    if candidate.relatedAddress is not None:
        sdp += f" raddr {candidate.relatedAddress}"
    if candidate.relatedPort is not None:
        sdp += f" rport {candidate.relatedPort}"
    if candidate.tcpType is not None:
        sdp += f" tcptype {candidate.tcpType}"
    return sdp



