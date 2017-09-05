require('dotenv').config();

const Telegraf = require('telegraf');
const axios = require('axios');
const app = new Telegraf(process.env.BOT_TOKEN);
const { Markup } = require('telegraf');

let state = {};

app.command('top', ctx => {
  const userId = ctx.message.from.id;

  // if user id does not exist create one  
  if (!state[userId])
    state[userId] = { id: userId };

  // save/update user last command    
  state[userId].command = 'top';
  return ctx.replyWithMarkdown(`Enter a subreddit name to get *top* posts.`);
});

app.command('hot', ctx => {
  const userId = ctx.message.from.id;
  if (!state[userId])
    state[userId] = { id: userId };
  state[userId].command = 'hot';
  return ctx.replyWithMarkdown('Enter a subreddit name to get *hot* posts.');
});

app.on('text', ctx => {
  const subreddit = ctx.message.text;

  const userId = ctx.message.from.id;
  // check if state and command exists and set defaults

  if (!state[userId])
    state[userId] = {};
  state[userId].index = 0;
  
  const type = !state[userId] ? 
      'top' : 
      state[userId].command ? 
        state[userId].command : 
        'top';
  axios.get(`https://reddit.com/r/${subreddit}/${type}.json?limit=10`)
    .then(res => [
      // do stuff
    ])

  axios.get(`https://reddit.com/r/${subreddit}/top.json?limit=10`)
  .then(res => {

    // data recieved from Reddit
    const data = res.data.data;

    // if subbreddit does not exist
    if (data.children.length < 1) 
      return ctx.reply('The subreddit couldn\'t be found.');

    // send the first top post link to the user
    const link = `https://reddit.com/${data.children[0].data.permalink}`;
    // new response, with inline buttons
    return ctx.reply(link, 
      Markup.inlineKeyboard([
        // first argument is button's text
        // second argument is callback text
        Markup.callbackButton('➡️ Next', subreddit),
      ]).extra()
    );
  })

  // if there's any error in request
  .catch(err => console.log(err));
});

app.on('callback_query', ctx => {
	// get info from callback_query object
  const subreddit = ctx.update.callback_query.data;
  const userId = ctx.update.callback_query.from.id;

	// check if user state and its properties exist
  let type;
  let index;
  try {
    type = state[userId].command ? state[userId].command : 'top';
    index = state[userId].index;
  } catch (err) {
    return ctx.reply('Send a subreddit name.');
  }

	// reply with a popup to callback
  ctx.answerCallbackQuery('Wait...');

  axios.get(`https://reddit.com/r/${subreddit}/${type}.json?limit=10`)
    .then(res => {
      const data = res.data.data;

			// check if next one exists
      if (!data.children[index + 1])
        return ctx.reply('No more posts!');
      
			// send next link and update the user state with new index
      const link = `https://reddit.com/${data.children[index + 1].data.permalink}`;
      state[userId].index = state[userId].index + 1;
      return ctx.reply(link, 
        Markup.inlineKeyboard([
          Markup.callbackButton('➡️ Next', subreddit),
        ]).extra()
      );
    })
    .catch(err => console.log(err));
});

app.startPolling();
