vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import React from 'react';

describe('Tabs Component', () => {
 it('renders tabs structure correctly', () => {
 render(
 <Tabs defaultValue="tab1">
 <TabsList>
 <TabsTrigger value="tab1">님1</TabsTrigger>
 </TabsList>
 <TabsContent value="tab1">肄섑뀗痢1</TabsContent>
 </Tabs>
 );

 expect(screen.getByText('님1')).toBeInTheDocument();
 expect(screen.getByText('肄섑뀗痢1')).toBeInTheDocument();
 });
});
