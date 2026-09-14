import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchResultsSlot from '../SearchResultsSlot';

const renderContent = vi.hoisted(() => vi.fn());
vi.mock('../SearchClient', () => ({
  SearchResultsContent: (props: { query: string; queryError?: string }) => {
    renderContent(props);
    return <div>{props.queryError ? <p role="alert">{props.queryError}</p> : props.query}</div>;
  },
}));
afterEach(() => { cleanup(); renderContent.mockClear(); });

describe('the streamed server slot executes its URL state contract', () => {
  it('passes a valid decoded query unchanged while ignoring unrelated bookmark keys', async () => {
    render(await SearchResultsSlot({ searchParams: Promise.resolve({ q: '한글 + 100%', tracking: 'synthetic' }) }));
    expect(renderContent.mock.lastCall?.[0]).toMatchObject({ query: '한글 + 100%', queryError: undefined });
  });

  it.each([{ q: ['first', 'second'] }, { q: '한'.repeat(201) }])('never forwards invalid search values to API-driving content', async input => {
    render(await SearchResultsSlot({ searchParams: Promise.resolve(input) }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(renderContent.mock.lastCall?.[0]).toMatchObject({ query: '' });
  });
});
