---
layout: page
title: DeepSeek wins IMO Gold on 12 cents
description: DeepSeek V4 Flash scored 30/42 on IMO 2026 in Cline, clearing the gold cutoff for $0.12 — about 140 times cheaper than Claude Fable 5.
img: https://storage.ghost.io/c/d6/fe/d6feb101-a8e6-444b-bae8-3ca714794abb/content/images/2026/08/DeepSeek-wins-IMO-Gold-on-12-cents.png
importance: 1
category: work
permalink: /projects/deepseek-wins-imo-gold-on-12-cents/
---

<div class="col-sm mt-3 mt-md-0 mx-auto">
    {% include figure.liquid
    path="https://storage.ghost.io/c/d6/fe/d6feb101-a8e6-444b-bae8-3ca714794abb/content/images/2026/08/DeepSeek-wins-IMO-Gold-on-12-cents.png"
    alt="DeepSeek wins IMO Gold on 12 cents"
    class="img-fluid rounded z-depth-1" %}
</div>

*Published August 26, 2026 · Originally published on the [Cline Blog](https://cline.bot/blog/deepseek-wins-imo-gold-on-12-cents).*

We wanted to know the cheapest possible way to win an IMO gold medal, so we ran eight models against IMO 2026 problems in Cline and had the proofs graded blind.

The answer was **12 cents**.

Frontier models scoring perfect runs has been covered extensively. Our interesting find is that open-weight models now score gold too. Our DeepSeek V4 Flash run hit 30/42, clearing the 29-point gold cutoff. This was roughly 140 times cheaper than Claude Fable 5. In this post, we explore the problem setup and judging, and share all the traces from these runs.

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 760px;">
    {% include figure.liquid
    path="https://storage.ghost.io/c/d6/fe/d6feb101-a8e6-444b-bae8-3ca714794abb/content/images/2026/08/scores-and-selected-prices.webp"
    alt="IMO 2026 scores and selected prices across eight models"
    class="img-fluid rounded z-depth-1" %}
</div>

## Problem Setup

The original benchmark was an 8 × 6 matrix: eight models and six IMO 2026 problems, making a total of 48 effective cells.

- GPT-5.6 Sol
- Claude Fable 5
- Kimi K3
- DeepSeek V4 Flash
- Qwen 3.6 35B A3B
- DeepSeek V4 Pro
- GLM 5.2
- MiMo V2.5 Pro

Each model received the problem statement and one instruction to submit its strongest complete final solution. A submission tool was used to finish the run.

After the original symmetric panel revealed some harness bugs, we fixed the tool-calling issues within the Cline harness to give every model its best shot at scoring, so that any lost points reflect actual model performance rather than tool-calling failures.

### Judging

The proofs were graded anonymously on the IMO 0–7 scale. Two independent, model-blind graders, GPT‑5.5 and Claude Opus 5, scored each submission, and disagreements were resolved by Gemini 3.1 Pro. GPT-5.6 Sol remained the reference perfect scorer at 42/42. Other groups have independently reproduced that perfect score [here](https://www.linkedin.com/posts/akashnil-dutta-72894a100_imo-2026-performance-by-chatgpt-56-pro-activity-7483603460488273922-g1Yh/), [here](https://github.com/deedy/imo-2026), and [here](https://www.linkedin.com/posts/eugene-nazirov_the-headline-is-the-4242-imo-score-the-activity-7487441869992267776-OmY9/) (although their harness settings differ from ours). The gold medal score cutoff [this year was 29](https://www.imo-official.org/results/individual/year/2026/).

Each candidate proof was placed into an immutable anonymous batch. The graders saw the problem, proof, rubric, and comparison reference (including Lean solutions), but not the candidate model's identity, to avoid bias. They checked that the IMO scoring rules were followed and that the final results passed validation.

Reward-hacking guardrails included disabling internet use in the system prompt and exposing only the submit-solution tool. No prior context about the problems like Lean artifacts, rationales, etc. was provided, so each model had to rely on its own ability. We also checked traces to make sure no browser use was done. And since the IMO 2026 problems are new, they aren't in these models' training sets yet.

One caveat is that IMO problems, unlike a traditional coding benchmark, are not a stable population estimate: small changes like prompt tweaks, retries, and provider issues (for open-weight models) can shift the scores a bit. We ran multiple attempts for all models and picked the best score on each problem rather than using standard measures like Pass@k. Note that the prices in the table below reflect the single best run for each model, not the net cost of all the exploration needed to work through tool-calling issues.

In general, variance of results is always something to keep in mind with any benchmark. We used an LLM as a judge instead of unit tests (math olympiad problems often don’t come with unit tests) or a formal Lean grader. You can look at unofficial Lean solutions [here](https://github.com/AxiomMath/IMO2026).

As promised, we have attached all the solution traces from the different models [here](https://gist.github.com/arafatkatze/fc08975b473205e52f272d4e7b2ad4b1); these traces include prices, generation costs, and the solutions offered by each model.

## Model Scores and Prices

| Model | Best score | P1–P6 | Price |
| --- | --- | --- | --- |
| GPT-5.6 Sol | **42/42** | 7 · 7 · 7 · 7 · 7 · 7 | **$3.2336** |
| Claude Fable 5 | **41/42** | 7 · 7 · 6 · 7 · 7 · 7 | **$17.1956** |
| Kimi K3 | **35/42** | 7 · 4 · 7 · 7 · 7 · 3 | **$5.1328** |
| DeepSeek V4 Flash | **30/42** | 7 · 4 · 3 · 7 · 7 · 2 | **$0.1215** |
| DeepSeek V4 Pro | **30/42** | 7 · 4 · 2 · 7 · 7 · 3 | **$0.4761** |
| MiMo V2.5 Pro | **30/42** | 7 · 2 · 3 · 7 · 7 · 4 | **$1.0650** |
| GLM 5.2 | **21/42** | 7 · 0 · 0 · 7 · 7 · 0 | **$2.3855** |
| Qwen 3.6 35B A3B | **16/42** | 7 · 2 · 1 · 2 · 3 · 1 | **$0.2251** |
| [IMO 2026 human median](https://www.imo-official.org/results/individual/year/2026/) | 16/42 | 7 · 1 · 0 · 7 · 2 · 0 | High school social life |

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 760px;">
    {% include figure.liquid
    path="https://storage.ghost.io/c/d6/fe/d6feb101-a8e6-444b-bae8-3ca714794abb/content/images/2026/08/score-vs-cost.webp"
    alt="IMO 2026 score versus cost for each model"
    class="img-fluid rounded z-depth-1" %}
</div>

### History of AI models in IMO

Originally, in 2024, DeepMind's custom AlphaProof models (which were not released to the public) got an IMO silver, and back then the problems were converted to Lean. The models solved one problem within minutes and took up to three days to solve the others; note that humans solved the problems over two days, in sessions of 4.5 hours each.

In 2025, an advanced version of Gemini Deep Think achieved a gold medal score working directly from the official natural-language problem descriptions.

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 760px;">
    {% include figure.liquid
    path="https://storage.ghost.io/c/d6/fe/d6feb101-a8e6-444b-bae8-3ca714794abb/content/images/2026/08/Gemini-achieved-gold-medal-level-in-the-International-Mathematical-Olympiad.jpg"
    alt="Gemini achieved gold medal level in the International Mathematical Olympiad"
    class="img-fluid rounded z-depth-1" %}
</div>

{% twitter https://x.com/demishassabis/status/1947337615054671882 %}

In 2026, we have made great progress in IMO and other math olympiad problem solving. For starters, we have migrated to much better mathematical benchmarks like [Riemann bench](https://arxiv.org/abs/2604.06802), which are far more intricate and long-horizon, and models are now able to solve many [unsolved Erdos problems](https://openai.com/index/model-disproves-discrete-geometry-conjecture/). There are many other interesting solutions to math problems like [Hadamard matrices](https://x.com/__alpoge__/status/2087504785952182273) and the [Jacobian conjecture](https://x.com/__alpoge__/status/2079028340955197566) that were released this year, but there’s something very special that came from the open-weights community.

### What's unique about DeepSeek V4 Flash

The most important part of the progress this year has been an order-of-magnitude improvement in the performance of open-weight models. Notably, DeepSeek V4 Flash isn’t post-trained specifically for Olympiad problems we hit the model endpoint directly and still got a gold medal. It has 284B total MoE parameters, with about 13B activated per token. While it's not exactly a small model, it's much, much smaller than the multi-trillion-parameter models used in previous years. DeepSeek V4 Flash is the only model (so far) that can be run on small local GPU setups and still win an IMO gold. This is a huge testament to the capacity of open-weight models, both pushing the frontier of intelligence and offering the best price point.

We are calling it now that IMO 2027 problems will get solved by local LLMs running on your phone and the future of software and mathematics is [open-weight AI](https://cline.bot/cline-pass).

### Reference Links

- [Official IMO 2026 problem page](https://www.imo-official.org/problems/2026/)
- [Complete Cline Solutions trace index](https://gist.github.com/arafatkatze/fc08975b473205e52f272d4e7b2ad4b1)
- [Complete 3.2 MB evidence archive](https://cline-imo-2026-public-traces-298579054527.s3.us-west-2.amazonaws.com/sdk-native-max-opt8-best-observed-v1/2026-08-24-r1/sdk-native-max-opt8-best-observed-v1-20260824-r1.tar.gz)
- [IMO 2026 Lean Solutions](https://github.com/AxiomMath/IMO2026)

You can read the original blog post at [cline.bot/blog/deepseek-wins-imo-gold-on-12-cents](https://cline.bot/blog/deepseek-wins-imo-gold-on-12-cents).
