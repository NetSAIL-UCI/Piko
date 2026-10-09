#!/usr/bin/env python3
"""Replace superseded runs in results/recomputed_20261008 with their reruns.
Reruns were made with the guarded players and correct trace bookkeeping, so they need no correction.
The old file moves to <proto>/_superseded/."""
import glob, os, re, shutil, sys
rerun = sys.argv[1]; base = "results/recomputed_20261008"; n = 0
for proto in ("hls", "lldash-gpac"):
    for f in glob.glob(f"{rerun}/{proto}_*/benchmark_{proto}_*.json"):
        stem = re.sub(r"_\d{8}_\d{6}\.json$", "", os.path.basename(f)[len(f"benchmark_{proto}_"):])
        setdir = os.path.basename(os.path.dirname(f))
        old = glob.glob(f"{base}/{proto}/{setdir}/benchmark_{proto}_{stem}_*.json")
        os.makedirs(f"{base}/{proto}/_superseded", exist_ok=True)
        for o in old: shutil.move(o, f"{base}/{proto}/_superseded/{os.path.basename(o)}")
        os.makedirs(f"{base}/{proto}/{setdir}", exist_ok=True)
        shutil.copy(f, f"{base}/{proto}/{setdir}/{os.path.basename(f)}"); n += 1
print(f"spliced {n} reruns")
