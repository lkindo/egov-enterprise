import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import React from 'react';

describe('Tabs Component', () => {
  it('renders tabs structure correctly', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});