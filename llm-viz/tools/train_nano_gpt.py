"""Train the 85k-parameter nano-GPT that the visualization runs on.

The task is the classic sorting toy problem: the model reads six letters drawn
from {A, B, C} and must emit the same six letters in alphabetical order. With a
vocabulary of three and a context of eleven tokens the whole model fits in
~85k parameters, which is small enough to draw every single weight on screen.

Architecture is plain GPT: learned token + position embeddings, pre-LayerNorm
blocks with causal multi-head self-attention and a 4x GELU MLP, a final
LayerNorm and an untied language-model head.

Outputs (next to the site assets):
  assets/nano-gpt.bin   float32 blob of every parameter, concatenated
  assets/nano-gpt.json  tensor names, shapes and offsets into that blob

Run with:  python3 llm-viz/tools/train_nano_gpt.py
"""

import itertools
import json
import math
import os
import struct

import torch
import torch.nn as nn
from torch.nn import functional as F

VOCAB = 3  # A, B, C
N_INPUT = 6  # letters shown to the model
BLOCK = 2 * N_INPUT - 1  # 11 positions of context
C = 48  # residual stream width
N_HEAD = 3
N_LAYER = 3
SEED = 1337


class CausalSelfAttention(nn.Module):
    def __init__(self):
        super().__init__()
        self.qkv = nn.Linear(C, 3 * C)
        self.proj = nn.Linear(C, C)
        self.register_buffer("mask", torch.tril(torch.ones(BLOCK, BLOCK)).view(1, 1, BLOCK, BLOCK))

    def forward(self, x):
        B, T, Cdim = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        head = C // N_HEAD
        q = q.view(B, T, N_HEAD, head).transpose(1, 2)
        k = k.view(B, T, N_HEAD, head).transpose(1, 2)
        v = v.view(B, T, N_HEAD, head).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(head)
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        att = F.softmax(att, dim=-1)
        y = (att @ v).transpose(1, 2).contiguous().view(B, T, Cdim)
        return self.proj(y)


class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1 = nn.LayerNorm(C)
        self.attn = CausalSelfAttention()
        self.ln2 = nn.LayerNorm(C)
        self.fc = nn.Linear(C, 4 * C)
        self.fcproj = nn.Linear(4 * C, C)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.fcproj(F.gelu(self.fc(self.ln2(x))))
        return x


class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.wte = nn.Embedding(VOCAB, C)
        self.wpe = nn.Embedding(BLOCK, C)
        self.blocks = nn.ModuleList([Block() for _ in range(N_LAYER)])
        self.lnf = nn.LayerNorm(C)
        self.head = nn.Linear(C, VOCAB, bias=False)
        self.apply(self._init)
        for name, p in self.named_parameters():
            if name.endswith("fcproj.weight") or name.endswith("proj.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * N_LAYER))

    def _init(self, module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                nn.init.zeros_(module.bias)

    def forward(self, idx):
        T = idx.shape[1]
        pos = torch.arange(T, device=idx.device)
        x = self.wte(idx) + self.wpe(pos)
        for block in self.blocks:
            x = block(x)
        return self.head(self.lnf(x))


def all_sequences():
    """Every one of the 3^6 possible inputs, paired with its sorted answer."""
    xs, ys = [], []
    for combo in itertools.product(range(VOCAB), repeat=N_INPUT):
        full = list(combo) + sorted(combo)
        xs.append(full[:-1])
        # only the sorted half is supervised; the prefix is masked out with -1
        ys.append([-1] * (N_INPUT - 1) + full[N_INPUT:])
    return torch.tensor(xs), torch.tensor(ys)


def train():
    torch.manual_seed(SEED)
    model = GPT()
    x_all, y_all = all_sequences()
    # hold out a fifth of the sequences so we can check it generalizes
    perm = torch.randperm(x_all.shape[0], generator=torch.Generator().manual_seed(SEED))
    n_test = x_all.shape[0] // 5
    test_idx, train_idx = perm[:n_test], perm[n_test:]
    x_tr, y_tr = x_all[train_idx], y_all[train_idx]

    opt = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=0.05, betas=(0.9, 0.99))
    steps = 6000
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=steps, pct_start=0.15)
    batch = 128
    gen = torch.Generator().manual_seed(SEED)

    for step in range(steps):
        pick = torch.randint(0, x_tr.shape[0], (batch,), generator=gen)
        logits = model(x_tr[pick])
        loss = F.cross_entropy(
            logits.reshape(-1, VOCAB), y_tr[pick].reshape(-1), ignore_index=-1
        )
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        sched.step()
        if step % 500 == 0 or step == steps - 1:
            print(f"step {step:5d}  loss {loss.item():.5f}")

    model.eval()
    with torch.no_grad():
        acc_all = sequence_accuracy(model, x_all)
        acc_test = sequence_accuracy(model, x_all[test_idx])
    print(f"exact-sequence accuracy: all={acc_all:.4f}  held-out={acc_test:.4f}")
    return model, acc_all


