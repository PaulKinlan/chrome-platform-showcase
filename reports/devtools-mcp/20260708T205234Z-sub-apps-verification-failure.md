# DevTools MCP verification failure — v153/sub-apps

- Timestamp UTC: 20260708T205234Z
- Repo: /home/paulkinlan/chrome-platform-showcase
- HEAD: ff73e8d0
- Local server PID: 2397820

## Git status

```
 M .auto/log.jsonl
?? reports/
```

## Server route health

```
/ 200
/v153/sub-apps/ 200
/v153/sub-apps/batch-install/ 200
/v153/sub-apps/installed-inventory/ 200
/v153/sub-apps/remove-flow/ 200
```

## Recent local server log

```
[0m[32mTask[0m [0m[36mstart[0m deno run --allow-net --allow-read --allow-env server.ts
Listening on http://0.0.0.0:3000/ (http://localhost:3000/)
Listening on http://localhost:3000
```

## DevTools/MCP process state

```
3123928 3123857 Rl   chrome          /opt/google/chrome/chrome https://auth.openai.com/oauth/authorize?response_type=code&client_id=app_EMoamEEZ73f0CkXaXp7hrann&redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback&scope=openid+profile+email+offline_access&code_challenge=s-s0uB0l2m-qnYT3kb3KW0CQ7H6b-l4jZeCSXxJ44do&code_challenge_method=S256&state=aedb26d4891d662135490baed2bea436&id_token_add_organizations=true&codex_cli_simplified_flow=true&originator=pi
3123935    2720 Sl   chrome_crashpad /opt/google/chrome/chrome_crashpad_handler --monitor-self --monitor-self-annotation=ptype=crashpad-handler --database=/home/paulkinlan/.config/google-chrome/Crash Reports --metrics-dir=/home/paulkinlan/.config/google-chrome --url=https://clients2.google.com/cr/report --annotation=channel= --annotation=lsb-release=Arch Linux --annotation=plat=Linux --annotation=prod=Chrome_Linux --annotation=ver=149.0.7827.155 --initial-client-fd=5 --shared-client-connection
3123937    2720 Sl   chrome_crashpad /opt/google/chrome/chrome_crashpad_handler --no-periodic-tasks --monitor-self-annotation=ptype=crashpad-handler --database=/home/paulkinlan/.config/google-chrome/Crash Reports --url=https://clients2.google.com/cr/report --annotation=channel= --annotation=lsb-release=Arch Linux --annotation=plat=Linux --annotation=prod=Chrome_Linux --annotation=ver=149.0.7827.155 --initial-client-fd=4 --shared-client-connection
3123950 3123928 S    chrome          /opt/google/chrome/chrome --type=zygote --no-zygote-sandbox --crashpad-handler-pid=3123935 --enable-crash-reporter=c0f9551a-82da-46c8-989d-048a86e1f00e, --change-stack-guard-on-fork=enable
3123951 3123928 S    chrome          /opt/google/chrome/chrome --type=zygote --crashpad-handler-pid=3123935 --enable-crash-reporter=c0f9551a-82da-46c8-989d-048a86e1f00e, --change-stack-guard-on-fork=enable
3123953 3123951 S    chrome          /opt/google/chrome/chrome --type=zygote --crashpad-handler-pid=3123935 --enable-crash-reporter=c0f9551a-82da-46c8-989d-048a86e1f00e, --change-stack-guard-on-fork=enable
```

## Environment

```
/home/paulkinlan/.local/share/mise/installs/node/26.2.0/bin/node
v26.2.0
/home/paulkinlan/.local/share/mise/installs/deno/2.9.0/bin/deno
deno 2.9.0 (stable, release, x86_64-unknown-linux-gnu)
v8 14.9.207.2-rusty
typescript 6.0.3
```

## MCP gateway observation

The MCP gateway status reported `chrome-devtools-mcp` as connected, but direct tool execution still
failed.

```text
mcp({})
MCP: 1/4 servers, 30 tools
✓ chrome-devtools-mcp (29 tools)
...

mcp({ tool: "chrome_devtools_mcp_list_pages", args: "{}" })
Failed to call tool: Not connected
Expected parameters:
  (no parameters)
```

This means the failure is not route availability or demo JavaScript syntax. It is a mismatch between
MCP discovery/status and the live DevTools MCP tool-call channel.
