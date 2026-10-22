import desktop from 'lighthouse/core/config/desktop-config.js'

export default {
  extends: 'lighthouse:default',
  settings: {
    ...(process.env.LIGHTHOUSE_PROFILE === 'desktop' ? desktop.settings : {}),
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
}
