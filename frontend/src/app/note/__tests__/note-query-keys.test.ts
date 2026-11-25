import { describe, expect, it } from 'vitest';
import { NOTE_LIST_ROOT, noteListKey, noteListTabKey } from '../note-query-keys';

/** 쪽지함 목록 키 — 조회·읽음 반영·무효화가 같은 팩토리를 쓴다(2026-11-25). 페이지 크기 census 는 호출부의 리터럴만 보므로 여기서 지킨다. */
describe('note-query-keys', () => {
  it('탭·쪽·크기·검색어가 하나라도 다르면 키가 다르다 — 크기만 바꿔도 같은 캐시를 돌려주지 않는다', () => {
    const base = noteListKey('received', 1, 10, '');
    expect(noteListKey('received', 1, 50, '')).not.toEqual(base);
    expect(noteListKey('received', 2, 10, '')).not.toEqual(base);
    expect(noteListKey('sent', 1, 10, '')).not.toEqual(base);
    expect(noteListKey('received', 1, 10, '회의')).not.toEqual(base);
  });

  it('무효화 접두사는 목록 키의 앞부분과 같다', () => {
    const key = noteListKey('sent', 3, 20, '결재');
    expect(key.slice(0, NOTE_LIST_ROOT.length)).toEqual([...NOTE_LIST_ROOT]);
    expect(key.slice(0, noteListTabKey('sent').length)).toEqual([...noteListTabKey('sent')]);
  });
});
