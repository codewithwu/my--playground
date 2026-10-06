import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.tmptest'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── 安全约束:富文本只能从消毒出口进 DOM ──
  // 09 的正文和 10 的评论都是用户可控的 HTML。密钥存在 sessionStorage 里,
  // 一次 XSS 就能拿走所有在线访客的 Access Secret。
  // 所以 dangerouslySetInnerHTML 全项目只允许出现在 components/SafeHtml.tsx,
  // 而且那里只喂 sanitize() 的结果。PLAN.md §6。
  {
    files: ['**/*.tsx'],
    ignores: ['**/components/SafeHtml.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            '禁止直接使用 dangerouslySetInnerHTML。请用 <SafeHtml html={...} />,' +
            '它会统一经过 DOMPurify 消毒。唯一例外是 components/SafeHtml.tsx 本身。',
        },
      ],
    },
  },
)
