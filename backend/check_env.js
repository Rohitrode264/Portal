const fs = require('fs');
require('dotenv').config();
const vars = {
  url: process.env.WHATSAPP_API_URL,
  phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  token: process.env.WHATSAPP_ACCESS_TOKEN ? 'EXISTS' : 'MISSING',
  template: process.env.WHATSAPP_TEMPLATE_NAME,
  lang: process.env.WHATSAPP_TEMPLATE_LANGUAGE
};
fs.writeFileSync('env_check.json', JSON.stringify(vars, null, 2));
