"""Check every preserved source file against the recorded SHA-256 digest."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
errors = []
for entry in manifest["files"]:
    path = (root / entry["path"]).resolve()
    if root not in path.parents:
        errors.append(f"Invalid path: {entry['path']}")
    elif not path.is_file():
        errors.append(f"Missing: {entry['path']}")
    else:
        data = path.read_bytes()
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            errors.append(f"Changed: {entry['path']}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"OK: {len(manifest['files'])} preserved source files match the archive manifest.")
