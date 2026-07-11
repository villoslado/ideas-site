"""
Merge the three model idea files + score + cross-evaluation files from the
jobs-replica project into a single public/data.json for the ideas-site.

Produces one flat object per idea (405 total) with self-top25, cross-evaluation,
and high-conviction flags resolved.

Run:
    python scripts/merge_data.py
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.dirname(HERE)
# jobs-replica is a sibling of ideas-site under ~/Projects.
JOBS_DIR = os.path.abspath(os.path.join(SITE_ROOT, "..", "jobs-replica"))
OUTPUT = os.path.join(SITE_ROOT, "public", "data.json")

# source_model -> (ideas file, cross-evaluation file that judged this model).
#   fable5   ideas are cross-judged by Sol
#   grok45   ideas are cross-judged by Fable
#   gpt56sol ideas are cross-judged by Grok
MODELS = [
    ("fable5", "ideas_fable5.json", "ideas_cross_sol_judges_fable.json"),
    ("grok45", "ideas_grok45.json", "ideas_cross_fable_judges_grok.json"),
    ("gpt56sol", "ideas_gpt56sol.json", "ideas_cross_grok_judges_sol.json"),
]


def load(name):
    with open(os.path.join(JOBS_DIR, name)) as f:
        return json.load(f)


def build_title_to_slug():
    """Occupation title -> canonical slug, from any score file."""
    return {e["title"]: e["slug"] for e in load("scores_fable5.json")}


def slugify(title, title_to_slug):
    if title in title_to_slug:
        return title_to_slug[title]
    return "".join(c if c.isalnum() else "-" for c in title.lower()).strip("-")


def main():
    title_to_slug = build_title_to_slug()
    scores_by_key = {s["idea_key"]: s for s in load("scores_ideas.json")}

    merged = []
    for source_model, ideas_file, cross_file in MODELS:
        data = load(ideas_file)
        all_ideas = data.get("all_ideas") or []
        self_top25 = data.get("top_25") or []

        # Self top-25 keyed by (product_name, occupation).
        self_by_key = {
            (t.get("product_name"), t.get("occupation")): t for t in self_top25
        }

        cross = load(cross_file)
        cross_judge = cross.get("judge_model")
        cross_by_key = {
            (c.get("product_name"), c.get("occupation")): c
            for c in (cross.get("top_25") or [])
        }

        for idea in all_ideas:
            occupation = idea.get("occupation", "")
            slug = slugify(occupation, title_to_slug)
            idea_key = f"{source_model}_{slug}_{idea.get('idea_number')}"
            score = scores_by_key.get(idea_key, {})

            pn_occ = (idea.get("product_name"), occupation)
            self_entry = self_by_key.get(pn_occ)
            is_self = self_entry is not None

            cross_entry = cross_by_key.get(pn_occ)
            is_cross = cross_entry is not None

            merged.append({
                "idea_key": idea_key,
                "source_model": source_model,
                "product_name": idea.get("product_name", ""),
                "one_liner": idea.get("one_liner", ""),
                "what_it_does": idea.get("what_it_does", ""),
                "buyer": idea.get("buyer", ""),
                "how_they_find_you": idea.get("how_they_find_you", ""),
                "pricing": idea.get("pricing", ""),
                "biggest_risk": idea.get("biggest_risk", ""),
                "excitement_score": idea.get("excitement_score", 0),
                "occupation": occupation,
                "model_consensus": idea.get("model_consensus", ""),
                "idea_number": idea.get("idea_number", 0),
                "field": score.get("field", "other"),
                "build_size": score.get("build_size", "m"),
                "outreach_size": score.get("outreach_size", "m"),
                "is_self_top25": is_self,
                "why_top_25": self_entry.get("why_top_25") if is_self else None,
                "is_cross_top25": is_cross,
                "cross_judge_model": cross_judge if is_cross else None,
                "cross_excitement": cross_entry.get("your_excitement") if is_cross else None,
                "cross_why_selected": cross_entry.get("why_selected") if is_cross else None,
                "is_high_conviction": bool(is_self and is_cross),
            })

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(merged, f, indent=2)

    total = len(merged)
    self_n = sum(1 for m in merged if m["is_self_top25"])
    cross_n = sum(1 for m in merged if m["is_cross_top25"])
    hc_n = sum(1 for m in merged if m["is_high_conviction"])
    missing_score = sum(1 for m in merged if m["idea_key"] not in scores_by_key)

    print(f"Wrote {total} ideas to {OUTPUT}")
    print(f"  self_top25:       {self_n}")
    print(f"  cross_top25:      {cross_n}")
    print(f"  high_conviction:  {hc_n}")
    if missing_score:
        print(f"  WARNING: {missing_score} ideas had no matching score row")

    by_model = {}
    for m in merged:
        by_model[m["source_model"]] = by_model.get(m["source_model"], 0) + 1
    print(f"  by source model:  {by_model}")


if __name__ == "__main__":
    main()
