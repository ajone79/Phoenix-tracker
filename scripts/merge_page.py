"""Append one fetched page (JSON array) to the accumulating table file; print the page's row count."""
import json, sys

out_path, page_path = sys.argv[1], sys.argv[2]
rows = json.load(open(out_path))
page = json.load(open(page_path))
assert isinstance(page, list), "expected a JSON array from Supabase"
rows.extend(page)
json.dump(rows, open(out_path, "w"))
print(len(page))
