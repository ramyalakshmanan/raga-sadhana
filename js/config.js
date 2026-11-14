// Site settings.
//
// chatProxyUrl: address of a server that adds your Anthropic API key to chat
// requests (see worker/chat-proxy.js and the README). When it is set, every
// learner can use the chat without a key of their own. When it is empty, the
// chat asks each person for their own key, which stays in their browser.
//
// Never put an API key in this file: the site is public.
window.RAGA_SADHANA_CONFIG = {
  // Set to true to show the "Ask a doubt" chat button on every page.
  chatEnabled: false,
  chatProxyUrl: '',
};
