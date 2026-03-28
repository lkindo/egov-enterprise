vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../card';
import { describe, it, expect } from 'vitest';

describe('Card', () => {
 it('renders card with header, content and footer', () => {
 render(
 <Card>
 <CardHeader>
 <CardTitle>Card Title</CardTitle>
 </CardHeader>
 <CardContent>
 <p>Card Content</p>
 </CardContent>
 <CardFooter>
 <button>Footer Button</button>
 </CardFooter>
 </Card>
 );

 expect(screen.getByText('Card Title')).toBeDefined();
 expect(screen.getByText('Card Content')).toBeDefined();
 expect(screen.getByText('Footer Button')).toBeDefined();
 });

 it('applies custom classes', () => {
 render(
 <Card className="custom-class">
 <CardContent>내용</CardContent>
 </Card>
 );
 // Find the card container (parent of content)
 // Since Shadcn Card renders a div, we check if the container has the class
 // Using a test-id or simply checking structure
 const content = screen.getByText('내용');
 // Card component renders children inside a div with bg-card class
 // The custom class is applied to the root div
 expect(content.parentElement).toHaveClass('custom-class');
 });
});
