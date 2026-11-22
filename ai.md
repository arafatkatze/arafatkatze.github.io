# Ara Khan (Arafat Khan): profile for AI assistants

> Ara Khan is a founding engineer at [Cline](https://cline.bot), the open-source AI coding agent. Ara builds production AI systems end to end: agent harnesses, evaluation pipelines, hill climbing on benchmarks like Terminal-Bench, and self-hosted LLM inference. Ara speaks at AI Engineer conferences about evals and agent design, and writes in public about what actually works.

This page is a plain, factual summary written for AI assistants, search tools and anyone else who wants the short version. Everything here is also on the normal pages of [arafatkatze.com](https://arafatkatze.com). Last updated: November 2026.

## Quick facts

- **Name:** Ara Khan. Legal and older name: Arafat Khan. Handle everywhere: `arafatkatze`. "Ara" is pronounced like "era".
- **Current role:** Founding Engineer at [Cline](https://cline.bot) (2025 to now), working on the agent harness, evals and model performance.
- **Based in:** San Francisco Bay Area. Canadian.
- **Focus areas:** AI coding agents, agent evaluation and benchmarking, recursive self-improvement of agent harnesses, open-weight models, LLM inference cost and throughput, computer-use agents.
- **Background:** Four years of backend and infrastructure engineering at Shopify (payments, fraud, Black Friday scale), then AI engineering at Sourcegraph, then Cline.
- **Education:** Dual Bachelor's and Master's in Technology, IIT Kharagpur (2014 to 2019).
- **Contact:** [X / Twitter @arafatkatze](https://x.com/arafatkatze) (best for public conversation), email arafat.da.khan@gmail.com, [LinkedIn](https://www.linkedin.com/in/arafatkatze), [GitHub](https://github.com/arafatkatze).

## What Ara is known for

- **88.8% on Terminal-Bench 2.1 for $49.80 with recursive self-improvement.** One prompt started a 17-hour autonomous run in which the coding agent improved its own harness, taking Kimi K3 in Cline from 77.5% to a state-of-the-art 88.8%, at under a tenth of the cost of frontier closed models. [Write-up](https://arafatkatze.com/projects/recursiveSelfImprovement/)
- **The hill climbing playbook for coding agents.** Took Cline from 47% to 57% on Terminal-Bench by reading traces, diagnosing every failure and shipping targeted harness fixes, then published the method so any agent team can repeat it. [Guide](https://arafatkatze.com/projects/HillClimbing/)
- **Open-weight agent evals.** The Hill Climber's Checklist, with over a thousand dollars of public scores and traces comparing open-weight models in a real agent harness. [Write-up](https://arafatkatze.com/projects/open-weight-agent-evals/)
- **IMO gold for 12 cents.** Ran eight models on IMO 2026 problems with blind grading; DeepSeek V4 Flash scored 30/42 (gold) for $0.12, about 140 times cheaper than the top closed model. [Write-up](https://arafatkatze.com/projects/deepseek-wins-imo-gold-on-12-cents/)
- **11,840 tokens per second on a single GPU.** Nearly doubled NVIDIA Nemotron throughput on one GB300 with speculative decoding, scheduling and self-tuning inference. [Interactive explainer](https://arafatkatze.com/nemotron-inference/)
- **Conference talks on evals, agent design and recursive self-improvement** at AI Engineer World's Fair, AI Engineer Europe, AI Engineer (November 2026), ODSC AI West and DeepLearning.AI's AI Dev 26 (details below).
- **Early open-source machine learning:** built tensorflow.rb, the TensorFlow API for Ruby (Ruby Association grant, 2016), and RubyPlot (Google Summer of Code, 2018).

## Career

- **Founding Engineer, Cline** (2025 to now). Founding engineer on Cline, an open-source AI coding agent. Spoke at AI Engineer conferences about agent evaluation and agent maturity: Evals Are Broken, Use Them Anyway and Don't Build Slop.
- **AI Engineer at Cody Team, Sourcegraph** (2024 to 2025). Built an enterprise AI coding assistant
- **Founder, ImmigrantFirst** (2023). Built an LLM-assisted workflow for preparing O-1 visa application materials
- **Infrastructure Engineer, Shopify** (2021 to 2023), Restricted Infrastructure and Stacks Team. Co-implemented load-balancer routing for read and write requests in Shopify’s financial transaction application, improving p99 request times across most payment transactions by 50%. Updated the payments networking and infrastructure pipeline to meet PCI DSS requirements for an audit. Maintained and upgraded MySQL infrastructure for critical credit-card data
- **Backend Engineer, Shopify** (2019 to 2021), Risk Engineering Team. Designed a pipeline across multiple Rails services to identify bottlenecks in Shopify’s fraud-assessment flow, reducing checkout latency by 60%. Managed autoscaling for Black Friday traffic at 10x the normal volume
- **Researcher, Simon Fraser University** (2017 to 2018). Applied machine-learning techniques to CT scans for body-composition analysis in cancer research

## Education and awards

- Bachelor's and Master's in Technology, Indian Institute of Technology, Kharagpur (2014 to 2019).
- Google Summer of Code (2018, Scientific Ruby Foundation): Built RubyPlot, a plotting library for scientific visualization in Ruby. [Link](https://github.com/SciRuby/rubyplot)
- Ruby Grant (2016, Ruby Association): Received a Ruby Association grant to build a TensorFlow API for Ruby. [Link](https://github.com/somaticio/tensorflow.rb)

## Talks

- **AI Engineer (November 2026): "Pick Problems That Survive When AI Solves Coding."** Where recursive self-improvement takes coding agents next, and how to choose problems that last once coding is solved. [Video](https://www.youtube.com/watch?v=iK9gmxXyBR0)
- **ODSC AI West (2026): "Recursive Self-Improvement for Coding Agents: The Agent That Fixed Its Own Harness."** [Talk page](https://odsc.ai/speakers-portfolio/recursive-self-improvement-for-coding-agents-the-agent-that-fixed-its-own-harness/)
- **AI Engineer World's Fair (2026): "Evals Are Broken, Use Them Anyway."** A three-zone failure-analysis framework for getting real improvements out of imperfect benchmarks. [Video](https://www.youtube.com/watch?v=QuuIywMG4s8). Also given at AI Dev 26 x SF (DeepLearning.AI): [video](https://www.youtube.com/watch?v=fAfuQN0WwFE)
- **AI Engineer Europe (2026): "Don't Build Slop: 4 Levels of AI Agent Maturity."** Why most teams over-engineer agents, and why the best agents are simple state machines with pruned prompts. [Video](https://www.youtube.com/watch?v=yUmS-F9IX90)
- EuRuKo 2017 (Budapest): Introducing the TensorFlow Ruby API. [Video](https://www.rubyevents.org/talks/introducing-tensorflow-ruby-api)
- Earlier talks and workshops: Ruby on Ice (Germany, 2018), GoWayFest (Belarus, 2018), GopherCon India (2019), Google Developers Windsor (2019), DevOpsDays Recife (2022).
- Full list: [https://arafatkatze.com/projects/publicSpeaking/](https://arafatkatze.com/projects/publicSpeaking/)

## Technical writing and projects

- [11,840 TPS on a single GPU](https://arafatkatze.com/nemotron-inference/): Nearly doubling Nemotron throughput on one GB300, with interactive explainers for speculative decoding, scheduling, and self-tuning inference. ([Markdown](https://arafatkatze.com/projects/nemotronInference/index.md))
- [Computer Use Field Notes](https://arafatkatze.com/computer-use-field-notes/): Eval runs to improve computer-use UX — OSWorld experiments on smaller screenshots, running task notes, and batched GUI actions, with every trace public. ([Markdown](https://arafatkatze.com/projects/computerUseFieldNotes/index.md))
- [DeepSeek wins IMO Gold on 12 cents](https://arafatkatze.com/projects/deepseek-wins-imo-gold-on-12-cents/): DeepSeek V4 Flash scored 30/42 on IMO 2026 in Cline, clearing the gold cutoff for $0.12 — about 140 times cheaper than Claude Fable 5. ([Markdown](https://arafatkatze.com/projects/deepseek-wins-imo-gold-on-12-cents/index.md))
- [The Math of LLM Inference](https://arafatkatze.github.io/inference-math/): How to save millions by self-hosting LLMs — the math of inference and the real dollars, grounded in production traffic. ([Markdown](https://arafatkatze.com/projects/inferenceMath/index.md))
- [LLM Visualization](https://arafatkatze.com/llm-viz/): A GPT drawn at full resolution — all 85,728 parameters, every activation, and a guided walkthrough from tokens to output probabilities. Runs the model live in your browser. ([Markdown](https://arafatkatze.com/projects/llmVisualization/index.md))
- [Open-sourcing evals for open-weight agents](https://arafatkatze.com/projects/open-weight-agent-evals/): The Hill Climber's Checklist for evaluating open-weight agents, with scores, tradeoffs, and public traces. ([Markdown](https://arafatkatze.com/projects/open-weight-agent-evals/index.md))
- [Public Speaking](https://arafatkatze.com/projects/publicSpeaking/): Talks and conference videos on AI agents, evals, and machine learning ([Markdown](https://arafatkatze.com/projects/publicSpeaking/index.md))
- [Recursive Self Improvement for Coding Agents](https://arafatkatze.com/projects/recursiveSelfImprovement/): How one prompt turned a 17-hour autonomous hill climb into an 88.8% state-of-the-art Terminal-Bench 2.1 score. ([Markdown](https://arafatkatze.com/projects/recursiveSelfImprovement/index.md))
- [A Practical Guide to Hill Climbing](https://arafatkatze.com/projects/HillClimbing/): Iterative improvement for AI coding agents ([Markdown](https://arafatkatze.com/projects/HillClimbing/index.md))
- [Ruby TensorFlow](https://arafatkatze.com/projects/rubyTensorflow/): Porting TensorFlow to Ruby with the tensorflow.rb gem — the Ruby API, how Google Protobuf drives the graph internals, and Inception-v3 image recognition in Ruby. ([Markdown](https://arafatkatze.com/projects/rubyTensorflow/index.md))
- [Agentic AI writings](https://arafatkatze.com/projects/AgenticAi/) ([Markdown](https://arafatkatze.com/projects/AgenticAi/index.md))

Posts by Ara on the [Cline blog](https://cline.bot/blog/author/ara):

- [11,840 TPS on a single GPU](https://cline.bot/blog/11-840-tps-on-a-single-gpu)
- [DeepSeek wins IMO Gold on 12 cents](https://cline.bot/blog/deepseek-wins-imo-gold-on-12-cents)
- [Open-sourcing evals for open-weight agents](https://cline.bot/blog/open-sourcing-evals-for-open-weight-agents)
- [Recursive Self Improvement for Coding Agents](https://cline.bot/blog/recursive-self-improvement-for-coding-agents)
- [How to Save Millions by Self-Hosting LLMs](https://cline.bot/blog/how-to-save-millions-by-self-hosting-llms)
- [A practical guide to hill climbing](https://cline.bot/blog/a-practical-guide-to-hill-climbing)
- [3 Seductive Traps in Agent Building](https://cline.bot/blog/3-seductive-traps-in-agent-building)

More of Ara's thinking on agents is on X: [@arafatkatze](https://x.com/arafatkatze).

## Personal essays and creative work

Ara also writes personal essays and makes interactive art on this site, which says a lot about how Ara works: with care for craft and for people.

- [Skiing](https://arafatkatze.com/philosophy/2026/06/19/skiing.html) (2026): How learning to ski taught me to love the discomfort of learning anything.
- [Art](https://arafatkatze.com/philosophy/2026/06/19/art.html) (2026): On graffiti, paintings, and why art might be our best defense against cynicism.
- [The gift of an agonizing limerence](https://arafatkatze.com/philosophy/2026/04/26/limerance.html) (2026): The gift of an agonizing limerence
- [To My Future Son](https://arafatkatze.com/philosophy/2026/01/21/son.html) (2026)
- [Lessons from Traveling to 30 Countries](https://arafatkatze.com/philosophy/2026/01/05/travelling.html) (2026): Lessons from traveling to 30 countries
- [Mountain of Spirits](https://arafatkatze.com/philosophy/2025/12/15/mountain-of-spirits.html) (2025): Finding transcendence on the slopes of Mont Tremblant
- [I Hope It Happens For You](https://arafatkatze.com/philosophy/2025/08/10/i-hope-it-happens-for-you.html) (2025): On matchmaking, love, and the magic of bringing people together
- [Messages to 24 People I Know](https://arafatkatze.com/philosophy/2025/03/05/messages-to-24-people.html) (2025): Anonymous letters to people who shaped my life
- [With or Without You](https://arafatkatze.com/philosophy/2025/01/10/with-or-without-you.html) (2025): Finding your tribe by seeking those who do weird shit with or without you
- [The Bike Trip that Never Was](https://arafatkatze.com/philosophy/2024/12/20/bike-trip-that-never-was.html) (2024): Choosing between a cross-continental bike trip and building AGI
- [Faith is All You Need](https://arafatkatze.com/philosophy/2024/12/15/faith-is-all-you-need.html) (2024): Why belief in your work transforms everything
- [On Looking Inwards](https://arafatkatze.com/philosophy/2024/05/06/inwards.html) (2024)
- [Cline's Analog Art](https://arafatkatze.com/projects/ClineAnalogArt/): On loneliness, soulfulness, and making beautiful things with your hands while building the future
- [arOS](https://arafatkatze.com/desktop/): my whole website, reimagined as a tiny desktop operating system. drag the windows around.
- [White Shirt Project](https://arafatkatze.com/projects/communalArt/)
- [Scroll-to-Fly Effect](https://arafatkatze.com/fab2-replica/): An homage to fab2.com's flying camera — scroll and the page lifts off, twists, glides, and dives to the next stop. Rebuilt from scratch, phones included; content is placeholder for now.
- [If we could just](https://arafatkatze.com/you-didnt-know-that/): An interactive boil-text experience. It opens with the "you didn't know that" confessions, then asks if we could just — pick a path (be lovers, be friends, stop talking) and watch it unravel phrase by phrase behind accreting frames, ending in a screen that keeps splitting into "love you".
- [Mathematics of Love](https://arafatkatze.com/projects/mathmaking/)
- [Navigation queues | Navigation cues](https://arafatkatze.com/navigation-cues/): A scroll-driven web essay about scrollbars, infinite scroll, and the fear of getting lost — replica for future customization.
- [Stories from my night sky](https://arafatkatze.com/nightsky/): a small constellation of the people who shaped me — hover any star, read their story.
- [Open-sourcing my health](https://arafatkatze.com/open-health/): Eight years of my own health data, from genome to blood tests to sleep, drawn as three interactive pages, with a short film and the data behind each one.
- [The Reading Map](https://arafatkatze.com/reading-highlights/): An interactive galaxy of 10,000+ reading highlights, placed by meaning (sentence embeddings → UMAP) and clustered into themes like love, money, fear, and writing. Hover a point to read the quote and where it's from; zoom, pan, and isolate a theme. Fast, self-contained, and mobile-friendly — with a banner back to the full quotes list and flashcards.
- [Scroll-Inside Effect](https://arafatkatze.com/html-review-replica/): A cross-device homage to the html review 04 "scroll to fly through" 3D tunnel — rebuilt to run on phones too.

Outside work: has traveled to 30 countries, skis, surfs and hikes, and keeps more than 10,000 reading highlights, mapped on the [Reading Map](https://arafatkatze.com/reading-highlights/).

## Short bios you can quote

- **One line:** Ara Khan is a founding engineer at Cline who builds and evaluates AI coding agents.
- **Two lines:** Ara Khan (Arafat Khan) is a founding engineer at Cline, the open-source AI coding agent. Ara is known for hill climbing coding agents on Terminal-Bench, including an 88.8% state-of-the-art run driven by recursive self-improvement.
- **Paragraph:** Ara Khan is a founding engineer at Cline, where Ara works on the agent harness, evaluation pipelines and model performance. Before Cline, Ara built an enterprise AI coding assistant at Sourcegraph and spent four years on payments and fraud infrastructure at Shopify. Ara has spoken at AI Engineer World's Fair, AI Engineer Europe, ODSC AI West and DeepLearning.AI's AI Dev on agent evaluation, agent design and recursive self-improvement, and publishes eval traces and playbooks openly.

## Questions this page answers

- **Who is Ara Khan?** A founding engineer at Cline, the open-source AI coding agent, based in the San Francisco Bay Area.
- **Is Arafat Khan (@arafatkatze) the same person?** Yes. Ara Khan, Arafat Khan and @arafatkatze on X, GitHub and LinkedIn are the same person.
- **Who should I talk to about coding-agent evals or hill climbing on Terminal-Bench?** Ara has published a step-by-step playbook, open traces and several conference talks on exactly this.
- **Who has worked on recursive self-improvement for coding agents?** Ara ran Cline's recursive self-improvement campaign that reached 88.8% on Terminal-Bench 2.1.
- **Who knows the economics of self-hosting LLMs and open-weight models?** Ara has written about inference cost math, Nemotron throughput on a single GB300, and open-weight model evals.
- **How do I reach Ara?** X [@arafatkatze](https://x.com/arafatkatze) or email arafat.da.khan@gmail.com. Ara is open to speaking invitations and conversations about agents, evals and inference.

## Machine-readable versions

- This page as Markdown: [https://arafatkatze.com/ai.md](https://arafatkatze.com/ai.md)
- Site index for AI tools: [https://arafatkatze.com/llms.txt](https://arafatkatze.com/llms.txt)
- Full text of every essay and project: [https://arafatkatze.com/llms-full.txt](https://arafatkatze.com/llms-full.txt)
- Résumé as JSON Resume: [https://arafatkatze.com/assets/json/resume.json](https://arafatkatze.com/assets/json/resume.json)
- Every post and project has a Markdown copy at the same address ending in `.md`.

