import * as path from "https://deno.land/std@0.129.0/path/mod.ts";
import Promise from "https://esm.sh/bluebird";

const archive_path = path.resolve(Deno.args[0]);
const archive_name = path.basename(archive_path);
const archive_dir = path.dirname(archive_path);
const extracted_dir = path.resolve(archive_dir, `${archive_name}.extracted`);
const converted_dir = path.resolve(archive_dir, `${archive_name}.temp`);
const output_path = path.resolve(
  archive_dir,
  archive_name.split(/\.(?=[^.]+$)/)[0] + "_avif.zip",
);

console.log(`Extracting ${archive_path}`);

const extract_process = Deno.run({
  cmd: ["7z", "x", archive_path, `-o${extracted_dir}`, `-mmt6`],
});
await extract_process.status();

console.log(`Extracted to ${extracted_dir}\n`);

const input_files = Array.from(Deno.readDirSync(extracted_dir)).map((entry) => {
  return {
    name: entry.name.split(/\.(?=[^.]+$)/)[0],
    path: path.resolve(extracted_dir, entry.name),
  };
});

console.log(`Starting convert`);

Deno.mkdirSync(converted_dir);

let count = 0;
const files_count = input_files.length;
await Promise.map(input_files, async (input_file) => {
  const output_name = path.resolve(converted_dir, input_file.name + ".avif");
  const extract_process = Deno.run({
    cmd: [
      "avifenc",
      "-s",
      "4",
      "--min",
      "1",
      "--max",
      "63",
      "--minalpha",
      "1",
      "--maxalpha",
      "63",
      "-y",
      "420",
      input_file.path,
      output_name,
    ],
    stdin: "null",
    stdout: "null",
  });
  await extract_process.status();
  count++;
  console.log(`Processed ${count}/${files_count} (${output_name})`);
}, {
  concurrency: 6,
});

console.log("\nConverted all files");

const archive_process = Deno.run({
  cmd: [
    "7z",
    "a",
    output_path,
    path.resolve(converted_dir, "*"),
  ],
});
await archive_process.status();

console.log("Archived files");

Deno.removeSync(extracted_dir, { recursive: true });
Deno.removeSync(converted_dir, { recursive: true });

console.log("Cleaned up\n");

console.log("Completed!");
