for file in `\find ./files/ -maxdepth 1 -type f`; do
  pnpm ts-node ./index.ts $file
done
