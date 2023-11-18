require('dotenv').config();
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const IGNORE_PREFIX = '!';
const CHANNELS = ['1175213032981405848'];
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conservation = [];
    conservation.push({
        role: 'system',
        content: 'ChatGPT is a friendly chatbot. It is helpful, creative, clever, and very friendly'
    });

    let previousMessage = await message.channel.messages.fetch({ limit: 10 });
    previousMessage.reverse();

    previousMessage.forEach((message) => {
        if (message.author.bot && message.author.id !== client.user.id) return;
        if (message.content.startsWith(IGNORE_PREFIX)) return;

        const username = message.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (message.author.id === client.user.id) {
            conservation.push({
                role: 'assistant',
                name: username,
                content: message.content,
            });
            return;
        }
        conservation.push({
            role: 'user',
            name: username,
            content: message.content,
        });
    });

    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: conservation
    }).catch((error) => console.error(error));
    clearInterval(sendTypingInterval);

    if (!response) {
        return message.reply("I'm having some trouble right now. Please try again later.");
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
        await message.reply(chunk);
    }
    message.reply();
});

client.login(process.env.TOKEN);