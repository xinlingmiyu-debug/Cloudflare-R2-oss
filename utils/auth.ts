// utils/auth.ts
export function get_auth_status(context) {
  const url = context.request.url;
  let dopath = "";
  
  // 处理 write 请求的路径
  if (url.includes("/api/write/items/")) {
    dopath = url.split("/api/write/items/")[1] || "";
  } else if (url.includes("/api/children/")) {
    // listing 也需要权限控制（可选）
    dopath = url.split("/api/children/")[1] || "";
  }

  // 游客权限（保持原有）
  if (context.env["GUEST"]) {
    if (dopath.startsWith("_\( flaredrive \)/thumbnails/")) return true;
    const allow_guest = context.env["GUEST"].split(",");
    for (const aa of allow_guest) {
      if (aa === "*" || dopath.startsWith(aa)) return true;
    }
  }

  // ==================== 新增：目录独立密码支持 ====================
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64 = authHeader.split("Basic ")[1];
  const credentials = atob(base64);           // username:password
  const [inputUser, inputPass] = credentials.split(":");

  if (!inputUser || !inputPass) return false;

  // 优先检查目录专用密码（新格式：DIR_目录名:密码）
  // 示例环境变量： DIR_photo:123456   → 访问 photo/ 时可用账号 photo 密码 123456
  const dirKey = `DIR_${inputUser}`;
  if (context.env[dirKey]) {
    const realPass = context.env[dirKey];
    if (inputPass === realPass) {
      // 检查路径是否匹配该目录
      const dirPath = inputUser.endsWith("/") ? inputUser : inputUser + "/";
      if (dopath.startsWith(dirPath) || dopath === "" || dopath.startsWith("_\( flaredrive \)/thumbnails/")) {
        return true;
      }
    }
  }

  // 保留原有用户权限系统（兼容）
  if (context.env[credentials]) {   // 老格式 admin:123456
    if (dopath.startsWith("_\( flaredrive \)/thumbnails/")) return true;
    const allow = context.env[credentials].split(",");
    for (const a of allow) {
      if (a === "*" || dopath.startsWith(a)) return true;
    }
  }

  return false;
}
