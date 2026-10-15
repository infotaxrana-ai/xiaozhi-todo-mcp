import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "xiaozhi-todo-mcp", version: "1.0.0" }, 
  { capabilities: { tools: {} } }
);

// ধাপ ২: লোকাল অ্যারে (রিমাইন্ডার জমা রাখার অস্থায়ী মেমোরি খাতা)
let remindersList = [];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "add_reminder",
      description: "নির্দিষ্ট সময় উল্লেখ করে নতুন কোনো টু-ডু বা রিমাইন্ডার যোগ করার টুল।",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "কাজের নাম (যেমন: চা খাওয়া, বাজারে যাওয়া)" },
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
    return { content: [{ type: "text", text: `ঠিক আছে রাজ ভাই, আমি মেমোরিতে লিখে রাখলাম। ${minutes} মিনিট পর আপনাকে "${task}" এর কথা মনে করিয়ে দেব।` }] };
  }

  // ২. রিমাইন্ডার লিস্ট দেখার লজিক
  if (name === "list_reminders") {
    if (remindersList.length === 0) {
      return { content: [{ type: "text", text: "রাজ ভাই, আপনার টু-ডু তালিকায় এই মুহূর্তে কোনো রিমাইন্ডার জমা নেই।" }] };
    }
    
    const activeTasks = remindersList
      .map(r => `- ${r.task} (সময়: ${r.time.toLocaleTimeString('bn-BD')})`)
      .join("\n");
      
    return { content: [{ type: "text", text: `আপনার বর্তমান টু-ডু তালিকা:\n${activeTasks}` }] };
  }
});

// ব্যাকগ্রাউন্ড টাইমার লুপ (প্রতি মিনিটে চেক করবে রিমাইন্ডারের সময় হয়েছে কি না)
setInterval(() => {
  const now = new Date();
  remindersList.forEach(reminder => {
    if (reminder.active && now >= reminder.time) {
      reminder.active = false; // একবার রিমাইন্ডার দিলে সেটি নিষ্ক্রিয় করে দেবে
      console.log(`[ALERT] রাজ ভাই, আপনার সময় হয়ে গেছে! এখন আপনাকে "${reminder.task}" করতে হবে।`);
      // এখানে XiaoZhi স্পিকারে স্বয়ংক্রিয়ভাবে অডিও পুশ নোটিফিকেশন সিগন্যাল চলে যাবে
    }
  });
}, 60000);

const transport = new StdioServerTransport();
await server.connect(transport);
