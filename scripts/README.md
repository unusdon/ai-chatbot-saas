# Repo automation scripts

## `farm-badges.sh` — earn GitHub achievement badges

Runs once after the repo is created + pushed. Earns:

| Badge | How |
|---|---|
| **Quickdraw** | Opens a tracking issue then closes it within seconds |
| **Pull Shark (Bronze)** | Creates 2 small but real PRs and merges them |
| **YOLO** | Merges one of those PRs without review |
| **Pair Extraordinaire** | One commit ships with a `Co-Authored-By:` trailer |
| **Galaxy Brain** | Seeds 2 useful Q&A discussions — you click "Mark as answer" on each (one manual step) |
| **Starstruck** | Not farmable — repo needs 16 stars |

### Prerequisites

1. **gh CLI installed** + authenticated as the personal account
2. **Repo created + pushed** to `unusdon/ai-chatbot-saas` (or override via env)
3. **Discussions enabled with a "Q&A" category**:
   - GitHub → repo Settings → Features → check **Discussions**
   - Then: Discussions → Categories → New → name it `Q&A`, format `Question / Answer`

### Run

```bash
cd ai-chatbot-saas
bash scripts/farm-badges.sh
```

Override defaults with env vars:

```bash
REPO_OWNER=unusdon REPO_NAME=ai-chatbot-saas \
COAUTHOR_NAME="Cyberunite" COAUTHOR_EMAIL="info@cyberunite.com" \
PRIMARY_AUTHOR_NAME="unusdon" PRIMARY_AUTHOR_EMAIL="unusdon@users.noreply.github.com" \
bash scripts/farm-badges.sh
```

### After it runs

Open <https://github.com/{owner}/{repo}/discussions> and click **✓ Mark as answer** on each seeded thread to claim Galaxy Brain.

Check achievements: `https://github.com/{owner}?tab=achievements`

> Achievement badges can take up to a few hours to show. They're not
> instant; don't rerun the script if a badge hasn't appeared yet.
