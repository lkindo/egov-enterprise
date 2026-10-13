import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const tableActions = [
  ['행 위에 추가', 'addRowBefore'],
  ['행 아래에 추가', 'addRowAfter'],
  ['행 삭제', 'deleteRow'],
  ['열 왼쪽에 추가', 'addColumnBefore'],
  ['열 오른쪽에 추가', 'addColumnAfter'],
  ['열 삭제', 'deleteColumn'],
  ['셀 병합', 'mergeCells'],
  ['셀 분할', 'splitCell'],
  ['머리글 행 전환', 'toggleHeaderRow'],
  ['머리글 열 전환', 'toggleHeaderColumn'],
  ['표 삭제', 'deleteTable'],
] as const;

export function RichTextTableTools({ editor, readOnly = false }: { editor: Editor; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState('3');
  const [cols, setCols] = useState('3');
  const [selectionStart, setSelectionStart] = useState<{ cell: number; table: number } | null>(null);
  const [previousReadOnly, setPreviousReadOnly] = useState(readOnly);
  const focusEditorOnClose = useRef(false);
  const id = useId();
  const inTable = editor.isActive('table');
  const currentCell = selectedCellPosition(editor);
  const validSize = [rows, cols].every((value) => (
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10
  ));
  const insertOptions = { rows: Number(rows), cols: Number(cols), withHeaderRow: true };

  if (previousReadOnly !== readOnly) {
    setPreviousReadOnly(readOnly);
    if (readOnly) {
      setOpen(false);
      setSelectionStart(null);
    }
  }

  useEffect(() => {
    // Positions are only kept while choosing cells; any content edit invalidates them.
    const resetSelectionStart = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) setSelectionStart(null);
    };
    editor.on('transaction', resetSelectionStart);
    return () => { editor.off('transaction', resetSelectionStart); };
  }, [editor]);

  useEffect(() => {
    if (!readOnly) return;
    focusEditorOnClose.current = false;
  }, [readOnly]);

  const finish = (success: boolean) => {
    if (!success) return;
    focusEditorOnClose.current = true;
    setOpen(false);
  };

  return (
    <Popover open={open && !readOnly} onOpenChange={(nextOpen) => {
      if (!readOnly || !nextOpen) setOpen(nextOpen);
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title="표 도구" aria-label="표 도구" disabled={readOnly}>
          <Table2 size={18} aria-hidden="true" />표
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="표 편집 도구"
        className="w-72 max-w-[calc(100vw-2rem)] space-y-3"
        onCloseAutoFocus={(event) => {
          if (readOnly || !editor.isEditable) {
            event.preventDefault();
            focusEditorOnClose.current = false;
            return;
          }
          if (!focusEditorOnClose.current) return;
          event.preventDefault();
          focusEditorOnClose.current = false;
          editor.commands.focus();
        }}
      >
        {inTable ? (
          <>
            <p className="text-sm text-muted-foreground">
              {selectionStart
                ? '끝 셀을 누른 뒤 표 도구에서 이 셀까지 선택을 누르세요.'
                : '셀 병합은 여러 셀을 선택한 뒤 사용할 수 있습니다. 드래그 대신 시작 셀과 끝 셀을 차례로 지정할 수도 있습니다.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" disabled={readOnly || !currentCell} onClick={() => {
                if (readOnly || !editor.isEditable) return;
                setSelectionStart(currentCell);
                finish(true);
              }}>셀 선택 시작</Button>
              <Button type="button" variant="outline" size="sm" disabled={readOnly || !selectionStart || !currentCell || selectionStart.table !== currentCell.table || selectionStart.cell === currentCell.cell} onClick={() => {
                if (readOnly || !editor.isEditable || !selectionStart || !currentCell) return;
                finish(editor.chain().focus().setCellSelection({ anchorCell: selectionStart.cell, headCell: currentCell.cell }).run());
                setSelectionStart(null);
              }}>이 셀까지 선택</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tableActions.map(([label, command]) => (
                <Button
                  key={command}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly || !editor.can()[command]()}
                  onClick={() => {
                    if (readOnly || !editor.isEditable) return;
                    finish(editor.chain().focus()[command]().run());
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p id={`${id}-help`} className="text-sm text-muted-foreground">행과 열은 1~10개로 시작할 수 있습니다. 첫 행은 머리글입니다.</p>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={`${id}-rows`} className="space-y-1 text-sm">
                <span>행 수</span>
                <Input id={`${id}-rows`} type="number" min={1} max={10} step={1} value={rows} disabled={readOnly} aria-describedby={`${id}-help`} onChange={(event) => setRows(event.target.value)} />
              </label>
              <label htmlFor={`${id}-cols`} className="space-y-1 text-sm">
                <span>열 수</span>
                <Input id={`${id}-cols`} type="number" min={1} max={10} step={1} value={cols} disabled={readOnly} aria-describedby={`${id}-help`} onChange={(event) => setCols(event.target.value)} />
              </label>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={readOnly || !validSize || !editor.can().insertTable(insertOptions)}
              onClick={() => {
                if (readOnly || !editor.isEditable) return;
                finish(editor.chain().focus().insertTable(insertOptions).run());
              }}
            >
              표 삽입
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function selectedCellPosition(editor: Editor): { cell: number; table: number } | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 1; depth -= 1) {
    const tableRole = $from.node(depth).type.spec.tableRole;
    if (tableRole === 'cell' || tableRole === 'header_cell') {
      return { cell: $from.before(depth), table: $from.before(depth - 2) };
    }
  }
  return null;
}
