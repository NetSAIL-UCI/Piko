#!/usr/bin/env python3
"""Move suspect results (and their logs) out of a results tag so the dispatcher
treats them as not-yet-run and redoes them. Nothing is deleted.

  quarantine_runs.py <results/tag> <protocol> --shaper-timeouts   # log says /startShaping failed
  quarantine_runs.py <results/tag> <protocol> --all <reason>      # e.g. whole batch ran on a saturated host
"""
import argparse, glob, os, re, shutil
ap = argparse.ArgumentParser()
ap.add_argument("tag_dir"); ap.add_argument("protocol")
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument("--shaper-timeouts", action="store_true")
g.add_argument("--all", metavar="REASON")
a = ap.parse_args()
reason = "shaper_timeout" if a.shaper_timeouts else re.sub(r"\W+", "_", a.all)
qdir = os.path.join(a.tag_dir, f"_rejected_{reason}"); moved = 0
for lf in glob.glob(os.path.join(a.tag_dir, "logs", f"{a.protocol}_*.log")):
    stem = os.path.basename(lf)[len(a.protocol) + 1:-4]
    if a.shaper_timeouts and "could not reach /startShaping" not in open(lf, errors="ignore").read():
        continue
    js = glob.glob(os.path.join(a.tag_dir, f"{a.protocol}_*", f"benchmark_{a.protocol}_{stem}_*.json"))
    if not js and not a.all:
        continue
    os.makedirs(os.path.join(qdir, "logs"), exist_ok=True)
    for j in js:
        d = os.path.join(qdir, os.path.basename(os.path.dirname(j))); os.makedirs(d, exist_ok=True)
        shutil.move(j, os.path.join(d, os.path.basename(j)))
    shutil.move(lf, os.path.join(qdir, "logs", os.path.basename(lf))); moved += 1
print(f"quarantined {moved} {a.protocol} runs -> {qdir}")
