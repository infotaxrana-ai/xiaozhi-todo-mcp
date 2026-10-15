import WebSocket from "ws";
import http from "http";

const PORT = process.env.PORT || 10000;
const XIAOZHI_WSS_URL = "wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMzIwNzcsImFnZW50SWQiOjI0OTc5NTgsImVuZHBvaW50SWQiOiJhZ2VudF8yNDk3OTU4IiwicHVycG9zZSI6Im1jcC1lbmRwb2ludCIsImlhdCI6MTc5MjA0NTAyMywiZXhwIjoxODIzNjAyNjIzfQ.IxfB-uqYWVbFWRTVjvDXaQ8BF1yUb_kbC1-iRzcYKVpw1RbpXNf1JizO37DWz8__B64iUC0FUDF2M00FSjI5aA";

let remindersList = [];

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Xiaozhi Todo MCP is Live!");
}).listen(PORT, () => console.log(`Health check on port ${PORT}`));

function connect() {
  const ws = new WebSocket(XIAOZHI_WSS_URL);
  ws.on("open", () => console.log("Connected Todo MCP to Xiaozhi!"));

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.method === "tools/list") {
        ws.send(JSON.stringify({
          jsonrpc: "2.0", id: msg.id,
          result: {
            tools: [
              {
                name: "add_reminder",
                description: "নতুন টু-ডু বা রিমাইন্ডার যোগ করার টুল।",
                inputSchema: {
                  type: "object",
                  properties: {
                    task: { type: "string", description: "কাজের নাম" },
                    minutesFromNow: { type: "number", description: "কত মিনিট পর মনে করাতে হবে" }
                  },
                  required: ["task", "minutesFromNow"]
                }
              },
              {
                name: "list_reminders",
                description: "বর্তমান টু-ডু ও রিমাইন্ডার তালিকা দেখার টুল।"
              }
            ]
          }
        }));
      }

      if (msg.method === "tools/call") {
        const { name, arguments: args } = msg.params || {};

        if (name === "add_reminder") {
          const triggerTime = new Date(Date.now() + args.minutesFromNow * 60 * 1000);
          remindersList.push({ id: Math.random().toString(36).substr(2, 9), task: args.task, time: triggerTime, active: true });
          
          ws.send(JSON.stringify({
            jsonrpc: "2.0", id: msg.id,
            result: { content: [{ type: "text", text: `ঠিক আছে রানা ভাই, ${args.minutesFromNow} মিনিট পর আপনাকে "${args.task}" এর কথা মনে করিয়ে দেব।` }] }
          }));
        }

        if (name === "list_reminders") {
          const activeTasks = remindersList
            .filter(r => r.active)
            .map(r => `- ${r.task} (সময়: ${new Date(r.time).toLocaleTimeString('bn-BD')})`)
            .join("\n");

          const text = activeTasks ? `রানা ভাই, আপনার বর্তমান টু-ডু তালিকা:\n${activeTasks}` : "রানা ভাই, আপনার কোনো সক্রিয় রিমাইন্ডার নেই।";
          ws.send(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text }] } }));
        }
      }
    } catch (e) {}
  });

  ws.on("close", () => setTimeout(connect, 5000));
}
connect();
