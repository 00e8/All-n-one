const axios = require("axios");

const nekoEndpoints = {
  hug: "hug",
  kiss: "kiss",
  pat: "pat",
  slap: "slap",
  poke: "poke",
  tickle: "tickle",
  wink: "wink",
  blush: "blush",
  cry: "cry",
  dance: "dance",
  laugh: "laugh",
  smile: "smile",
  sleep: "sleep",
  shrug: "shrug",
  facepalm: "facepalm",
  thumbsup: "thumbsup",
  run: "run",
  eat: "feed",
  deathstare: "stare"
};

async function getNekoGif(action) {
  try {
    const endpoint = nekoEndpoints[action];
    if (!endpoint) {
      return null;
    }
    
    const response = await axios.get(`https://nekos.best/api/v2/${endpoint}`, {
      headers: {
        // nekos.best requires a real identifying User-Agent in the form
        // "APP_NAME/VERSION (WEBSITE_URL)". Pretending to be a browser (the
        // old Chrome UA) gets flagged by their anti-bot protection and
        // rejected with 403, which is why every roleplay command was failing.
        'User-Agent': 'HanaDiscordBot/1.0 (https://discord.gg/wwv)',
        'Accept': 'application/json'
      },
      timeout: 8000
    });
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].url;
    }
  } catch (error) {
    console.error(`Error fetching Neko GIF for ${action}:`, error.message);
  }
  return null;
}

function hasNekoEndpoint(action) {
  return nekoEndpoints.hasOwnProperty(action);
}

module.exports = { getNekoGif, nekoEndpoints, hasNekoEndpoint };