import { createContext, useContext } from 'react';
import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { BoardMedia } from './BoardMedia';
import { Button } from './button';
import { Input } from './input';
import {
  isBoardMediaReference,
  type BoardMediaAttachment,
  type BoardMediaReference,
} from '@/lib/attachments/board-media';

export interface RichTextMediaOptions {
  atchFileSn?: number;
  attachments: readonly BoardMediaAttachment[];
  pendingFiles: readonly File[];
  onAddFiles: (files: File[]) => BoardMediaReference[];
  disabled?: boolean;
  readOnly?: boolean;
}

export const RichTextMediaContext = createContext<RichTextMediaOptions | undefined>(undefined);

function MediaNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const media = useContext(RichTextMediaContext);
  const reference = node.attrs as BoardMediaReference;
  return (
    <NodeViewWrapper contentEditable={false} className="my-4 rounded-md border border-border p-3">
      <BoardMedia reference={reference} atchFileSn={media?.atchFileSn} attachments={media?.attachments} pendingFiles={media?.pendingFiles} />
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm">
          <span>{reference.kind === 'image' ? '이미지 설명' : '영상 설명'}</span>
          <Input value={reference.label} maxLength={300} disabled={media?.readOnly}
            onChange={(event) => updateAttributes({ label: event.target.value })} />
        </label>
        <Button type="button" variant="outline" size="sm" disabled={media?.readOnly} onClick={deleteNode}>본문에서 제거</Button>
      </div>
    </NodeViewWrapper>
  );
}

/** Persist only an attachment reference; object URLs belong to the node view. */
export const BoardMediaNode = Node.create({
  name: 'boardMedia',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      name: { default: '', rendered: false },
      kind: { default: 'image', rendered: false },
      label: { default: '', rendered: false },
    };
  },
  parseHTML() {
    return [{
      tag: 'figure[data-board-file]',
      getAttrs: (element) => {
        const reference = {
          name: element.getAttribute('data-board-file') ?? '',
          kind: element.getAttribute('data-media-kind') ?? '',
          label: element.getAttribute('data-media-label') ?? '',
        };
        return isBoardMediaReference(reference) ? reference : false;
      },
    }];
  },
  renderHTML({ node }) {
    const { name, kind, label } = node.attrs;
    return ['figure', { 'data-board-file': name, 'data-media-kind': kind, 'data-media-label': label }, ['figcaption', {}, label || (kind === 'image' ? '첨부 이미지' : '첨부 영상')]];
  },
  addNodeView() { return ReactNodeViewRenderer(MediaNodeView); },
});
