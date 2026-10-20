export default {
  branches: ['main'],
  repositoryUrl: 'https://github.com/BragaHigor/jungle-gaming-challenge.git',
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits' },
    ],
    [
      '@semantic-release/github',
      { successComment: false, failComment: false, releasedLabels: false },
    ],
  ],
}
