const { askDeepseek } = require('../services/deepseek');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    
    if (!message.channel.isThread() || !message.channel.name.startsWith('🧭')) return;
    
    await message.channel.sendTyping();
    
    const fetchedMessages = await message.channel.messages.fetch({ limit: 20 });
    const history = [];
    fetchedMessages.reverse().forEach(msg => {
      let role = msg.author.bot ? 'assistant' : 'user';
      if (role === 'user' || (role === 'assistant' && !msg.content.startsWith('**'))) {
        history.push({ role, content: msg.content });
      }
    });
    
    const systemPrompt = `Eres el Dungeon Master de "Ecos de Eldoria". Continúa la aventura manteniendo el sistema d20, ofreciendo opciones claras y drops de botín. Sé creativo.`;
    history.unshift({ role: 'system', content: systemPrompt });
    
    const respuesta = await askDeepseek(history);
    if (respuesta) {
      await message.channel.send(respuesta);
    }
  }
};
