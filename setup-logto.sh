#!/bin/bash
set -e

echo "=========================================="
echo "  Logto 初始化配置脚本"
echo "=========================================="
echo ""
echo "请按以下步骤操作："
echo ""
echo "1. 在浏览器中打开 http://localhost:3302"
echo "2. 创建管理员账号（用户名: admin, 密码自设）"
echo "3. 进入管理后台后，点击左侧 'Applications' → 'Create Application'"
echo "4. 选择 'Single Page App' 类型，名称填 'Delta AI Tutor'"
echo "5. 配置以下参数："
echo "   - Redirect URIs: http://localhost:5173/auth/callback"
echo "   - Post Sign-out URIs: http://localhost:5173"
echo "   - Allowed CORS Origins: http://localhost:5173"
echo "6. 保存后，复制 Application ID 和 Application Secret"
echo ""
echo "7. 再创建一个 M2M (Machine-to-Machine) 应用："
echo "   - 名称填 'Delta Backend'"
echo "   - 勾选 'Management API' 权限"
echo "   - 保存后复制 M2M Application ID 和 Secret"
echo ""
echo "8. 将以下信息填入 backend/.env 文件："
echo "   LOGTO_APP_ID=<你的SPA应用ID>"
echo "   LOGTO_APP_SECRET=<你的SPA应用Secret>"
echo "   LOGTO_M2M_APP_ID=<你的M2M应用ID>"
echo "   LOGTO_M2M_APP_SECRET=<你的M2M应用Secret>"
echo ""
echo "9. 重启后端服务："
echo "   docker compose restart backend"
echo ""
echo "=========================================="

read -p "是否已完成上述配置？(y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "请完成配置后重新运行此脚本"
    exit 0
fi

read -p "请输入 LOGTO_APP_ID: " APP_ID
read -p "请输入 LOGTO_APP_SECRET: " APP_SECRET
read -p "请输入 LOGTO_M2M_APP_ID (可选，回车跳过): " M2M_ID
read -p "请输入 LOGTO_M2M_APP_SECRET (可选，回车跳过): " M2M_SECRET

ENV_FILE="$(dirname "$0")/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 找不到 $ENV_FILE"
    exit 1
fi

sed -i.bak "s/^LOGTO_APP_ID=.*/LOGTO_APP_ID=$APP_ID/" "$ENV_FILE"
sed -i.bak "s/^LOGTO_APP_SECRET=.*/LOGTO_APP_SECRET=$APP_SECRET/" "$ENV_FILE"
if [ -n "$M2M_ID" ]; then
    sed -i.bak "s/^LOGTO_M2M_APP_ID=.*/LOGTO_M2M_APP_ID=$M2M_ID/" "$ENV_FILE"
fi
if [ -n "$M2M_SECRET" ]; then
    sed -i.bak "s/^LOGTO_M2M_APP_SECRET=.*/LOGTO_M2M_APP_SECRET=$M2M_SECRET/" "$ENV_FILE"
fi

rm -f "${ENV_FILE}.bak"

echo ""
echo "✅ 配置已更新！正在重启后端服务..."
cd "$(dirname "$0")"
docker compose restart backend

echo ""
echo "✅ Logto 配置完成！"
echo "   现在可以使用 Logto 统一认证登录了"
