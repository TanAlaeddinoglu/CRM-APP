import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductsPage from '../../src/pages/ProductsPage.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}))

vi.mock('../../src/services/product.js', () => ({
  getProducts: vi.fn().mockResolvedValue({ data: [] }),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}))

vi.mock('../../src/components/ProductList.jsx', () => ({
  default: () => <div data-testid="product-list" />,
}))

vi.mock('../../src/context/PageTransitionContext.jsx', () => ({
  PageTransitionProvider: ({ children }) => children,
  usePageTransition: () => ({ registerLoader: vi.fn(), unregisterLoader: vi.fn() }),
}))

vi.mock('../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => null,
}))

describe('ProductsPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProductsPage />)
    expect(container).toBeDefined()
  })
})
