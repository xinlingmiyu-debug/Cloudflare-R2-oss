import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    const objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!path)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    // 为每个文件夹添加密码状态标记
    const foldersWithPasswordInfo = await Promise.all(
      folders.map(async (folder) => {
        const passwordKey = folder + "_$folder_password$";
        try {
          const obj = await bucket.get(passwordKey);
          return { name: folder, hasPassword: !!obj };
        } catch (e) {
          return { name: folder, hasPassword: false };
        }
      })
    );

    return new Response(JSON.stringify({ 
      value: objKeys, 
      folders: foldersWithPasswordInfo.map(f => f.name),
      foldersWithPasswordInfo
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
