import type { KeyboardEvent } from 'react';
import { nextCellPosition } from './operation-permission-matrix-model';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/**
 * 권한 표(기능별 권한 표·화면별 권한 표)의 방향키 칸 이동. 목적지는 순수 모델 {@link nextCellPosition} 이 정하고,
 * 여기서는 표 안의 `[data-a5-cell]` 칸(`data-row-index`·`data-col-index`)을 읽어 그 칸으로 포커스를 옮긴다.
 * 수식 키가 함께 눌렸거나 갈 곳이 없으면 아무것도 하지 않는다(기본 동작도 막지 않는다).
 */
export function focusAdjacentA5Cell(event: KeyboardEvent<HTMLElement>, table: HTMLElement | null): void {
  if (!ARROW_KEYS.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-a5-cell]') : null;
  if (!target || !table) return;
  const current = { row: Number(target.dataset.rowIndex), col: Number(target.dataset.colIndex) };
  if (Number.isNaN(current.row) || Number.isNaN(current.col)) return;
  const cells = [...table.querySelectorAll<HTMLElement>('[data-a5-cell]:not(:disabled)')];
  const next = nextCellPosition(cells.map((cell) => ({ row: Number(cell.dataset.rowIndex), col: Number(cell.dataset.colIndex) })), current, event.key);
  const element = next && cells.find((cell) => Number(cell.dataset.rowIndex) === next.row && Number(cell.dataset.colIndex) === next.col);
  if (!element) return;
  event.preventDefault();
  element.focus();
}
