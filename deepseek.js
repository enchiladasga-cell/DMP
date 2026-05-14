const axios = require('axios');

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

async function askDeepseek(messages) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.9,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`,
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error al llamar a DeepSeek:', error.response?.data || error.message);
    return 'La bola de cristal se ha nublado... (Error al contactar con el Dungeon Master).';
  }
}

module.exports = { askDeepseek };