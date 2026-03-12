import next from 'eslint-config-next'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  // Base Next.js + TypeScript rules
  ...next,
  // Clean up unused imports/variables and relax some strict rules
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
  // Ignore generated/build artifacts
  {
    ignores: ['node_modules/**', '.next/**', 'pnpm-lock.yaml'],
  },
]

