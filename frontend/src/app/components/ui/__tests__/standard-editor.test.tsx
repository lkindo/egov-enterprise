import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  StandardEditor,
  applyInlineTag,
  applyLinkTag,
  applyListTag,
} from '../standard-editor';

/**
 * 본문 편집기 툴바 계약.
 *
 * [무엇이 문제였나 — 2026-09-03 실측]
 * 툴바 버튼 12개(굵게·기울임·코드·글머리·번호·링크·이미지·좌/중/우 정렬·전체 화면)가 전부
 * 아래 한 함수에 걸려 있었다.
 *
 *   const applyStyle = (tag: string) => { console.log(`Applying style: ${tag}`); };
 *
 * 즉 게시글 작성 화면(`/admin/community/boards/[id]`)에서 글자를 선택하고 '굵게' 를 눌러도
 * 아무 일도 일어나지 않았다. 버튼은 hover 하면 확대되고 그림자가 지므로 **동작하는 것처럼 보였다**.
 * 이 저장소가 반복해서 걷어낸 '위장 어포던스'(DEC-OPS-022)와 같은 부류다.
 *
 * [이 계약이 지키는 것]
 * 1. 변환 함수가 실제로 문자열을 바꾼다 — 되돌아가면 no-op 이 되어 red.
 * 2. 렌더된 모든 버튼이 눌렸을 때 본문을 바꾼다 — 죽은 버튼이 다시 들어오면 red.
 * 3. 소스에 console 호출이 없다 — 동작 대신 로그로 때우는 경로가 다시 생기면 red.
 *
 * [새 버튼을 추가할 때]
 * `EXPECTED_TOOLS` 를 함께 갱신해야 한다. 갱신하지 않으면 개수·라벨 census 가 red 다.
 * 이는 "구현 없이 버튼만 늘리는" 경로를 막기 위한 의도적인 양방향 동결이다.
 */

const EDITOR_SOURCE_PATH = path.resolve(__dirname, '..', 'standard-editor.tsx');

/** 툴바에 있어야 하는 버튼 — 순서까지 포함한 exact census. */
const EXPECTED_TOOLS = ['굵게', '기울임', '코드', '글머리 기호', '번호 매기기', '링크 추가'];

function ControlledEditor({ initial, onValue }: { initial: string; onValue: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <StandardEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue(next);
      }}
    />
  );
}

/** 본문에 커서/선택을 세팅한다. 툴바는 클릭 시점의 selection 을 읽는다. */
function selectRange(start: number, end: number) {
  const textarea = screen.getByLabelText('에디터 본문 내용') as HTMLTextAreaElement;
  textarea.focus();
  textarea.setSelectionRange(start, end);
  return textarea;
}

describe('본문 편집기 변환', () => {
  it('선택 영역을 인라인 태그로 감싸고 감싼 내용을 다시 선택 상태로 둔다', () => {
    const edit = applyInlineTag('연차 신청 안내', 0, 2, 'strong');

    expect(edit.value).toBe('<strong>연차</strong> 신청 안내');
    // 감싼 '연차' 가 그대로 선택돼 있어야 연속으로 다른 서식을 적용할 수 있다.
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe('연차');
  });

  it('선택이 없으면 태그 쌍을 넣고 캐럿을 그 사이에 둔다', () => {
    const edit = applyInlineTag('앞뒤', 1, 1, 'em');

    expect(edit.value).toBe('앞<em></em>뒤');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.value.slice(0, edit.selectionStart)).toBe('앞<em>');
  });

  it('선택이 걸친 줄 전체를 목록으로 바꾸고 빈 줄은 항목으로 만들지 않는다', () => {
    const value = '준비물\n노트북\n\n충전기\n끝';
    // '노트북' 한 글자만 선택해도 그 줄부터, 선택 끝이 걸친 줄까지가 대상이다.
    const edit = applyListTag(value, 4, 12, 'ul');

    expect(edit.value).toBe('준비물\n<ul>\n  <li>노트북</li>\n  <li>충전기</li>\n</ul>\n끝');
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe(
      '<ul>\n  <li>노트북</li>\n  <li>충전기</li>\n</ul>',
    );
  });

  it('빈 줄에서 번호 목록을 누르면 항목 하나짜리 뼈대를 넣고 그 안에 캐럿을 둔다', () => {
    const edit = applyListTag('', 0, 0, 'ol');

    expect(edit.value).toBe('<ol>\n  <li></li>\n</ol>');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    expect(edit.value.slice(0, edit.selectionStart)).toBe('<ol>\n  <li>');
  });

  it('링크는 선택 글자를 감싸고 캐럿을 href 안에 둔다', () => {
    const edit = applyLinkTag('규정 문서 참조', 0, 5);

    expect(edit.value).toBe('<a href="">규정 문서</a> 참조');
    expect(edit.selectionStart).toBe(edit.selectionEnd);
    // 링크를 만든 직후의 다음 동작은 주소 입력이다.
    expect(edit.value.slice(0, edit.selectionStart)).toBe('<a href="');
  });

  it('선택이 없으면 링크 문구를 채워 넣는다 — 빈 앵커를 만들지 않는다', () => {
    const edit = applyLinkTag('', 0, 0);

    expect(edit.value).toBe('<a href="">링크</a>');
  });
});

