const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    NoSubscriberBehavior,
    entersState,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const { spawn } = require('child_process');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let player;
let connection;

client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 🎵 PLAY
    if (message.content === '!play') {

        const vc = message.member.voice.channel;
        if (!vc) return message.reply('❌ Join VC first');

        const conn = joinVoiceChannel({
            channelId: vc.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false
        });

        try {
            await entersState(conn, VoiceConnectionStatus.Ready, 20000);
        } catch {
            return message.reply('❌ Voice connection failed');
        }

        connection = conn;

        const filePath = "audio.mp3";

        const ffmpeg = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', filePath,
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            'pipe:1'
        ]);

        const resource = createAudioResource(ffmpeg.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: true // 🔥 ENABLE VOLUME
        });

        resource.volume.setVolume(500); // 🔥 MAX LOUD

        const audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });

        player = audioPlayer;

        player.on('error', err => {
            console.error("❌ Player error:", err);
        });

        connection.subscribe(player);

        setTimeout(() => {
            player.play(resource);
        }, 300);

        message.reply('🎵 Playing (MAX VOLUME)');
    }

    // 🔊 VOLUME CONTROL
    if (message.content.startsWith('!volume')) {
        const args = message.content.split(" ");
        const vol = parseFloat(args[1]);

        if (isNaN(vol) || vol < 0 || vol > 2) {
            return message.reply("❌ Volume must be 0 - 2");
        }

        try {
            player.state.resource.volume.setVolume(vol);
            message.reply(`🔊 Volume set to ${vol}`);
        } catch {
            message.reply("❌ Nothing playing");
        }
    }

    // ⛔ STOP
    if (message.content === '!stop') {
        try {
            player.stop();
            connection.destroy();
            message.reply("⛔ Stopped");
        } catch {
            message.reply("❌ Nothing to stop");
        }
    }
});
client.login('TOKEN_HERE');
