import { DiscordService } from './discord.service';
import { HttpService } from '@nestjs/axios';

// Teste rápido do Discord
async function testDiscord() {
  const httpService = new HttpService();
  const discordService = new DiscordService(httpService);

  const webhookUrl = 'SUA_URL_DO_WEBHOOK_AQUI';
  const message =
    '🧪 **Teste de Notificação DevDeck**\n\nSe você está vendo isso, as notificações estão funcionando! ✅';

  await discordService.sendNotification(webhookUrl, message);
  console.log('Notificação de teste enviada!');
}

testDiscord().catch(console.error);
