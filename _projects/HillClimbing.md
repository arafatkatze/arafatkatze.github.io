---
layout: page
title: A Practical Guide to Hill Climbing
description: Iterative improvement for AI coding agents
img:
importance: 2
category: work
---

When someone asks "what's your benchmark number?", most agent teams scramble. We did too. Over one weekend, we ran [Cline](https://cline.bot) against [Terminal Bench's](https://github.com/terminal-bench/terminal-bench) 89 real-world coding tasks, diagnosed every failure, and shipped targeted fixes. Our score went from **47% to 57%**, putting us ahead of Claude Code, OpenHands, and OpenCode.

This post is a practical guide to the process we used: **hill climbing**.

## What is hill climbing?

Hill climbing is dead simple. You run your AI coding agent on a standardized set of coding tasks, measure the score, change one thing—a prompt tweak, a bug fix, a config flag—run again, and keep the change only if the score goes up. If it goes down, you revert. Repeat.

That's it. No magic. Just disciplined iteration.

<!-- image: hill climbing loop diagram -->

## Why Terminal Bench?

Most coding agent evaluations are either single-turn or too saturated. Terminal Bench is different. They've created problems and verifiers that test the entire agentic flow—the full range of tasks your coding agent could perform—and grade the entire set of steps it takes. This is what makes it useful for hill climbing: you get meaningful signal on what's actually broken.

<!-- image: Terminal Bench overview / comparison -->

## Prerequisites

You'll need:
- **Python**
- **Docker** (or optionally Modal/Daytona)
- **uv**

## Harbor

The core tool here is [Harbor](https://github.com/cline/harbor), a widely-adopted agent evaluation framework built by the creators of Terminal Bench. Harbor abstracts away sandbox management, the agent loop, and rollout monitoring. A Harbor task is just a directory. The framework handles the full trial lifecycle: spinning up the sandbox, running the agent, verifying results, and tearing everything down.

Harbor can run dozens of evaluation tests in parallel, which is what makes the tight feedback loop of hill climbing practical. You make a change, kick off a run, and get results fast enough to iterate multiple times in a day.

<!-- image: Harbor architecture / terminal output -->

## The process

1. **Run your agent** on a standardized set of coding tasks
2. **Measure** the score
3. **Change one thing** (prompt tweak, bug fix, config flag)
4. **Run again**
5. **Keep** the change if the score improves; **revert** if it decreases
6. **Repeat**

<!-- image: score progression chart from 47% to 57% -->

We diagnosed every failure individually. Some were prompt issues, some were bugs in tool use, some were configuration gaps. Each fix was small and targeted. The discipline of changing one variable at a time is what makes the signal clean.

## This works with any agent

While we built this for Cline, the process works with any model/agent combination. You can hill climb with Claude Code, Codex, OpenHands, Cursor, Gemini CLI—any agent that can be plugged into Harbor.

<!-- image: supported agents logos -->

The evaluation dataset is also swappable. Terminal Bench is what we used, but Harbor supports different datasets for different optimization goals. Pick the one that matches the tasks your agent actually needs to handle.

## Read the full post

You can read the full blog post with all the details, code samples, and setup instructions at [cline.bot/blog/a-practical-guide-to-hill-climbing](https://cline.bot/blog/a-practical-guide-to-hill-climbing).
