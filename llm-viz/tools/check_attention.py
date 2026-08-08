"""Dump every self-attention intermediate from PyTorch for one sequence.

The end-to-end logit check already proves the whole forward pass agrees with
torch, but the visualization also *draws* the per-head internals (Q/K/V
slices, masked scores, softmax patterns, weighted V sums, the concat order).
This dump lets a companion JS check compare each of those tensors cell by
cell, so a bug that cancels out downstream would still be caught.

Run with:  python3 llm-viz/tools/check_attention.py
"""

import json
import math
import os

import numpy as np
import torch
import torch.nn.functional as F

from make_reference import load, PROMPT
from train_nano_gpt import BLOCK, C, N_HEAD, N_LAYER

HERE = os.path.dirname(os.path.abspath(__file__))
A = C // N_HEAD


def clean(mat):
    """NaN (the causal mask) is not valid JSON; use null for masked cells."""
    return [[None if math.isnan(v) else v for v in row] for row in mat]


def main():
    model = load()
    # same greedy decode the page performs
    seq = list(PROMPT)
    with torch.no_grad():
        while len(seq) < BLOCK:
            logits = model(torch.tensor([seq]))
            seq.append(int(logits[0, -1].argmax()))

        # walk the model manually with torch ops, capturing attention internals
        T = len(seq)
        pos = torch.arange(T)
        x = model.wte(torch.tensor(seq)) + model.wpe(pos)
        blocks = []
        for blk in model.blocks:
            n = blk.ln1(x)
            qkv = F.linear(n, blk.attn.qkv.weight, blk.attn.qkv.bias)
            q, k, v = qkv.split(C, dim=1)
            heads = []
            outs = []
            for h in range(N_HEAD):
                qh = q[:, h * A : (h + 1) * A]
                kh = k[:, h * A : (h + 1) * A]
                vh = v[:, h * A : (h + 1) * A]
                att = (qh @ kh.T) / math.sqrt(A)
                mask = torch.tril(torch.ones(T, T)).bool()
                att = att.masked_fill(~mask, float("nan"))
                sm = F.softmax(att.nan_to_num(float("-inf")), dim=-1)
                out = sm @ vh
                # the page draws masked cells as masked, not as probability 0
                sm = sm.masked_fill(~mask, float("nan"))
                heads.append(
                    {
                        "q": qh.tolist(),
                        "k": kh.tolist(),
                        "v": vh.tolist(),
                        "scores": clean(att.tolist()),  # masked above the diagonal
                        "pattern": clean(sm.tolist()),
                        "out": out.tolist(),
                    }
                )
                outs.append(out)
            combined = torch.cat(outs, dim=1)
            proj = F.linear(combined, blk.attn.proj.weight, blk.attn.proj.bias)
            resid = x + proj
            blocks.append(
                {
                    "heads": heads,
                    "combined": combined.tolist(),
                    "proj": proj.tolist(),
                    "resid": resid.tolist(),
                }
            )
            x = resid + blk.fcproj(F.gelu(blk.fc(blk.ln2(resid))))

    out_path = os.path.join(HERE, "attention_reference.json")
    with open(out_path, "w") as f:
        json.dump({"sequence": seq, "blocks": blocks}, f)
    print(f"wrote {out_path}: {N_LAYER} blocks x {N_HEAD} heads, T={len(seq)}")


if __name__ == "__main__":
    main()
