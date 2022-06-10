const getUserLanguage = () => {
  const language = (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    navigator.userLanguage ||
    navigator.browserLanguage

  return language == ('ja' || 'ja-JP') ? 'ja' : 'en'
}

const messages = {
  'en': require('./translate/en.json'),
  'ja': require('./translate/ja.json')
}

export {
  getUserLanguage,
  messages
}
