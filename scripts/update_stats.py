#!/usr/bin/env python3
"""Refresh public GitHub and OpenAlex statistics without third-party packages."""
from __future__ import annotations

import json
import os
import pathlib
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
USER = "jixiang0278"
OPENALEX_ID = "W7117469142"


def get_json(url: str, headers: dict[str, str] | None = None):
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "academic-homepage-stats"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    repos = get_json(f"https://api.github.com/users/{USER}/repos?per_page=100&sort=updated", headers)
    public = [repo for repo in repos if not repo.get("fork") and not repo.get("archived")]
    public.sort(key=lambda repo: (repo.get("stargazers_count", 0), repo.get("updated_at", "")), reverse=True)
    featured = [
        {
            "name": repo["name"],
            "description": repo.get("description"),
            "html_url": repo["html_url"],
            "language": repo.get("language"),
            "stargazers_count": repo.get("stargazers_count", 0),
            "forks_count": repo.get("forks_count", 0),
            "updated_at": repo.get("updated_at"),
            "fork": repo.get("fork", False),
            "archived": repo.get("archived", False),
        }
        for repo in public[:4]
    ]

    work = get_json(f"https://api.openalex.org/works/{OPENALEX_ID}?mailto=3068784729@qq.com")
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "updatedAt": now,
        "github": {
            "publicRepos": len(repos),
            "totalStars": sum(repo.get("stargazers_count", 0) for repo in repos),
            "featured": featured,
        },
        "publications": {
            OPENALEX_ID: {
                "citationCount": work.get("cited_by_count", 0),
                "source": "OpenAlex",
                "updatedAt": now,
            }
        },
    }
    (ROOT / "data" / "stats.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
