const THUMBNAIL_SIZE = 144;

/**
 * @param {File} file
 */
export async function generateThumbnail(file) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  var ctx = canvas.getContext("2d");

  /** @type HTMLImageElement */
  if (file.type.startsWith("image/")) {
    const image = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = URL.createObjectURL(file);
    });
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "video/mp4") {
    // Generate thumbnail from video
    const video = await new Promise(async (resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = URL.createObjectURL(file);
      setTimeout(() => reject(new Error("Video load timeout")), 2000);
      await video.play();
      await video.pause();
      video.currentTime = 0;
      resolve(video);
    });
    ctx.drawImage(video, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  }

  /** @type Blob */
  const thumbnailBlob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob))
  );

  return thumbnailBlob;
}

/**
 * @param {Blob} blob
 */
export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  const digestArray = Array.from(new Uint8Array(digest));
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex;
}

export const SIZE_LIMIT = 100 * 1000 * 1000; // 100MB

/**
 * @param {string} key
 * @param {File} file
 * @param {Record<string, any>} options
 */
export async function multipartUpload(key, file, options) {
  const headers = options?.headers || {};
  headers["content-type"] = file.type;

  const uploadId = await axios
    .post(`/api/write/items/${key}?uploads`, "", { headers })
    .then((res) => res.data.uploadId);
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);

  const promiseGenerator = function* () {
    for (let i = 1; i <= totalChunks; i++) {
      const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
      const searchParams = new URLSearchParams({ partNumber: i, uploadId });
      yield axios
        .put(`/api/write/items/${key}?${searchParams}`, chunk, {
          onUploadProgress(progressEvent) {
            if (typeof options?.onUploadProgress !== "function") return;
            options.onUploadProgress({
              loaded: (i - 1) * SIZE_LIMIT + progressEvent.loaded,
              total: file.size,
            });
          },
        })
        .then((res) => ({
          partNumber: i,
          etag: res.headers.etag,
        }));
    }
  };

  const uploadedParts = [];
  for (const part of promiseGenerator()) {
    const { partNumber, etag } = await part;
    uploadedParts[partNumber - 1] = { partNumber, etag };
  }
  const completeParams = new URLSearchParams({ uploadId });
  await axios.post(`/api/write/items/${key}?${completeParams}`, {
    parts: uploadedParts,
  });
}

const EXT_TO_MIME = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  js: "application/javascript",
  mjs: "application/javascript",
  cjs: "application/javascript",
  jsx: "application/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  vue: "application/vnd.vue-component",
  html: "text/html",
  htm: "text/html",
  xhtml: "application/xhtml+xml",
  xml: "application/xml",
  svg: "image/svg+xml",
  css: "text/css",
  scss: "text/x-scss",
  sass: "text/x-sass",
  less: "text/less",
  styl: "text/stylus",
  stylus: "text/stylus",
  py: "text/x-python",
  rb: "text/x-ruby",
  php: "application/x-httpd-php",
  phtml: "application/x-httpd-php",
  php3: "application/x-httpd-php",
  php4: "application/x-httpd-php",
  php5: "application/x-httpd-php",
  phps: "application/x-httpd-php",
  sh: "application/x-sh",
  bash: "application/x-sh",
  zsh: "application/x-sh",
  fish: "application/x-fish",
  ps1: "text/x-powershell",
  bat: "text/plain",
  cmd: "text/plain",
  sql: "application/sql",
  yaml: "application/yaml",
  yml: "application/yaml",
  toml: "application/toml",
  ini: "text/plain",
  conf: "text/plain",
  config: "text/plain",
  cfg: "text/plain",
  env: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  tex: "application/x-tex",
  latex: "application/x-latex",
  lua: "text/x-lua",
  go: "text/x-go",
  rs: "text/x-rust",
  c: "text/x-c",
  cpp: "text/x-c++",
  cc: "text/x-c++",
  cxx: "text/x-c++",
  h: "text/x-c",
  hpp: "text/x-c++",
  hh: "text/x-c",
  java: "text/x-java-source",
  kt: "text/x-kotlin",
  kts: "text/x-kotlin",
  swift: "text/x-swift",
  cs: "text/x-csharp",
  vb: "text/x-vb",
  fs: "text/x-fsharp",
  fsx: "text/x-fsharp",
  hs: "text/x-haskell",
  lhs: "text/x-haskell",
  erl: "text/x-erlang",
  ex: "text/x-elixir",
  exs: "text/x-elixir",
  pl: "text/x-perl",
  pm: "text/x-perl",
  t: "text/x-perl",
  coffee: "text/coffeescript",
  dart: "text/x-dart",
  scala: "text/x-scala",
  sc: "text/x-scala",
  r: "text/x-r",
  m: "text/x-matlab",
  asm: "text/x-asm",
  s: "text/x-asm",
  nasm: "text/x-asm",
  gradle: "text/x-gradle",
  properties: "text/x-properties",
  dockerfile: "text/x-dockerfile",
  makefile: "text/x-makefile",
  cmake: "text/x-cmake",
  nginxconf: "text/x-nginx-conf",
  htaccess: "text/plain",
  gitignore: "text/plain",
  gitattributes: "text/plain",
  editorconfig: "text/plain",
  eslintrc: "application/json",
  prettierrc: "application/json",
  babelrc: "application/json",
  lock: "text/plain",
  map: "application/json",
  license: "text/plain",
  readme: "text/plain",
  changelog: "text/plain",
};

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/manifest+json",
  "application/x-ndjson",
  "application/json5",
  "application/javascript",
  "application/ecmascript",
  "application/x-javascript",
  "application/typescript",
  "application/xml",
  "application/xhtml+xml",
  "application/atom+xml",
  "application/rss+xml",
  "application/mathml+xml",
  "image/svg+xml",
  "application/sql",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
  "application/x-toml",
  "application/markdown",
  "text/markdown",
  "application/postscript",
  "application/rtf",
  "application/x-sh",
  "application/x-shellscript",
  "application/x-httpd-php",
  "application/x-python-code",
  "text/x-python",
  "application/x-perl",
  "application/x-ruby",
  "application/x-csh",
  "application/x-tex",
  "application/x-latex",
  "application/vnd.vue-component",
  "text/html",
  "text/css",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "text/xml",
]);

const TEXT_EXTENSIONS = new Set(Object.keys(EXT_TO_MIME));

function getFileExtension(filename) {
  if (!filename) return "";
  const base = filename.split("/").pop();
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/**
 * @param {string} filename
 * @returns {string | null}
 */
export function detectTextMimeType(filename) {
  const ext = getFileExtension(filename);
  return EXT_TO_MIME[ext] || null;
}

/**
 * @param {{ key: string, httpMetadata?: { contentType?: string } }} file
 * @returns {boolean}
 */
export function isTextFile(file) {
  if (!file || !file.key) return false;
  const contentType = file.httpMetadata?.contentType || "";
  if (contentType.startsWith("text/")) return true;
  if (TEXT_MIME_TYPES.has(contentType)) return true;
  const ext = getFileExtension(file.key);
  return TEXT_EXTENSIONS.has(ext);
}
