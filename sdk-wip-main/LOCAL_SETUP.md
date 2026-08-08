# Local SDK setup

This directory contains the WIP Cline SDK archive downloaded from:

```text
https://drive.google.com/file/d/1qyKWa4DyNH95GQ8fbTTOi_G8YoL3qPr6/view?usp=sharing
```

The downloaded file was `sdk-wip-main.zip` and it extracted to this
`sdk-wip-main/` directory.

## Runtime requirements

- Node.js `>=22`
- Bun `>=1.3.13`

The local setup was verified with:

```sh
node --version  # v22.22.0
bun --version   # 1.3.13
```

If Bun is not already available in your shell, install it user-locally:

```sh
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

## Commands run for setup

From this directory:

```sh
bun install
bun run build:sdk
bun -F @clinebot/cli build
```

The CLI was also linked into the VM user environment from `apps/cli`:

```sh
cd apps/cli
bun link
```

After linking, the `clite` binary was available at:

```text
/home/ubuntu/.bun/bin/clite
```

## Verification results

The following checks completed successfully from this directory:

```sh
bun run types
bun run test
bun run check
clite --help
```

`bun run check` verified formatting/linting, rebuilt the SDK packages and CLI,
typechecked publishable packages, packed the publishable packages, installed
them in an isolated directory, and verified module resolution for:

- `@clinebot/shared`
- `@clinebot/llms`
- `@clinebot/agents`
- `@clinebot/core`

## Common usage

Run the development CLI from this SDK checkout:

```sh
bun run cli
```

Run a one-shot prompt with the linked CLI:

```sh
clite "Summarize this SDK"
```

Authenticate/configure a provider before using model-backed commands:

```sh
clite auth
```
