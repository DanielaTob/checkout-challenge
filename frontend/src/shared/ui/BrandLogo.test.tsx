import { render, screen } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('AC-002-02 renders an accessible VISA logo', () => {
    render(<BrandLogo brand="VISA" />);
    expect(screen.getByRole('img', { name: 'VISA' })).toBeInTheDocument();
  });

  it('AC-002-02 renders an accessible MasterCard logo', () => {
    render(<BrandLogo brand="MASTERCARD" />);
    expect(screen.getByRole('img', { name: 'MasterCard' })).toBeInTheDocument();
  });
});
