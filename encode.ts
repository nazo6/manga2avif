import * as path from "https://deno.land/std@0.129.0/path/mod.ts";
import Promise from "https://esm.sh/bluebird";

const time_start = performance.now();

const archive_path = path.resolve(Deno.args[0]);
const archive_name = path.basename(archive_path);
const archive_dir = path.dirname(archive_path);
const extracted_dir = path.resolve(archive_dir, `${archive_name}.extracted`);
const converted_dir = path.resolve(archive_dir, `${archive_name}.temp`);
const archive_output_path = path.resolve(
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
  const time_conv_start = performance.now();
  const output_path = path.resolve(converted_dir, input_file.name + ".avif");

  // deno-fmt-ignore
  const cmd_avifenc = [
    "avifenc",
    "-s", "5",
    "--min","10", "--max","60",
    "--minalpha","10","--maxalpha","60",
    "-y","420",
    input_file.path,output_path
  ];
  // deno-fmt-ignore
  const cmd_cavif = [
    "cavif",
    "--quality", "50",
    "--speed","4",
    input_file.path,
    "-o", output_path
  ];

  const extract_process = Deno.run({
    cmd: cmd_avifenc,
    stdin: "null",
    stdout: "null",
  });
  await extract_process.status();
  count++;
  const time_conv_end = performance.now();
  console.log(
    `Processed ${count}/${files_count} (${output_path}, ${
      (time_conv_end - time_conv_start) / 1000
    } secs)`,
  );
}, {
  concurrency: 6,
});

console.log("\nConverted all files");

const archive_process = Deno.run({
  cmd: [
    "7z",
    "a",
    archive_output_path,
    path.resolve(converted_dir, "*"),
  ],
});
await archive_process.status();

console.log("Archived files");

Deno.removeSync(extracted_dir, { recursive: true });
Deno.removeSync(converted_dir, { recursive: true });

console.log("Cleaned up\n");

const time_end = performance.now();

console.log(`Completed in ${(time_end - time_start) / 1000} secs`);
