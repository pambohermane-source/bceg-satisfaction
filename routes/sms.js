const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey: 'atsk_f3ce0f85b86ee90abde45341a70f25ccf11bba2cd3aa0b1446b4fbc4b4fafa0e5035f3ae',
  username: 'sandbox'
});

const sms = at.SMS;

const envoyerSMS = async (telephone, message) => {
  try {
    const result = await sms.send({
      to: ['+241' + telephone],
      message: message
    });
    console.log('SMS envoyé ✅', result);
    return result;
  } catch (err) {
    console.log('Erreur SMS:', err.message);
  }
};

module.exports = { envoyerSMS };