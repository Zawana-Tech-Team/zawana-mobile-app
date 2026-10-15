#!/usr/bin/env python3
"""Compare captured Android displays to flattened Figma references. QA only.

Produces an honest width-normalized overlay and side-by-side; no similarity score.
Phone mockup/status bar bounds should be measured and explicitly supplied.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--actual',type=Path,required=True)
p.add_argument('--reference',type=Path,required=True)
p.add_argument('--reference-crop',required=True,help='Measured inner display: left,top,right,bottom')
p.add_argument('--actual-crop',help='Measured app content: left,top,right,bottom')
p.add_argument('--out',type=Path,required=True)
a=p.parse_args()
ref=Image.open(a.reference).convert('RGB').crop(tuple(map(int,a.reference_crop.split(','))))
actual=Image.open(a.actual).convert('RGB')
if a.actual_crop:actual=actual.crop(tuple(map(int,a.actual_crop.split(','))))
ref=ref.resize((390,round(ref.height*390/ref.width)),Image.Resampling.LANCZOS)
actual=actual.resize((390,round(actual.height*390/actual.width)),Image.Resampling.LANCZOS)
a.out.mkdir(parents=True,exist_ok=False)
ref.save(a.out/'reference.png');actual.save(a.out/'actual.png')
height=min(ref.height,actual.height)
x=ref.crop((0,0,390,height));y=actual.crop((0,0,390,height))
Image.blend(x,y,.5).save(a.out/'overlay.png')
ImageChops.difference(x,y).save(a.out/'difference.png')
side=Image.new('RGB',(792,max(ref.height,actual.height)),'#EEEEEE')
side.paste(ref,(0,0));side.paste(actual,(402,0));side.save(a.out/'side-by-side.png')
print(a.out/'side-by-side.png')
