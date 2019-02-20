require('dotenv').config();
const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');

var botReply = `I want to say thank you for using the correct method of hiding spoilers, which works globally across all platforms even if you have CSS disabled.

For those of you who are unaware, rather than following a spoiler format such as \`[spoiler in here](#s)\` or something similar, you can just surround your spoiler contents with \`>!\` and \`!<\` which will give you >!Spoiler!<.

You can also use just \`>!\` at the beginning of a paragraph to mark the entire paragraph as a spoiler.

More tips tricks related to formatting can be found here: https://www.reddit.com/wiki/markdown

^^^I ^^^am ^^^a ^^^bot, ^^^created ^^^by ^^^/u/xlet_cobra. ^^^Please ^^^send ^^^any ^^^feedback ^^^[here.](https://www.reddit.com/message/compose/?to=xlet_cobra)`;

const r = new Snoowrap({
    userAgent: 'rennys-bot',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});
const client = new Snoostorm(r);

const streamOpts = {
    subreddit: 'all',
    results: 100
};

const comments = client.CommentStream(streamOpts);
comments.on('comment', (comment) => {
    if (comment.author.name == process.env.REDDIT_USER) return;
    let match = comment.body.match(/>!(.*?)!</);
    if (match) { 
        console.log('Found a comment by ' + comment.author.name + ' in ' + comment.subreddit_name_prefixed + ' which contained a spoiler.');
        comment.reply(botReply).catch((err) => {
            console.log(err.message);
            });
    }
});
