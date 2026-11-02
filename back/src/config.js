// Lit la configuration depuis les variables d'environnement (voir .env.example).
const env = process.env;

module.exports = {
  port: Number(env.PORT || 3000),
  v2: {
    baseUrl: env.SELLSY_V2_BASE_URL || 'https://api.sellsy.com/v2',
    tokenUrl: env.SELLSY_V2_TOKEN_URL || 'https://login.sellsy.com/oauth2/access-tokens',
    clientId: env.SELLSY_V2_CLIENT_ID,
    clientSecret: env.SELLSY_V2_CLIENT_SECRET,
  },
  v1: {
    endpoint: env.SELLSY_V1_ENDPOINT || 'https://apifeed.sellsy.com/0/',
    consumerToken: env.SELLSY_V1_CONSUMER_TOKEN,
    consumerSecret: env.SELLSY_V1_CONSUMER_SECRET,
    userToken: env.SELLSY_V1_USER_TOKEN,
    userSecret: env.SELLSY_V1_USER_SECRET,
  },
};
