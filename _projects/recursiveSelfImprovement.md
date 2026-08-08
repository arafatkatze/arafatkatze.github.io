---
layout: page
title: Recursive Self Improvement for Coding Agents
description: How one prompt turned a 17-hour autonomous hill climb into an 88.8% state-of-the-art Terminal-Bench 2.1 score.
img: https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1786167515/site/recursive-self-improvement/hero.png
importance: 1
category: work
---

<div class="col-sm mt-3 mt-md-0 mx-auto">
    {% include figure.liquid
    path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1786167515/site/recursive-self-improvement/hero.png"
    alt="A coding agent reaching toward recursive self-improvement"
    class="img-fluid rounded z-depth-1" %}
</div>

*Published July 24, 2026 · Originally published on the [Cline Blog](https://cline.bot/blog/recursive-self-improvement-for-coding-agents).*

## Preface

[Recursive self-improvement](https://en.wikipedia.org/wiki/Recursive_self-improvement) is the idea that models can iterate and improve on themselves to unlock singularity. We have achieved a [version of that](https://www.anthropic.com/institute/recursive-self-improvement) at Cline.

In the past few days, the response to Kimi K3 has been incredible. Building on that momentum, we optimized its performance with Cline and achieved SOTA results on Terminal-Bench 2.1 using one-shot recursive self-improvement.

**We got an 88.8% score with the run costing $49.8.** That surpasses Fable 5 at less than a tenth of the price: Fable spent $552, and even GPT 5.6 Terra spent $400 on Tbench2.1.

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 760px;">
    {% include figure.liquid
    path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1786167516/site/recursive-self-improvement/terminal-bench-comparison.png"
    alt="Terminal-Bench 2.1 leaderboard comparing coding agents"
    class="img-fluid rounded z-depth-1" %}
</div>

Aside from the system prompt + a few nudges, this was entirely self-contained. A single prompt kicked off 17 hours of continuous coding agent run with GPT-5.6-Sol as the leader model. One billion tokens total: 400 million spent by the coding agent, 600 million by repeated eval runs. See the prompt [used here](https://gist.github.com/arafatkatze/fe7d3743315c80d5e3e8ab1bdef39903).

We could have done the [normal hill climbing we always do](https://cline.bot/blog/a-practical-guide-to-hill-climbing). Instead, the model made a PR on its own, a first-of-its-kind hill climb that turned a good score into a SOTA score. Note: We tried this experiment with Fable 5 too but its AI safety filter kept downgrading the model to Opus-4.8, and we simply gave up.

## Cline’s hill climbing experiences

Hill climbing isn't new to us as we've been doing evals and hill climbing at Cline for a while now. Back in January, we took Opus 4.5 from 47% to 57% on Terminal-Bench. That took a couple weeks of human work reading model traces, forming hypotheses, testing fixes, staring at failure logs until your eyes bled. In February we [published the playbook](https://cline.bot/blog/a-practical-guide-to-hill-climbing). It was a joint effort from 4 people on our engineering team.

Six months later, the harness and the models have both improved so much that this run was done by a single prompt from one engineer. Weeks of human work got converted into 17 hours of long running agent work. The trace-reading, the hypothesis-forming, the fix-testing all of it, covered by agents with a fixed goal and adaptable context window. At this point it's very clear to us that **the bottleneck isn't models but the humans using them.**

And our score isn't a consolation prize as Moonshot's own vendor-reported SOTA on Terminal-Bench 2.1 is 88.3%. We matched it with a general-purpose harness, on the first recursive campaign. The cost math and proof traces are attached [here](https://gist.github.com/arafatkatze/8ef2e3d452703fc2978715b40dff97fe).

First, we'll walk you through the step-by-step procedure of how the recursive run worked:

## The actual hill climb

Everything below ran off one prompt.

**We started with a baseline.** One full Terminal-Bench 2.1 run on stock Cline harness, Kimi K3 through OpenRouter and it costed **69/89 (77.5%) for $79.**

Instead of hill climbing by hand, we asked GPT-5.6 to write the prompt for us. We described how we normally climb this hill, and it turned that into a recursive self-improvement brief. The first draft was already comprehensive. We tightened it to cover the edge cases and pinned down a well-defined end state. The goal was modest: let it run for a while and see what happens. We had no expectation it would perform this well, yet here we are at a SOTA score. You can read the full prompt in this [github gist](https://gist.github.com/arafatkatze/fe7d3743315c80d5e3e8ab1bdef39903).

The agent worked in different experiments and tried them one by one, maintaining a record of what it had accomplished in a massive file so that it wouldn't run in circles:

**Experiment 0: max reasoning.** First finding: Cline didn’t represent K3's `max` reasoning effort as the harness silently collapsed it to `high`. The model fixed the abstraction. Not a score change, but a correctness fix that unblocked everything downstream. Commit `d1bc440`.

**Experiment 1: retry the 429s.** Five baseline failures were the same story: OpenRouter returned a 429 and Cline just gave up. Healthy sessions, killed by a single rate limit, since at the time there was a single provider serving Kimi K3 and capacity was tight. This was a boring fix of raising the number of retries with exponential backoff. On the diagnostic slice, all five losses flipped to passes. Commit `cabfa9e`.

**Experiment 2: smarter loop detection.** Two tasks died because Cline's loop detector killed agents that were *legitimately* polling long-running background work. Same command, but the output was changing so that's actual progress, not a loop. The model made the detector output-aware. Both tasks flipped. Commit `dbcdba8`.

**Experiment 3: the 7.6-second ghost failure.** One task exited in 7.6 seconds with zero tokens and no session. The model reduced it to a wild root cause: any prompt containing `@a`-style tokens triggered a file-mention lookup on an unreferenced async worker, and the process legally exited before the model was ever called. This was a one-line liveness fix leading to a deterministic flip. Commit `289cb82`.

**Experiment 4: stopping task suicides.** Two tasks failed because the agent ran `pkill -f` with a pattern that matched *its own harness command line*, so it terminated itself mid-task. The fix: tool guidance to track PIDs instead of broad pattern-kills. Both flipped. Commit `23d5970`.

**Then the full runs:** The combined candidate scored **77/89 (86.5%) at $65** now up 8 tasks from baseline. The confirmation run landed **79/89 (88.8%) at $49.8**. So we had a higher score and lower cost, with fewer wasted tokens on doomed retries and self-kills.

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 760px;">
    {% include figure.liquid
    path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1786167517/site/recursive-self-improvement/score-progression.png"
    alt="Kimi K3 and Cline score progression on Terminal-Bench 2.1"
    class="img-fluid rounded z-depth-1" %}
</div>

**What worked:** retries, output-aware loop detection, the indexing liveness fix, process-kill work to improve the score. Every fix was a general harness improvement, nothing necessarily benchmark-specific or fake reward hacking.

**What didn't work:** the max-reasoning fix never got causal credit (OpenRouter was already mapping to K3's only supported effort). The pkill guidance reduced but didn't eliminate broad-match commands. Two confirmation runs got invalidated and thrown away when we accidentally terminated the orchestrator: reported, excluded, rerun. There were other experiments where it was clear that the model's low score was a genuine model limitation.

**Human intervention was nearly zero.** The whole campaign ran ~17 hours off a single prompt. Our job was mostly babysitting the agent every couple of hours and pressing continue when the agent stopped by accident. We ran this on a cloud VM to keep the agent running forever.

**Reward hacking was avoided by design:** The first result was good enough that our immediate suspicion was reward hacking, It wasn't. The prompt banned it explicitly as there were no verifier edits, task-name detection or timeout inflation.

To our surprise, the guardrails from the prompt held. The model even policed itself, recording attribution guards and excluding invalidated runs from its own scores. The final backstop is fully human: we reviewed the [full PR](https://github.com/cline/cline/pull/12465) before merging.

## Costs and traces

Overall we spent roughly a billion tokens and $680 for this experiment. This is still a lot cheaper than weeks of an engineer's time and the opportunity cost. This is why we still think spending real money on frontier models like Kimi K3 is an investment that's absolutely worth it for certain kinds of tasks. In this case the leader was GPT-5.6-Sol. We wish we could have used Fable, but as mentioned above, its safety filter repeatedly blocked us from doing AI evals research. It's also likely we would have spent a lot more money using Fable. You can view all the traces, code and the entire cost breakdown on this [github gist](https://gist.github.com/arafatkatze/8ef2e3d452703fc2978715b40dff97fe).

Cline is the best harness to run Kimi K3. We matched the SOTA score from Moonshot's official Kimi harness. With [ClinePass](https://cline.bot/cline-pass) you get subsidized inference on it: $9.99/month for curated open-weight models (Kimi K3, DeepSeek, GLM, MiniMax, Qwen) with 2–5x standard API rate limits and no separate provider keys. Give it a go.

## What happens next

Recursive self-improvement is no longer a sci-fi experiment, and we are very glad that frontier models are making it possible for something as intricate and time-consuming as AI evals. We are now making it a standard process for new model releases at Cline: an immediate baseline run, then RSI-styled prompts to get the best out of every model. We encourage everyone to push the models with more and more long-running tasks.