@torch.no_grad()
def sequence_accuracy(model, xs):
    """Greedy autoregressive decode from the first six letters; all-or-nothing."""
    correct = 0
    for row in xs:
        prompt = row[:N_INPUT].tolist()
        seq = list(prompt)
        for _ in range(N_INPUT):
            logits = model(torch.tensor([seq[-BLOCK:]]))
            seq.append(int(logits[0, -1].argmax()))
        if seq[N_INPUT:] == sorted(prompt):
            correct += 1
    return correct / xs.shape[0]


def export(model, out_dir, accuracy):
    tensors = []
    blob = bytearray()

    def add(name, tensor, kind, note):
        nonlocal blob
        arr = tensor.detach().contiguous().float().flatten().tolist()
        tensors.append(
            {
                "name": name,
                "shape": list(tensor.shape),
                "offset": len(blob) // 4,
                "kind": kind,
                "note": note,
            }
        )
        blob += struct.pack(f"<{len(arr)}f", *arr)

    add("wte", model.wte.weight, "embed", "token embedding table")
    add("wpe", model.wpe.weight, "embed", "position embedding table")
    for i, block in enumerate(model.blocks):
        p = f"blocks.{i}."
        add(p + "ln1.g", block.ln1.weight, "norm", "layer norm 1 gain")
        add(p + "ln1.b", block.ln1.bias, "norm", "layer norm 1 bias")
        add(p + "attn.qkv.w", block.attn.qkv.weight, "weight", "Q,K,V projection weights")
        add(p + "attn.qkv.b", block.attn.qkv.bias, "bias", "Q,K,V projection bias")
        add(p + "attn.proj.w", block.attn.proj.weight, "weight", "attention output projection")
        add(p + "attn.proj.b", block.attn.proj.bias, "bias", "attention output bias")
        add(p + "ln2.g", block.ln2.weight, "norm", "layer norm 2 gain")
        add(p + "ln2.b", block.ln2.bias, "norm", "layer norm 2 bias")
        add(p + "mlp.fc.w", block.fc.weight, "weight", "MLP up-projection weights")
        add(p + "mlp.fc.b", block.fc.bias, "bias", "MLP up-projection bias")
        add(p + "mlp.proj.w", block.fcproj.weight, "weight", "MLP down-projection weights")
        add(p + "mlp.proj.b", block.fcproj.bias, "bias", "MLP down-projection bias")
    add("lnf.g", model.lnf.weight, "norm", "final layer norm gain")
    add("lnf.b", model.lnf.bias, "norm", "final layer norm bias")
    add("head.w", model.head.weight, "weight", "language model head")

    n_params = sum(p.numel() for p in model.parameters())
    meta = {
        "task": "sort six letters drawn from {A, B, C} into alphabetical order",
        "vocab": ["A", "B", "C"],
        "config": {
            "vocabSize": VOCAB,
            "nInput": N_INPUT,
            "blockSize": BLOCK,
            "C": C,
            "nHeads": N_HEAD,
            "headSize": C // N_HEAD,
            "nBlocks": N_LAYER,
        },
        "nParams": n_params,
        "accuracy": accuracy,
        "dtype": "float32",
        "tensors": tensors,
    }

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "nano-gpt.bin"), "wb") as f:
        f.write(bytes(blob))
    with open(os.path.join(out_dir, "nano-gpt.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print(f"exported {n_params} params -> {out_dir}/nano-gpt.bin ({len(blob)} bytes)")


if __name__ == "__main__":
    trained, acc = train()
    here = os.path.dirname(os.path.abspath(__file__))
    export(trained, os.path.join(here, "..", "assets"), acc)
