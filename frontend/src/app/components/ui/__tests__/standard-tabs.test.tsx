import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { StandardTabs, Tab, TabList, TabPanel, standardTabId, type TabActivation } from '../standard-tabs';

/**
 * 탭 원천(2026-10-18)의 키보드·시맨틱 계약. WAI-ARIA APG 탭 패턴: roving tabindex, 방향키·Home·End(끝에서 돈다),
 * 꺼진 탭 건너뛰기, automatic 은 옮긴 탭을 고르고 manual 은 포커스만 옮긴다. 고르기는 클릭과 같은 onClick 하나다.
 */

const TABS = [
  { id: 'a', label: '가' },
  { id: 'b', label: '나' },
  { id: 'c', label: '다' },
];

function Harness({ activation, disabled = [], onSelect = () => {}, initial = 'a' }: {
  activation?: TabActivation;
  disabled?: string[];
  onSelect?: (id: string) => void;
  initial?: string;
}) {
  const [active, setActive] = useState(initial);
  return (
    <>
      <TabList aria-label="구분" activation={activation}>
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            id={`t-${tab.id}`}
            selected={active === tab.id}
            aria-controls="p"
            disabled={disabled.includes(tab.id)}
            onClick={() => { onSelect(tab.id); setActive(tab.id); }}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanel id="p" aria-labelledby={`t-${active}`}>패널 {active}</TabPanel>
    </>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('TabList · Tab · TabPanel', () => {
  it('tablist·tab·tabpanel 역할과 aria-selected·aria-controls·aria-labelledby 를 갖는다', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: '구분' });
    expect(within(list).getAllByRole('tab')).toHaveLength(3);
    expect(tab('가')).toHaveAttribute('aria-selected', 'true');
    expect(tab('나')).toHaveAttribute('aria-selected', 'false');
    expect(tab('가')).toHaveAttribute('aria-controls', 'p');
    expect(tab('가')).toHaveAttribute('type', 'button');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 't-a');
    expect(list).not.toHaveAttribute('aria-orientation');
  });

  it('고른 탭만 Tab 순서에 든다(roving tabindex)', () => {
    render(<Harness />);
    expect(tab('가')).toHaveAttribute('tabindex', '0');
    expect(tab('나')).toHaveAttribute('tabindex', '-1');
    fireEvent.click(tab('나'));
    expect(tab('가')).toHaveAttribute('tabindex', '-1');
    expect(tab('나')).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 't-b');
  });

  it('automatic: 방향키가 포커스를 옮기고 그 탭을 클릭과 같은 길로 고르며, 끝에서 처음으로 돈다', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    tab('가').focus();

    fireEvent.keyDown(tab('가'), { key: 'ArrowRight' });
    expect(tab('나')).toHaveFocus();
    expect(tab('나')).toHaveAttribute('aria-selected', 'true');
    expect(onSelect).toHaveBeenLastCalledWith('b');

    fireEvent.keyDown(tab('나'), { key: 'ArrowRight' });
    fireEvent.keyDown(tab('다'), { key: 'ArrowRight' });
    expect(tab('가')).toHaveFocus();
    expect(tab('가')).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab('가'), { key: 'ArrowLeft' });
    expect(tab('다')).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith('c');
  });

  it('Home·End 는 처음·마지막 탭으로 간다', () => {
    render(<Harness initial="b" />);
    fireEvent.keyDown(tab('나'), { key: 'End' });
    expect(tab('다')).toHaveFocus();
    expect(tab('다')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('다'), { key: 'Home' });
    expect(tab('가')).toHaveFocus();
    expect(tab('가')).toHaveAttribute('aria-selected', 'true');
  });

  it('manual: 방향키는 포커스만 옮기고, 고르기는 그 탭의 클릭(Enter·Space)이다', () => {
    const onSelect = vi.fn();
    render(<Harness activation="manual" onSelect={onSelect} />);
    fireEvent.keyDown(tab('가'), { key: 'ArrowRight' });
    expect(tab('나')).toHaveFocus();
    expect(tab('나')).toHaveAttribute('aria-selected', 'false');
    expect(tab('가')).toHaveAttribute('aria-selected', 'true');
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(tab('나'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('꺼진 탭은 건너뛰고, 수정 키를 누른 방향키·다른 키는 다루지 않는다', () => {
    const onSelect = vi.fn();
    render(<Harness disabled={['b']} onSelect={onSelect} />);
    fireEvent.keyDown(tab('가'), { key: 'ArrowRight' });
    expect(tab('다')).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith('c');

    onSelect.mockClear();
    for (const init of [{ key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }, { key: 'ArrowRight', shiftKey: true }, { key: 'ArrowDown' }, { key: 'a' }]) {
      fireEvent.keyDown(tab('다'), init);
    }
    expect(onSelect).not.toHaveBeenCalled();
    expect(tab('다')).toHaveFocus();
  });

  it('세로 탭 목록은 ↑·↓ 로 옮기고 aria-orientation 을 말한다', () => {
    function Vertical() {
      const [active, setActive] = useState('a');
      return (
        <TabList aria-label="세로" orientation="vertical">
          {TABS.map((item) => (
            <Tab key={item.id} selected={active === item.id} onClick={() => setActive(item.id)}>{item.label}</Tab>
          ))}
        </TabList>
      );
    }
    render(<Vertical />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    fireEvent.keyDown(tab('가'), { key: 'ArrowDown' });
    expect(tab('나')).toHaveFocus();
    fireEvent.keyDown(tab('나'), { key: 'ArrowRight' });
    expect(tab('나')).toHaveFocus();
    fireEvent.keyDown(tab('나'), { key: 'ArrowUp' });
    expect(tab('가')).toHaveFocus();
  });

  it('안쪽의 다른 탭 목록 탭은 바깥 목록의 이동 대상이 아니다', () => {
    render(
      <TabList aria-label="바깥">
        <Tab selected onClick={() => {}}>바깥 1</Tab>
        <div>
          <TabList aria-label="안쪽">
            <Tab selected onClick={() => {}}>안쪽 1</Tab>
          </TabList>
        </div>
        <Tab selected={false} onClick={() => {}}>바깥 2</Tab>
      </TabList>,
    );
    fireEvent.keyDown(tab('바깥 1'), { key: 'ArrowRight' });
    expect(tab('바깥 2')).toHaveFocus();
  });

  it('asChild 로 Button 에 탭 속성을 얹고, 바깥 onKeyDown 이 막으면 이동하지 않는다', () => {
    const onKeyDown = vi.fn((event: React.KeyboardEvent) => event.preventDefault());
    render(
      <TabList aria-label="버튼" onKeyDown={onKeyDown}>
        <Tab asChild selected onClick={() => {}}><Button variant="ghost" size="sm">하나</Button></Tab>
        <Tab asChild selected={false} onClick={() => {}}><Button variant="ghost" size="sm">둘</Button></Tab>
      </TabList>,
    );
    expect(tab('하나')).toHaveAttribute('data-slot', 'button');
    expect(tab('하나')).toHaveAttribute('aria-selected', 'true');
    expect(tab('둘')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(tab('하나'), { key: 'ArrowRight' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(tab('둘')).not.toHaveFocus();
  });
});

describe('StandardTabs', () => {
  it('탭 역할·id·aria-controls 를 갖고, 고른 탭은 토큰 색(text-primary-foreground)을 쓴다', () => {
    const onChange = vi.fn();
    render(
      <StandardTabs
        items={[{ id: 'all', label: '전체', count: 3 }, { id: 'users', label: '임직원' }]}
        activeTab="all"
        onChange={onChange}
        label="결과 구분"
        idPrefix="search"
        panelId="search-panel"
      />,
    );
    const all = screen.getByRole('tab', { name: '전체 3건' });
    expect(screen.getByRole('tablist', { name: '결과 구분' })).toBeInTheDocument();
    expect(all).toHaveAttribute('id', standardTabId('search', 'all'));
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(all).toHaveAttribute('aria-controls', 'search-panel');
    expect(all).not.toHaveAttribute('aria-pressed');
    expect(all.className).toContain('text-primary-foreground');
    expect(all.className).not.toMatch(/\btext-white\b/);

    fireEvent.keyDown(all, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('users');
  });
});