describe('본문 편집기 툴바', () => {
  it('툴바는 선언된 도구만 정확히 렌더한다', () => {
    render(<ControlledEditor initial="" onValue={() => {}} />);

    const toolbar = screen.getByRole('toolbar', { name: '본문 서식 도구' });
    const labels = within(toolbar)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

    // 구현 없는 버튼(이미지·좌/중/우 정렬·전체 화면)이 되살아나면 여기서 red 다.
    expect(labels).toEqual(EXPECTED_TOOLS);
  });

  it.each(EXPECTED_TOOLS)('%s 버튼은 본문을 바꾼다 — 눌러도 아무 일 없는 버튼을 금지한다', async (label) => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    render(<ControlledEditor initial="연차 신청" onValue={onValue} />);

    selectRange(0, 2);
    await user.click(screen.getByRole('button', { name: label }));

    expect(onValue).toHaveBeenCalledTimes(1);
    const next = onValue.mock.calls[0][0] as string;
    expect(next).not.toBe('연차 신청');
  });

  it('굵게 버튼은 선택한 글자를 strong 으로 감싼다', async () => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    render(<ControlledEditor initial="연차 신청" onValue={onValue} />);

    selectRange(0, 2);
    await user.click(screen.getByRole('button', { name: '굵게' }));

    expect(onValue).toHaveBeenCalledWith('<strong>연차</strong> 신청');
  });

  it('변환 뒤 본문에 선택이 복원된다 — 연속 적용이 가능해야 한다', async () => {
    const user = userEvent.setup();
    render(<ControlledEditor initial="연차 신청" onValue={() => {}} />);

    selectRange(0, 2);
    await user.click(screen.getByRole('button', { name: '굵게' }));

    const textarea = screen.getByLabelText('에디터 본문 내용') as HTMLTextAreaElement;
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('연차');
  });
});

describe('본문 편집기 소스 계약', () => {
  it('서식 동작을 console 로 대신하지 않는다', () => {
    const source = readFileSync(EDITOR_SOURCE_PATH, 'utf8');
    // 주석은 종전 결함을 설명하느라 console 을 언급한다 — 호출만 금지한다.
    const calls = source
      .split(/\r?\n/u)
      .filter((line) => !line.trimStart().startsWith('*'))
      .filter((line) => /\bconsole\s*\.\s*\w+\s*\(/u.test(line));

    expect(calls).toEqual([]);
  });

  it('존재하지 않는 상태를 푸터에 표시하지 않는다', () => {
    render(<ControlledEditor initial="가나다" onValue={() => {}} />);

    // 'Ready for Production' 은 어떤 상태도 가리키지 않았고, 'CHARACTERS_LOGGED' 의
    // 로깅은 실재하지 않았다. 글자 수만 사실이므로 그것만 남긴다.
    expect(screen.queryByText(/Ready for Production/i)).toBeNull();
    expect(screen.queryByText(/CHARACTERS_LOGGED/i)).toBeNull();
    expect(screen.getByText('3자')).toBeInTheDocument();
  });
});
