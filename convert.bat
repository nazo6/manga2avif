for %%f in (.\files\*.*) do (
  pnpm ts-node ./index.ts "%%f"
)
