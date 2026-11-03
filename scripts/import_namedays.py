"""Import a complete leap-year CZ nameday source; never patch individual names."""
import argparse, datetime as dt, json, re, time, urllib.request, urllib.error
from pathlib import Path
BASE = "https://tomasmotl.cz/api/jmeniny"
ROOT = Path(__file__).resolve().parents[1]
def validate(records):
    expected = {(dt.date(2024,1,1)+dt.timedelta(days=i)).strftime("%m-%d") for i in range(366)}
    if set(records) != expected:
        raise ValueError("Import must contain all 366 dates")
    for key,names in records.items():
        if not isinstance(names,list) or any(not isinstance(n,str) or not re.fullmatch(r"[A-Za-zÀ-ž -]{2,50}",n) for n in names):
            raise ValueError("Invalid names at "+key)
    return records
def apply(calendar, records, source):
    validate(records)
    for date, entry in calendar["cz"].items():
        entry["nameday"] = ", ".join(records[date[5:]])
        entry["nameday_status"] = "available"
        entry["nameday_source"] = source
    return calendar
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--apply",action="store_true")
    parser.add_argument("--snapshot",type=Path);args=parser.parse_args()
    if args.snapshot:
        snapshot=json.loads(args.snapshot.read_text());records=validate(snapshot["days"])
    else:
        cache=ROOT/"data/import-progress.json"
        records=json.loads(cache.read_text()) if cache.exists() else {}
        for i in range(366):
            date=dt.date(2024,1,1)+dt.timedelta(days=i)
            if date.strftime("%m-%d") in records:continue
            request=urllib.request.Request(BASE+"/"+date.isoformat(),headers={"User-Agent":"Eduvize calendar import"})
            for attempt in range(5):
                try:
                    with urllib.request.urlopen(request,timeout=20) as response: row=json.load(response)
                    break
                except urllib.error.HTTPError as error:
                    if error.code!=429 or attempt==4: raise
                    time.sleep(max(30,int(error.headers.get("Retry-After","60"))))
            if row.get("datum")!=date.isoformat() or not isinstance(row.get("jmena"),list):
                raise ValueError("Unexpected provider response: "+date.isoformat())
            records[date.strftime("%m-%d")]=row["jmena"]
            cache.parent.mkdir(exist_ok=True);cache.write_text(json.dumps(records,ensure_ascii=False))
            if i%60==0: print(f"Imported {i+1}/366",flush=True)
            time.sleep(1.1)
        validate(records)
        snapshot={"source":BASE,"documentation":"https://tomasmotl.cz/aplikace/jmeniny","retrieved":dt.datetime.now(dt.timezone.utc).isoformat(),"days":records}
        target=ROOT/"data/namedays-cz.json";target.parent.mkdir(exist_ok=True)
        target.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n")
        cache.unlink(missing_ok=True)
    if args.apply:
        target=ROOT/"calendar.json";calendar=json.loads(target.read_text())
        result=apply(calendar,records,snapshot["source"])
        temporary=target.with_suffix(".tmp")
        temporary.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n")
        temporary.replace(target)
    print("Complete nameday calendar validated",flush=True)
if __name__=="__main__":main()
