import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    apple: {
      sizes: [180],
      padding: 0.1,
    },
    maskable: {
      sizes: [512],
      padding: 0.05,
      resizeOptions: { background: '#f5c518' },
    },
    transparent: {
      sizes: [64, 192, 512],
      padding: 0.05,
      resizeOptions: { background: '#ffffff' },
    },
  },
  images: ['public/logo.jpg'],
})
