var fs = require('fs');
require('dotenv').config();
const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
const SQLite = require("better-sqlite3");
const sql = new SQLite('./ignore-list.sqlite');

const match = new RegExp(/>!(.*?)!</);

var botReply = `Thank you for using the correct method of hiding spoilers, which works across almost all platforms. (The mobile website is one exception.).

For those of you who are unaware, rather than following a spoiler format such as \`[Something](/s 'spoiler in here')\` (May be different subreddit to subreddit, depends on their CSS), you can just surround your spoiler contents with \`>!\` and \`!<\` which will give you >!Spoiler!< and looks like this \`>!Spoiler!<\` ^^No ^^Spaces!

You can also use just \`>!\` at the beginning of a paragraph to mark the entire paragraph as a spoiler.

More tips and tricks related to formatting can be found here: https://www.reddit.com/wiki/markdown

^^^I ^^^am ^^^a ^^^bot, ^^^Please ^^^send ^^^any ^^^feedback ^^^to ^^^my ^^^creator ^^^[here.](https://www.reddit.com/message/compose/?to=xlet_cobra) ^^^[Source](https://github.com/OfficialRenny/reddit-spoiler-bot)

Reply with \`!optout\` to opt out of my messages.`;

init();
Client = {}
Client.getUser = sql.prepare("SELECT * FROM users WHERE username = ?");
Client.getSub = sql.prepare("SELECT * FROM subreddits WHERE subreddit = ?");
Client.getThread = sql.prepare("SELECT * FROM threads WHERE thread = ?");
Client.ignoreUser = sql.prepare("INSERT OR REPLACE INTO users (username) VALUES (?);");
Client.ignoreSub = sql.prepare("INSERT OR REPLACE INTO subreddits (subreddit) VALUES (?);");
Client.ignoreThread = sql.prepare("INSERT OR REPLACE INTO threads (thread) VALUES (?);");
Client.optInUser = sql.prepare("DELETE FROM users WHERE username = ?;");
Client.optInSub = sql.prepare("DELETE FROM subreddits WHERE subreddit = ?;");
Client.readMail = sql.prepare("INSERT OR REPLACE INTO read_messages (message_id) VALUES (?);");
Client.getMail = sql.prepare("SELECT * FROM read_messages WHERE message_id = ?");


const r = new Snoowrap({
    userAgent: 'rennys-bot',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const client = new Snoostorm(r);

const streamOpts = {
    subreddit: 'rennystestingfacility',
    results: 25
};

const commentStream = client.CommentStream(streamOpts);
commentStream.on('comment', (comment) => {
    let user = Client.getUser.get(comment.author.name);
    let sub = Client.getSub.get(comment.subreddit.display_name);
    let thread = Client.getThread.get(comment.link_id);
    if (user || sub || thread) return;
    r.getSubreddit(comment.subreddit.display_name).fetch().then(subInfo => {
        if (subInfo.description.match(match)) {
            console.log(`${comment.subreddit.display_name} already enforces the correct spoiler format, adding them to the ignore list.`);
            Client.ignoreSub.run(comment.subreddit.display_name);
        }
    });
    if (comment.body.match(match)) { 
        Client.ignoreThread.run(thread);
        console.log(comment);
        console.log('Found a comment by ' + comment.author.name + ' in ' + comment.subreddit_name_prefixed + ' which contained a spoiler.'); //nvm, would rather keep the console log to actually get some feedback from the bot
        comment.reply(botReply).catch((err) => {
            console.log(err.message);
            });
    }
});

const inboxStream = client.InboxStream(streamOpts);
inboxStream.on('PrivateMessage', (dm) => {
    let m = Client.getMail.get(dm.id);
    if (!m) { Client.readMail.run(dm.id); } else return;
    let sender = (!dm.author.name) ? 'r/' + dm.subreddit.display_name : dm.author.name;
    console.log('Received a PM from ' + sender);
    if (dm.body.startsWith('!')) {
        const args = dm.body.split(/\s+/g);
        const cmd = args.shift().slice(1).toLowerCase();
        let u = Client.getUser.get(dm.author.name);
        switch (cmd) {
            case 'optout':
                if (u) return;
                Client.ignoreUser.run(dm.author.name);
                dm.reply('You have opted out, this will be the last time I reply to you unless you opt back in with `!optin`');
                console.log(`${dm.author.name} opted out.`);
                break;
            case 'optin':
                if (!u) return;
                Client.optInUser.run(dm.author.name);
                dm.reply('You have successfully opted back in.');
                console.log(`${dm.author.name} opted in.`);
                break;
            case 'subout':
                if (args.length < 1) return;
                if (dm.author.name != process.env.DEV_USERNAME || !(dm.distinguished == 'moderator' && dm.subreddit.display_name.toLowerCase() == args[0].toLowerCase())) return;
                r.getSubreddit(args[0]).then(sub => {
                    Client.ignoreSub.run(args[0]);
                    dm.reply('Successfully ignoring r/' + args[0]);
                    });
                break;
            case 'subin':
                if (args.length < 1) return;
                if (dm.author.name != process.env.DEV_USERNAME || !(dm.distinguished == 'moderator' && dm.subreddit.display_name.toLowerCase() == args[0].toLowerCase())) return;
                r.getSubreddit(args[0]).then(sub => {
                    Client.optInSub.run(args[0]);
                    dm.reply('Opting back into r/' + args[0]);
                    });
                break;
            default:
                return;
        }
    }
    if (dm.subreddit && dm.distinguished == 'moderator' && dm.subject.includes('banned from participating in')) {
        console.log('Was just banned from ' + dm.subreddit.display_name);
        r.composeMessage({
            to: process.env.DEV_USERNAME,
            subject: 'Banned from ' + dm.subreddit.display_name,
            text: 'Just a heads up.'
            });
        Client.ignoreSub.run(dm.subreddit.display_name);
    }
});

function init() {
    sql.prepare("CREATE TABLE IF NOT EXISTS 'users' (username TEXT PRIMARY KEY)").run();
    sql.prepare("CREATE TABLE IF NOT EXISTS 'subreddits' (subreddit TEXT PRIMARY KEY)").run();
    sql.prepare("CREATE TABLE IF NOT EXISTS 'threads' (thread TEXT PRIMARY KEY)").run();
    sql.prepare("CREATE TABLE IF NOT EXISTS 'read_messages' (message_id TEXT PRIMARY KEY)").run();

}

console.log('Running okay!');
