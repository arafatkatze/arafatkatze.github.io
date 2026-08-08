"""Dump a reference forward pass so the JS implementation can be checked.

Loads the exported weights back into the PyTorch model, runs one fixed prompt
through it and writes the logits to reference.json.
"""

import json
import os

import numpy as np
import torch

from train_nano_gpt import GPT, BLOCK, VOCAB, N_INPUT

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")

PROMPT = [2, 0, 1, 1, 2, 0]  # C A B B C A


def load():
    meta = json.load(open(os.path.join(ASSETS, "nano-gpt.json")))
    blob = np.fromfile(os.path.join(ASSETS, "nano-gpt.bin"), dtype="<f4")
    model = GPT()
    named = dict(model.named_parameters())
    mapping = {
        "wte": "wte.weight",
        "wpe": "wpe.weight",
        "lnf.g": "lnf.weight",
        "lnf.b": "lnf.bias",
        "head.w": "head.weight",
    }
    for i in range(len(model.blocks)):
        p = f"blocks.{i}."
        mapping.update(
            {
                p + "ln1.g": p + "ln1.weight",
                p + "ln1.b": p + "ln1.bias",
                p + "attn.qkv.w": p + "attn.qkv.weight",
                p + "attn.qkv.b": p + "attn.qkv.bias",
                p + "attn.proj.w": p + "attn.proj.weight",
                p + "attn.proj.b": p + "attn.proj.bias",
                p + "ln2.g": p + "ln2.weight",
                p + "ln2.b": p + "ln2.bias",
                p + "mlp.fc.w": p + "fc.weight",
                p + "mlp.fc.b": p + "fc.bias",
                p + "mlp.proj.w": p + "fcproj.weight",
                p + "mlp.proj.b": p + "fcproj.bias",
            }
        )
    with torch.no_grad():
        for t in meta["tensors"]:
            n = int(np.prod(t["shape"]))
            vals = blob[t["offset"] : t["offset"] + n].reshape(t["shape"])
            named[mapping[t["name"]]].copy_(torch.tensor(vals.copy()))
    model.eval()
    return model


def main():
    model = load()
    seq = list(PROMPT)
    with torch.no_grad():
        while len(seq) < BLOCK:
            logits = model(torch.tensor([seq]))
            seq.append(int(logits[0, -1].argmax()))
        final = model(torch.tensor([seq]))
    out = {
        "prompt": PROMPT,
        "sequence": seq,
        "logits": final[0].tolist(),
    }
    with open(os.path.join(HERE, "reference.json"), "w") as f:
        json.dump(out, f)
    letters = "ABC"
    print("prompt   :", "".join(letters[i] for i in PROMPT))
    print("generated:", "".join(letters[i] for i in seq[N_INPUT:]))
    print("expected :", "".join(letters[i] for i in sorted(PROMPT)))


if __name__ == "__main__":
    main()
