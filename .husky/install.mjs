if (process.env.CI !== 'true' && process.env.NODE_ENV !== 'production') {
  const { default: husky } = await import('husky')
  husky()
}
