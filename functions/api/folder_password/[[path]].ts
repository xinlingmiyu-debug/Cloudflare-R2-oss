import { notFound, parseBucketPath } from "@/utils/bucket";

// 获取文件夹密码状态（检查是否有密码）
export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const folderPath = path.endsWith('/') ? path : path + '/';
  const passwordKey = folderPath + '_$folder_password$';

  try {
    const obj = await bucket.get(passwordKey);
    if (obj) {
      const password = await obj.text();
      return new Response(JSON.stringify({ hasPassword: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ hasPassword: false }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ hasPassword: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 设置或更新文件夹密码
export async function onRequestPut(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const folderPath = path.endsWith('/') ? path : path + '/';
  const passwordKey = folderPath + '_$folder_password$';

  try {
    const body = await context.request.json();
    const { password } = body;
    if (!password) {
      return new Response(JSON.stringify({ error: "密码不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await bucket.put(passwordKey, password);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 删除文件夹密码
export async function onRequestDelete(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const folderPath = path.endsWith('/') ? path : path + '/';
  const passwordKey = folderPath + '_$folder_password$';

  try {
    await bucket.delete(passwordKey);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 验证文件夹密码
export async function onRequestPost(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const folderPath = path.endsWith('/') ? path : path + '/';
  const passwordKey = folderPath + '_$folder_password$';

  try {
    const body = await context.request.json();
    const { password } = body;

    const obj = await bucket.get(passwordKey);
    if (!obj) {
      return new Response(JSON.stringify({ valid: true, message: "该文件夹没有密码" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const storedPassword = (await obj.text()).trim();
    if (storedPassword === password) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ valid: false, message: "密码错误" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}