#!/usr/bin/env python3
"""ADB smoke driver for the real app; requires a member to be signed in first.

No authentication bypass, mock routes, fake reservations or screenshot compositing.
Select dates/courts normally, then use this helper's stable resource IDs to drive
and capture the journey. All captures are actual adb screencap PNGs.
"""
import argparse
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADB = os.environ.get('ADB', str(Path.home() / 'Library/Android/sdk/platform-tools/adb'))

def adb(*args, binary=False):
    return subprocess.check_output([ADB, *args], text=not binary, timeout=20)

def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/zawana-qa.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/zawana-qa.xml')).iter('node')

def tap(resource_id,attribute="resource-id"):
    node = next((n for n in nodes() if n.get(attribute) == resource_id), None)
    if node is None or node.get('enabled') != 'true':
        raise SystemExit(f'Visible enabled control not found: {resource_id}')
    x1,y1,x2,y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def capture(name):
    out=ROOT/'artifacts/booking/android'
    out.mkdir(parents=True,exist_ok=True)
    file=out/f'{name}.png'
    file.write_bytes(adb('exec-out','screencap','-p',binary=True))
    print(file)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--tap', help='Visible testID/resource ID, e.g. booking-primary')
    p.add_argument('--tap-text', help='Exact visible text')
    p.add_argument('--tap-label', help='Exact accessibility label')
    p.add_argument('--expect',help='Expected screen testID before capture')
    p.add_argument('--capture', help='Capture name, e.g. standard-times-pass1')
    p.add_argument('--settle',type=float,default=1.5,help='Seconds to settle before capture')
    p.add_argument('--list', action='store_true', help='List booking control IDs and bounds')
    args=p.parse_args()
    if args.list:
        for n in nodes():
            rid=n.get('resource-id','')
            if rid.startswith(('booking-','date-','court-','slot-','my-bookings')):
                print(rid, n.get('enabled'), n.get('bounds'))
    if args.tap:tap(args.tap);time.sleep(.4)
    if args.tap_text:tap(args.tap_text,"text");time.sleep(.4)
    if args.tap_label:tap(args.tap_label,"content-desc");time.sleep(.4)
    if args.capture:
        time.sleep(args.settle)
        if args.expect and not any(n.get('resource-id') == args.expect for n in nodes()):
            raise SystemExit(f'Expected screen is not visible: {args.expect}')
        capture(args.capture)

if __name__=='__main__':main()
