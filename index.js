
require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiKey = process.env.OPENAI_API_KEY;

if (!token || !apiKey) {
  console.error("Kerakli kalitlar topilmadi!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });
const openai = new OpenAI({ apiKey });

app.get("/", (req, res) => {
  res.send("Gofurjon AI bot serveri ishlayapti!");
});

app.post("/telegram-webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Salom! Men Gofurjon AI botman 🤖\nSavolingizni yozing!"
  );
});

bot.on("message", async (msg) => {
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  try {
    await bot.sendChatAction(msg.chat.id, "typing");

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: text
    });

    await bot.sendMessage(
      msg.chat.id,
      response.output_text || "Javob topilmadi."
    );
  } catch (error) {
    console.error("API xatosi:", error.status || "noma'lum");
    await bot.sendMessage(
      msg.chat.id,
      "Hozir javob berishda xatolik yuz berdi."
    );
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);

  const baseUrl = process.env.RENDER_EXTERNAL_URL;

  if (baseUrl) {
    try {
      await bot.setWebHook(`${baseUrl}/telegram-webhook`);
      console.log("Telegram webhook sozlandi!");
    } catch (error) {
      console.error("Webhook sozlash xatosi:", error.message);
    }
  }
});
