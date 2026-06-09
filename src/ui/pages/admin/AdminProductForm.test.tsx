import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminProductForm } from './product-form';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

const mockServices = {
  productService: {
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  },
  taxonomyService: {
    getCategories: vi.fn(() => Promise.resolve([])),
    getTypes: vi.fn(() => Promise.resolve([])),
  },
  authService: {
    getCurrentUser: vi.fn(() => Promise.resolve({ id: 'user-1', email: 'test@test.com' })),
  },
};

vi.mock('../../hooks/useServices', () => ({
  useServices: () => mockServices,
}));

vi.mock('../../components/admin/AdminComponents', () => ({
  SkeletonPage: () => <div data-testid="skeleton">Loading...</div>,
  AdminConfirmDialog: ({ open, title }: { open: boolean; title: string }) => open ? <div>{title}</div> : null,
  useToast: () => ({
    toast: vi.fn(),
  }),
  HelpTooltip: ({ text }: { text: string }) => <span title={text}>?</span>,
}));

describe('AdminProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders for new product creation', async () => {
    render(<AdminProductForm />);

    expect(screen.getByText(/New product/i)).toBeInTheDocument();
    expect(screen.getByTestId('product-name')).toBeInTheDocument();
    expect(screen.getByTestId('product-description')).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity available/i)).toBeInTheDocument();
  });

  it('shows error if saving with invalid price', async () => {
    const user = userEvent.setup();
    render(<AdminProductForm />);

    await user.type(screen.getByTestId('product-name'), 'Cold Brew Latte');
    await user.type(screen.getByTestId('product-description'), 'Single-origin cold brew with oat milk.');
    await user.type(screen.getByTestId('product-price'), '-10');
    await user.type(screen.getByTestId('product-stock'), '5');

    await user.click(screen.getByRole('button', { name: /save product/i }));

    await waitFor(() => {
      expect(screen.getByText(/Price must be a non-negative/i)).toBeInTheDocument();
    });
  });

  it('calls createProduct on successful submission', async () => {
    const user = userEvent.setup();
    render(<AdminProductForm />);

    await user.type(screen.getByTestId('product-name'), 'Cold Brew Latte');
    await user.type(screen.getByTestId('product-description'), 'Single-origin cold brew with oat milk.');
    await user.type(screen.getByTestId('product-price'), '10.50');
    await user.type(screen.getByTestId('product-stock'), '5');

    await user.click(screen.getByRole('button', { name: /save product/i }));

    await waitFor(() => {
      expect(mockServices.productService.createProduct).toHaveBeenCalled();
    });
  });
});
