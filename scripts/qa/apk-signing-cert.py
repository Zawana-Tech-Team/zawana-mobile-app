"""Read APK v2 public certificate fingerprints, without exporting any private key.

This inspects certificates; Android's installer verifies the actual APK signature.
Format: https://source.android.com/docs/security/features/apksigning/v2
"""
import hashlib
import json
import struct
import sys
from pathlib import Path


def field(data, offset=0):
    length = struct.unpack_from('<I', data, offset)[0]
    end = offset + 4 + length
    if end > len(data):
        raise ValueError('Invalid length-prefixed signing field')
    return data[offset + 4:end], end


def fingerprints(filename):
    data = Path(filename).read_bytes()
    end = data.rfind(b'PK\x05\x06', max(0, len(data) - 65557))
    if end < 0:
        raise ValueError('Missing ZIP end record')
    directory = struct.unpack_from('<I', data, end + 16)[0]
    if data[directory - 16:directory] != b'APK Sig Block 42':
        raise ValueError('APK v2 signing block is missing')
    size = struct.unpack_from('<Q', data, directory - 24)[0]
    start = directory - size - 8
    if start < 0 or struct.unpack_from('<Q', data, start)[0] != size:
        raise ValueError('Invalid APK signing block')
    offset = start + 8
    while offset < directory - 24:
        length = struct.unpack_from('<Q', data, offset)[0]
        identifier = struct.unpack_from('<I', data, offset + 8)[0]
        if length < 4 or offset + 8 + length > directory - 24:
            raise ValueError('Invalid signing block entry')
        if identifier == 0x7109871A:
            signers, _ = field(data[offset + 12:offset + 8 + length])
            results = []
            signer_offset = 0
            while signer_offset < len(signers):
                signer, signer_offset = field(signers, signer_offset)
                signed, _ = field(signer)
                _, certificates_offset = field(signed)
                certificates, _ = field(signed, certificates_offset)
                certificate, _ = field(certificates)
                results.append({'sha1': hashlib.sha1(certificate).hexdigest().upper(),
                                'sha256': hashlib.sha256(certificate).hexdigest().upper()})
            return results
        offset += 8 + length
    raise ValueError('No APK v2 signer found')


if __name__ == '__main__':
    print(json.dumps(fingerprints(sys.argv[1]), indent=2))
