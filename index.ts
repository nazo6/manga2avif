import * as path from "path";
import * as fs from "fs/promises";
import { execSync } from "child_process";
import sharp from "sharp";
import Promises from "bluebird";
import flatten from "@hutsoninc/flatten-dir";

const input_path = path.resolve(process.argv[2]);
const input_name = path.basename(input_path);
const input_dir = path.dirname(input_path);
const extracted_dir = path.resolve(input_dir, `${input_name}.extracted`);
const converted_dir = path.resolve(input_dir, `${input_name}.temp`);
const archive_output_path = path.resolve(
  input_dir,
  input_name.split(/\.(?=[^.]+$)/)[0] + "_avif.zip",
);

async function extract_archive() {
  execSync(
    ["7z", "x", `"${input_path}"`, `-o"${extracted_dir}"`, `-mmt6`].join(" "),
  );
  await flatten(extracted_dir);
  fs.mkdir(converted_dir, { recursive: true });
}

async function convert_files() {
  const target_files = (await fs.readdir(extracted_dir)).map((name) => {
    return {
      name,
      path: path.resolve(extracted_dir, name),
    };
  });

  let converted_count = 0;
  await Promises.map(target_files, async (file) => {
    const out_name = file.name.split(/\.(?=[^.]+$)/)[0] + ".avif";
    const out_path = path.resolve(converted_dir, out_name);

    await sharp(file.path)
      .resize(null, 1000)
      .avif({ quality: 50, chromaSubsampling: "4:2:0" })
      .toFile(out_path);

    converted_count++;
    console.log(
      `Converted ${converted_count}/${target_files.length} (${out_path})`,
    );
  }, {
    concurrency: 5,
  });
}

async function create_archive() {
  execSync(
    [
      "7z",
      "a",
      `"${archive_output_path}"`,
      `"${path.resolve(converted_dir, "*")}"`,
      `-mmt6`,
    ]
      .join(" "),
  );
}

async function clean() {
  await fs.rm(extracted_dir, { recursive: true, force: true });
  await fs.rm(converted_dir, { recursive: true, force: true });
}

const main = async () => {
  console.log("Extracting archive");
  await extract_archive();
  console.log("Converting files");
  await convert_files();
  console.log("Creating archive");
  await create_archive();
  console.log("Cleaning up");
  await clean();
  console.log("Completed!");
};

main();
