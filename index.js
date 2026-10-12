
require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiKey = process.env.OPENAI_API_KEY;

if (!token || !apiKey) {
  console.error("Kerakli kalitlar topilmadi!");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function telegram(method, body) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API xatosi");
  }

  return data.result;
}

app.get("/", (req, res) => {
  res.send("Gofurjon AI bot serveri ishlayapti!");
});

app.post("/telegram-webhook", async (req, res) => {
  // Telegram yangilanish qabul qilinganini tezda tasdiqlaymiz.
  res.sendStatus(200);

  const msg = req.body?.message;
  const chatId = msg?.chat?.id;
  const userText = msg?.text;

  if (!chatId || !userText) return;

  try {
    if (userText.startsWith("/start")) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: "Salom! Men Gofurjon AI botman 🤖\nSavolingizni yozing!"
      });
      return;
    }

    if (userText.startsWith("/")) return;

    await telegram("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    });

    const result = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: userText
    });

    const answer = result.output_text || "Javob topilmadi.";

    // Telegram matn chegarasidan oshmasligi uchun bo‘lib yuboramiz.
    for (let i = 0; i < answer.length; i += 4000) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: answer.slice(i, i + 4000)
      });
    }
  
  } catch (error) {
    console.error("AI API xatosi:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    try {
      await bot.sendMessage(
        msg.chat.id,
        "Hozir javob berishda xatolik yuz berdi. Keyinroq urinib ko‘ring."
      );
    } catch (sendError) {
      console.error("Telegram xatosi:", sendError.message);
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);

  const baseUrl = process.env.RENDER_EXTERNAL_URL;

  if (baseUrl) {
    try {
      await telegram("setWebhook", {
        url: `${baseUrl}/telegram-webhook`
      });
      console.log("Telegram webhook sozlandi!");
    } catch (error) {
      console.error("Webhook sozlash xatosi:", error.message);
    }
  }
});
