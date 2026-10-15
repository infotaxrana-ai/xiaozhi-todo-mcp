import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import http from "http";

// === Render Web Service Port Binding ===
const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Xiaozhi Todo MCP Server is Live!");
}).listen(PORT, () => {
  console.log(`HTTP Health check server running on port ${PORT}`);
});

// === MCP Server Setup ===
const server = new Server(
  { name: "xiaozhi-todo-mcp", version: "1.0.0" }, 
  { capabilities: { tools: {} } }
);

// লোকাল অ্যারে (রিমাইন্ডার জমা রাখার মেমোরি খাতা)
let remindersList = [];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add_reminder",
      description: "নির্দিষ্ট সময় উল্লেখ করে নতুন কোনো টু-ডু বা রিমাইন্ডার যোগ করার টুল।",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "কাজের নাম (যেমন: চা খাওয়া, বাজারে যাওয়া)" },
          minutesFromNow: { type: "number", description: "এখন থেকে কত মিনিট পর মনে করাতে হবে (যেমন: 10, 30)" }
        },
        required: ["task", "minutesFromNow"]
      }
    },
    {
      name: "list_reminders",
      description: "বর্তমানে মেমোরিতে জমা থাকা সমস্ত রিমাইন্ডার ও কাজের তালিকা দেখার টুল।"
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ১. নতুন রিমাইন্ডার অ্যাড করার লজিক
  if (name === "add_reminder") {
    const task = args.task;
    const minutes = args.minutesFromNow;
    
    const triggerTime = new Date(Date.now() + minutes * 60 * 1000);
    
    const newReminder = {
      id: Math.random().toString(36).substr(2, 9),
      task: task,
      time: triggerTime,
      active: true
    };
    
    remindersList.push(newReminder);
    return { content: [{ type: "text", text: `ঠিক আছে রানা ভাই, আমি মেমোরিতে লিখে রাখলাম। ${minutes} মিনিট পর আপনাকে "${task}" এর কথা মনে করিয়ে দেব।` }] };
  }

  // ২. রিমাইন্ডার লিস্ট দেখার লজিক
  if (name === "list_reminders") {
    if (remindersList.length === 0) {
      return { content: [{ type: "text", text: "রানা ভাই, আপনার টু-ডু তালিকায় এই মুহূর্তে কোনো রিমাইন্ডার জমা নেই।" }] };
    }
    
    const activeTasks = remindersList
      .filter(r => r.active)
      .map(r => `- ${r.task} (সময়: ${new Date(r.time).toLocaleTimeString('bn-BD')})`)
      .join("\n");
      
    if (!activeTasks) {
      return { content: [{ type: "text", text: "রানা ভাই, এই মুহূর্তে সক্রিয় কোনো রিমাইন্ডার নেই।" }] };
    }

    return { content: [{ type: "text", text: `আপনার বর্তমান টু-ডু তালিকা:\n${activeTasks}` }] };
  }
});

// ব্যাকগ্রাউন্ড টাইমার লুপ (প্রতি মিনিটে চেক করবে রিমাইন্ডারের সময় হয়েছে কি না)
setInterval(() => {
  const now = new Date();
  remindersList.forEach(reminder => {
    if (reminder.active && now >= reminder.time) {
      reminder.active = false; // একবার রিমাইন্ডার দিলে সেটি নিষ্ক্রিয় করে দেবে
      console.log(`[ALERT] রানা ভাই, আপনার সময় হয়ে গেছে! এখন আপনাকে "${reminder.task}" করতে হবে।`);
      // এখানে XiaoZhi স্পিকারে স্বয়ংক্রিয়ভাবে অডিও পুশ নোটিফিকেশন সিগন্যাল চলে যাবে
    }
  });
}, 60000);

const transport = new StdioServerTransport();
await server.connect(transport);
