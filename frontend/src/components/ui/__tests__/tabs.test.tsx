vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

describe('Tabs Component', () => {
 it('renders tabs structure correctly', () => {
 render(
 <Tabs defaultValue="tab1">
 <TabsList>
 <TabsTrigger value="tab1">님1</TabsTrigger>
 </TabsList>
 <TabsContent value="tab1">콘텐츠1</TabsContent>
 </Tabs>
 );

 expect(screen.getByText(/님1/)).toBeInTheDocument();
 expect(screen.getByText(/콘텐츠1/)).toBeInTheDocument();
 });
});
