import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  createDraftManifest,
  discoverFormValidationBoundaries,
  validateFormValidationCensus,
} from './frontend-form-validation-census.mjs';

function fixture(files) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'form-validation-census-'));
  for (const [source, content] of Object.entries(files)) {
    const target = join(repoRoot, source);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return {
    repoRoot,
    discovery: discoverFormValidationBoundaries({ repoRoot }),
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

function codes(errors) {
  return new Set(errors.map(({ code }) => code));
}

test('AST discovery ignores comment/string decoys and includes member forms', () => {
  const subject = fixture({
    'frontend/src/Motion.tsx': `
      const decoy = '<form onSubmit={fake}>';
      // <form><input /></form>
      export function Motion(){ return <motion.form><input /></motion.form>; }
    `,
  });
  try {
    assert.equal(subject.discovery.summary.nativeFormOccurrences, 0);
    assert.equal(subject.discovery.summary.memberFormOccurrences, 1);
    assert.equal(subject.discovery.candidates[0]?.tag, 'motion.form');
  } finally {
    subject.cleanup();
  }
});

test('a newly added native form is red until it is registered', () => {
  const subject = fixture({
    'frontend/src/Existing.tsx': 'export function Existing(){ return <form><input /></form> }',
    'frontend/src/NewForm.tsx': 'export function NewForm(){ return <form><textarea /></form> }',
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const emptyManifest = { ...manifest, entries: [] };
    const emptyErrors = validateFormValidationCensus({ ...subject, manifest: emptyManifest });
    assert.equal(codes(emptyErrors).has('EMPTY_MANIFEST'), true);
    assert.equal(emptyErrors.filter(({ code }) => code === 'UNREGISTERED_CANDIDATE').length, 2);

    manifest.entries = manifest.entries.filter(({ owner }) => owner !== 'NewForm');
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('UNREGISTERED_CANDIDATE'), true);
  } finally {
    subject.cleanup();
  }
});

test('a form-less editable mutation is part of the exact population', () => {
  const subject = fixture({
    'frontend/src/Existing.tsx': 'export function Existing(){ return <form><input /></form> }',
    'frontend/src/Formless.tsx': `
      export function Formless(){
        const createMutation = { mutate() {} };
        return <><input /><button onClick={() => createMutation.mutate()}>save</button></>;
      }
    `,
  });
  try {
    const boundary = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    assert.equal(boundary?.owner, 'Formless');
    const manifest = createDraftManifest(subject.discovery);
    manifest.entries = manifest.entries.filter(({ kind }) => kind !== 'formless-write');
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('UNREGISTERED_CANDIDATE'), true);
  } finally {
    subject.cleanup();
  }
});

test('action-only write controls are discovered without a form or editable owner', () => {
  const subject = fixture({
    'frontend/src/ActionOnlyOwner.tsx': `
      import { deleteComment, joinCommunity } from './actions';
      export function ActionOnlyOwner(){
        const handleDelete = () => deleteComment(commentId);
        return <>
          <button onClick={handleDelete}>delete</button>
          <button onClick={() => joinCommunity(communityId)}>join</button>
          <button onClick={() => boardService.likePost(postId)}>recommend</button>
        </>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.length, 3);
    assert.deepEqual(actions.flatMap(({ writeSinks }) => writeSinks).sort(), ['boardService.likePost', 'deleteComment', 'joinCommunity']);
    assert.equal(subject.discovery.summary.formlessWriteBoundaries, 0);
  } finally {
    subject.cleanup();
  }
});

test('a composed child Form onSubmit is a concrete write control without direct editables', () => {
  const subject = fixture({
    'frontend/src/ComposedOwner.tsx': `
      import { createReport, updateReport } from './actions';
      export function ComposedOwner(){
        const handleSubmitReport = (values) => editing
          ? updateReport(reportId, values)
          : createReport(values);
        return <ReportCreateForm onSubmit={handleSubmitReport} />;
      }
    `,
  });
  try {
    assert.equal(subject.discovery.summary.secondaryActionBoundaries, 0);
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    assert.equal(aggregate?.owner, 'ComposedOwner');
    assert.deepEqual(aggregate?.composedChildContracts, [{
      actionHandlers: [],
      component: 'ReportCreateForm',
      handler: 'handleSubmitReport',
      writeSinks: ['createReport', 'updateReport'],
    }]);
  } finally {
    subject.cleanup();
  }
});

test('independent child Forms only ledger parent actions that share their lock domain', () => {
  const subject = fixture({
    'frontend/src/IndependentCompositions.tsx': `
      import { saveReport, deleteReport, saveSchedule, deleteSchedule } from './actions';
      export function IndependentCompositions(){
        const reportPendingRef = useRef(false);
        const schedulePendingRef = useRef(false);
        const handleReportSubmit = async (values) => {
          if (reportPendingRef.current) return;
          reportPendingRef.current = true;
          try { await saveReport(values); } finally { reportPendingRef.current = false; }
        };
        const handleReportDelete = async () => {
          if (reportPendingRef.current) return;
          reportPendingRef.current = true;
          try { await deleteReport(id); } finally { reportPendingRef.current = false; }
        };
        const handleScheduleSubmit = async (values) => {
          if (schedulePendingRef.current) return;
          schedulePendingRef.current = true;
          try { await saveSchedule(values); } finally { schedulePendingRef.current = false; }
        };
        const handleScheduleDelete = async () => {
          if (schedulePendingRef.current) return;
          schedulePendingRef.current = true;
          try { await deleteSchedule(id); } finally { schedulePendingRef.current = false; }
        };
        return <>
          <ReportForm onSubmit={handleReportSubmit} />
          <button onClick={handleReportDelete}>delete report</button>
          <ScheduleForm onSubmit={handleScheduleSubmit} />
          <button onClick={handleScheduleDelete}>delete schedule</button>
        </>;
      }
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    assert.deepEqual(aggregate?.composedChildContracts, [
      {
        actionHandlers: ['handleReportDelete'],
        component: 'ReportForm',
        handler: 'handleReportSubmit',
        writeSinks: ['saveReport'],
      },
      {
        actionHandlers: ['handleScheduleDelete'],
        component: 'ScheduleForm',
        handler: 'handleScheduleSubmit',
        writeSinks: ['saveSchedule'],
      },
    ]);
  } finally {
    subject.cleanup();
  }
});

test('an inline child Form adapter is not named after a local payload variable', () => {
  const subject = fixture({
    'frontend/src/InlineChildOwner.tsx': `
      import { saveNode } from './actions';
      export function InlineChildOwner(){
        return <NetworkForm onSubmit={async (values) => {
          const formData = new FormData();
          formData.append('name', values.name);
          await saveNode(formData);
        }} />;
      }
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    assert.equal(aggregate?.composedChildContracts[0]?.handler, 'inline-action');
    assert.deepEqual(aggregate?.composedChildContracts[0]?.writeSinks, ['saveNode']);
  } finally {
    subject.cleanup();
  }
});

test('a forwarded child-control handler with a concrete write sink is discovered once', () => {
  const subject = fixture({
    'frontend/src/ForwardedActionOwner.tsx': `
      import { GalleryTemplate, ListTemplate } from './Templates';
      export function ForwardedActionOwner(){
        const handleLike = (id) => likeMutation.mutate(id);
        return <>
          <GalleryTemplate handleLike={handleLike} isLikePending={likeMutation.isPending} />
          <ListTemplate handleLike={handleLike} isLikePending={likeMutation.isPending} />
        </>;
      }
    `,
    'frontend/src/Templates.tsx': `
      export const GalleryTemplate = ({ handleLike, isLikePending }) => (
        <button onClick={() => handleLike(1)} disabled={isLikePending} aria-busy={isLikePending}>like</button>
      );
      export const ListTemplate = ({ handleLike, isLikePending }) => (
        <button onClick={() => handleLike(1)} disabled={isLikePending} aria-busy={isLikePending}>like</button>
      );
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.length, 1);
    assert.equal(actions[0]?.handler, 'handleLike');
    assert.deepEqual(actions[0]?.writeSinks, ['likeMutation.mutate']);
    assert.equal(actions[0]?.signals.implementation.actionControlHasDisabled, true);
    assert.equal(actions[0]?.signals.implementation.actionControlHasAriaBusy, true);
  } finally {
    subject.cleanup();
  }
});

test('an inline write control is not named after a confirmation helper', () => {
  const subject = fixture({
    'frontend/src/InlineDeleteOwner.tsx': `
      import { deleteItem } from './actions';
      export function InlineDeleteOwner(){
        const confirm = useConfirm();
        return <button onClick={async () => {
          if (await confirm({ title: 'delete' })) await deleteItem(itemId);
        }}>delete</button>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.handler, 'inline-action');
    assert.deepEqual(action?.writeSinks, ['deleteItem']);
  } finally {
    subject.cleanup();
  }
});

test('an inline wrapper keeps the nonstandard local write handler identity', () => {
  const subject = fixture({
    'frontend/src/ToggleOwner.tsx': `
      export function ToggleOwner(){
        const toggleStatus = () => contentService.updateContent(itemId);
        return <button onClick={() => toggleStatus()}>toggle</button>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.handler, 'toggleStatus');
    assert.deepEqual(action?.writeSinks, ['contentService.updateContent']);
  } finally {
    subject.cleanup();
  }
});

test('callback resolution does not borrow a shadowed payload variable from another handler', () => {
  const subject = fixture({
    'frontend/src/ShadowedPayloadOwner.tsx': `
      import { deleteItem, saveItem } from './actions';
      export function ShadowedPayloadOwner(){
        const deleteOther = async () => { const result = await deleteItem(otherId); return result; };
        const onSubmit = async (values) => { const result = await saveItem(values); toast(result); };
        const submitForm = () => form.handleSubmit(onSubmit)();
        return <button onClick={submitForm}>save</button>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.deepEqual(action?.writeSinks, ['saveItem']);
  } finally {
    subject.cleanup();
  }
});

test('an imported self-writing child Form participates in its parent composition ledger', () => {
  const subject = fixture({
    'frontend/src/ParentOwner.tsx': `
      import { deleteItem } from './actions';
      import { ChildForm } from './ChildForm';
      export function ParentOwner(){
        const childPendingRef = useRef(false);
        const handleDelete = () => deleteItem(itemId);
        return <>
          <button onClick={handleDelete}>delete</button>
          <ChildForm onWritePendingChange={(pending) => { childPendingRef.current = pending; }} />
        </>;
      }
    `,
    'frontend/src/ChildForm.tsx': `
      import { saveItem } from './actions';
      export function ChildForm({ onWritePendingChange }){
        const onSubmit = async () => {
          onWritePendingChange?.(true);
          try { await saveItem(value); }
          finally { onWritePendingChange?.(false); }
        };
        const submitChild = (event) => form.handleSubmit(onSubmit)(event);
        return <form onSubmit={submitChild}><input value={value} /></form>;
      }
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind, key }) => kind === 'formless-write'
      && key.includes('ParentOwner.tsx#ParentOwner'));
    assert.equal(aggregate?.kind, 'formless-write');
    assert.deepEqual(aggregate?.composedChildContracts, [{
      actionHandlers: ['handleDelete'],
      component: 'ChildForm',
      handler: 'submitChild',
      writeSinks: ['saveItem'],
    }]);
  } finally {
    subject.cleanup();
  }
});

test('a composed child is externally busy through its parent isPending contract', () => {
  const subject = fixture({
    'frontend/src/BusyParent.tsx': `
      import { saveChild } from './actions';
      import { ChildForm } from './ChildForm';
      export function BusyParent(){
        const [isSaving, setIsSaving] = useState(false);
        const saveRef = useRef(false);
        const onSubmit = async (values) => {
          if (saveRef.current) return;
          saveRef.current = true;
          setIsSaving(true);
          try { await saveChild(values); }
          finally { setIsSaving(false); saveRef.current = false; }
        };
        return <ChildForm onSubmit={onSubmit} isPending={isSaving} />;
      }
    `,
    'frontend/src/ChildForm.tsx': `
      export function ChildForm({ onSubmit, isPending }){
        const form = useAppForm(schema);
        return <form onSubmit={form.handleSubmit(onSubmit)}>
          <button type="submit" disabled={isPending} aria-busy={isPending}>save</button>
        </form>;
      }
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    const [child] = aggregate?.signals.implementation.composedChildContracts ?? [];
    assert.equal(child?.hasExternalBusy, true);
    assert.equal(child?.hasOwnPendingControl, true);
    assert.equal(child?.hasOwnSynchronousRef, true);
  } finally {
    subject.cleanup();
  }
});

test('a sole composed child does not require a nonexistent parent-action lock domain', () => {
  const subject = fixture({
    'frontend/src/CreateParent.tsx': `
      import { createItem } from './actions';
      import { ChildForm } from './ChildForm';
      export function CreateParent(){
        const onSubmit = (values) => createItem(values);
        return <ChildForm onSubmit={onSubmit} />;
      }
    `,
    'frontend/src/ChildForm.tsx': `
      export function ChildForm({ onSubmit }){
        const form = useAppForm(schema);
        return <form onSubmit={form.handleSubmit(onSubmit)}>
          <button type="submit" disabled={form.formState.isSubmitting} aria-busy={form.formState.isSubmitting}>save</button>
        </form>;
      }
    `,
    'frontend/src/CreateParent.test.tsx': `
      test('CreateParent child submit', () => { expect(createItem).toBeDefined(); });
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    const manifest = createDraftManifest(subject.discovery);
    const entry = manifest.entries.find(({ key }) => key === aggregate?.key);
    Object.assign(entry, {
      status: 'compliant',
      validationMode: 'composed-child-form-validation',
      schemaSource: 'composed:ChildForm',
      errorNavigation: 'composed-child-summary-inline-focus-first-invalid',
      serverErrors: 'composed-child-field-errors-mapped-with-value-retention',
      pendingGuard: 'composed-child-submit-and-action-locks',
      testEvidence: ['frontend/src/CreateParent.test.tsx'],
    });
    const metadataErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key, code }) => key === aggregate?.key && code === 'INVALID_COMPLIANCE_METADATA');
    assert.deepEqual(metadataErrors, []);
  } finally {
    subject.cleanup();
  }
});

test('a self-writing child pending bridge maps to the parent action lock domain', () => {
  const subject = fixture({
    'frontend/src/BridgeParent.tsx': `
      import { deleteOutside } from './actions';
      import { ChildForm } from './ChildForm';
      export function BridgeParent(){
        const parentWritePendingRef = useRef(false);
        const handleDelete = async () => {
          if (parentWritePendingRef.current) return;
          parentWritePendingRef.current = true;
          try { await deleteOutside(id); }
          finally { parentWritePendingRef.current = false; }
        };
        return <>
          <button onClick={handleDelete}>delete</button>
          <ChildForm onWritePendingChange={(pending) => { parentWritePendingRef.current = pending; }} />
        </>;
      }
    `,
    'frontend/src/ChildForm.tsx': `
      import { saveInside } from './actions';
      export function ChildForm({ onWritePendingChange }){
        const form = useAppForm(schema);
        const [isSaving, setIsSaving] = useState(false);
        const submitRef = useRef(false);
        const onSubmit = async (values) => {
          if (submitRef.current) return;
          submitRef.current = true;
          setIsSaving(true);
          onWritePendingChange?.(true);
          try { await saveInside(values); }
          finally { onWritePendingChange?.(false); setIsSaving(false); submitRef.current = false; }
        };
        return <form onSubmit={form.handleSubmit(onSubmit)}>
          <button type="submit" disabled={isSaving} aria-busy={isSaving}>save</button>
        </form>;
      }
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    const [child] = aggregate?.signals.implementation.composedChildContracts ?? [];
    assert.equal(child?.hasExternalBusy, true);
    assert.equal(child?.hasOwnPendingControl, true);
    assert.equal(child?.hasOwnSynchronousRef, true);
    assert.deepEqual(child?.mutuallyLockedActionHandlers, ['handleDelete']);
  } finally {
    subject.cleanup();
  }
});

test('search and primitive callbacks without concrete write sinks stay outside the action population', () => {
  const subject = fixture({
    'frontend/src/SearchPrimitiveOwner.tsx': `
      export function SearchPrimitiveOwner(){
        const handleSearch = () => refetch();
        const handleReset = () => setQuery('');
        return <>
          <form role="search" onSubmit={handleSearch}><input value={query} /></form>
          <Button onClick={handleReset}>reset</Button>
          <Dialog onOpenChange={setOpen} />
        </>;
      }
    `,
  });
  try {
    assert.equal(subject.discovery.summary.nativeFormOccurrences, 1);
    assert.equal(subject.discovery.summary.secondaryActionBoundaries, 0);
  } finally {
    subject.cleanup();
  }
});

test('every concrete write control in a form-less editable owner is a distinct secondary action', () => {
  const subject = fixture({
    'frontend/src/FormlessEditAndDelete.tsx': `
      import { saveItem, deleteItem, bulkMoveItems } from './actions';
      export function FormlessEditAndDelete(){
        const handleSave = () => saveItem(value);
        const handleDelete = () => deleteItem(itemId);
        const handleMove = () => bulkMoveItems([itemId], targetId);
        return <><input value={value} /><button onClick={handleSave}>save</button><button onClick={handleDelete}>delete</button><button onClick={handleMove}>move</button></>;
      }
    `,
    'frontend/src/__tests__/FormlessEditAndDelete.test.tsx': `
      test('handleDelete deleteItem pending and failure behavior', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteItem.mockRejectedValue(new Error('delete failed'));
        expect(await findByText('delete failed')).toBeVisible();
      });
    `,
  });
  try {
    assert.equal(subject.discovery.candidates.filter(({ kind }) => kind === 'formless-write').length, 1);
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.length, 3);
    assert.deepEqual(actions.map(({ handler }) => handler), ['handleDelete', 'handleMove', 'handleSave']);
    const deleteAction = actions.find(({ handler }) => handler === 'handleDelete');
    assert.deepEqual(deleteAction?.writeSinks, ['deleteItem']);
    assert.equal(deleteAction?.signals.implementation.actionHandlerHasSynchronousRef, false);
    assert.deepEqual(actions.find(({ handler }) => handler === 'handleMove')?.writeSinks, ['bulkMoveItems']);

    const manifest = createDraftManifest(subject.discovery);
    const actionEntry = manifest.entries.find(({ handler }) => handler === 'handleDelete');
    actionEntry.status = 'compliant';
    actionEntry.testEvidence = ['frontend/src/__tests__/FormlessEditAndDelete.test.tsx'];
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('INVALID_COMPLIANCE_METADATA'), true);
  } finally {
    subject.cleanup();
  }
});

test('a custom onSave control resolves its parent handler and pending contract', () => {
  const subject = fixture({
    'frontend/src/CustomSaveOwner.tsx': `
      import { saveGlobalPolicy } from './actions';
      export function CustomSaveOwner(){
        const [isSaving, setIsSaving] = useState(false);
        const saveRequestRef = useRef(false);
        const handleSaveGlobal = async () => {
          if (saveRequestRef.current) return;
          saveRequestRef.current = true;
          setIsSaving(true);
          try { await saveGlobalPolicy(changes); }
          catch { toast.error('save failed'); }
          finally { setIsSaving(false); saveRequestRef.current = false; }
        };
        return <><input value={search} /><PolicyMatrix onSave={handleSaveGlobal} isSaving={isSaving} /></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.handler, 'handleSaveGlobal');
    assert.deepEqual(action?.writeSinks, ['saveGlobalPolicy']);
    assert.equal(action?.signals.implementation.actionControlHasDisabled, true);
    assert.equal(action?.signals.implementation.actionControlHasAriaBusy, true);
  } finally {
    subject.cleanup();
  }
});

test('a write trigger inside a form owner is a distinct secondary action candidate', () => {
  const subject = fixture({
    'frontend/src/SearchAndDelete.tsx': `
      import { deleteItem } from './actions';
      export function SearchAndDelete(){
        const handleDelete = () => deleteItem();
        return <>
          <form role="search"><input /></form>
          <button onClick={handleDelete}>delete</button>
        </>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(subject.discovery.summary.secondaryActionBoundaries, 1);
    assert.equal(action?.owner, 'SearchAndDelete');
    assert.equal(action?.handler, 'handleDelete');
    assert.deepEqual(action?.writeSinks, ['deleteItem']);
    assert.equal(action?.key, 'secondary-action:frontend/src/SearchAndDelete.tsx#SearchAndDelete.handleDelete[1]');
  } finally {
    subject.cleanup();
  }
});

test('a control that invokes the same primary form adapter is not a duplicate secondary action', () => {
  const subject = fixture({
    'frontend/src/PrimaryAdapterOwner.tsx': `
      import { saveItem } from './actions';
      export function PrimaryAdapterOwner(){
        const onSubmit = async (values) => saveItem(values);
        const submitForm = () => form.handleSubmit(onSubmit)();
        return <>
          <button onClick={() => submitForm()}>save</button>
          <form onSubmit={submitForm}><input /></form>
        </>;
      }
    `,
  });
  try {
    assert.equal(subject.discovery.summary.nativeFormOccurrences, 1);
    assert.equal(subject.discovery.summary.secondaryActionBoundaries, 0);
  } finally {
    subject.cleanup();
  }
});

test('StandardDataTable bulkActions callbacks are distinct secondary actions', () => {
  const subject = fixture({
    'frontend/src/BulkOwner.tsx': `
      export function BulkOwner(){
        const bulkPendingRef = useRef(false);
        const runBulkAction = async (operation) => {
          if (bulkPendingRef.current) return;
          bulkPendingRef.current = true;
          try { await operation(); }
          catch { setError('bulk failed'); }
          finally { bulkPendingRef.current = false; }
        };
        const handleBulkStatusChange = (status) => runBulkAction(() => boardService.batchUpdate(status));
        const handleBulkDelete = () => runBulkAction(() => boardService.batchDelete());
        const bulkActions = [
          { label: '일괄 활성화', disabled: isPending, ariaBusy: isPending, onClick: () => handleBulkStatusChange('Y') },
          { label: '일괄 비활성', disabled: isPending, ariaBusy: isPending, onClick: () => handleBulkStatusChange('N') },
          { label: '완전 말소', disabled: isPending, ariaBusy: isPending, onClick: handleBulkDelete },
        ];
        return <><input /><StandardDataTable bulkActions={bulkActions} /></>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.length, 3);
    const byLabel = new Map(actions.map((action) => [action.triggerLabel, action]));
    assert.deepEqual([...byLabel.keys()].sort(), ['완전 말소', '일괄 비활성', '일괄 활성화']);
    assert.deepEqual(byLabel.get('일괄 활성화')?.writeSinks, ['boardService.batchUpdate']);
    assert.deepEqual(byLabel.get('완전 말소')?.writeSinks, ['boardService.batchDelete']);
    assert.equal(actions.every((action) => action.signals.implementation.actionHandlerHasSynchronousRef), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action ledger fails when its write sink drifts', () => {
  const subject = fixture({
    'frontend/src/SinkOwner.tsx': `
      import { deleteItem } from './actions';
      export function SinkOwner(){
        const handleDelete = () => deleteItem();
        return <><form role="search"><input /></form><button onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    action.writeSinks = ['deleteOtherItem'];
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('STALE_ACTION_SINKS'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action compliance is scoped to its actual handler and control', () => {
  const subject = fixture({
    'frontend/src/MixedOwner.tsx': `
      export function MixedOwner(){
        const unrelatedPendingRef = useRef(false);
        const handleSave = async () => {
          if (unrelatedPendingRef.current) return;
          unrelatedPendingRef.current = true;
          try { await saveService.create(); }
          catch { setError('save failed'); }
        };
        const handleDelete = () => deleteService.deleteItem();
        return <>
          <form role="search"><input /></form>
          <button
            disabled={unrelatedPendingRef.current}
            aria-busy={unrelatedPendingRef.current}
            onClick={handleSave}
          >save</button>
          <button onClick={handleDelete}>delete</button>
        </>;
      }
    `,
    'frontend/src/MixedOwner.test.tsx': `
      test('MixedOwner deleteItem failure', () => {
        expect('deleteItem').toBe('deleteItem');
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ handler }) => handler === 'handleDelete');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      validationMode: 'action-only-no-editable-payload',
      schemaSource: 'not-applicable:no-editable-payload',
      errorNavigation: 'not-applicable-action-only',
      serverErrors: 'action-error-feedback-preserves-state',
      pendingGuard: 'action-pending-lock-and-disabled',
      testEvidence: ['frontend/src/MixedOwner.test.tsx'],
    });

    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(actionErrors.some(({ message }) => message.includes('actual trigger handler')), true);
    assert.equal(actionErrors.some(({ message }) => message.includes('actual trigger control')), true);
    assert.equal(actionErrors.some(({ message }) => message.includes('failure feedback')), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action pending attributes cannot be literal false decoys', () => {
  const subject = fixture({
    'frontend/src/FalsePendingOwner.tsx': `
      export function FalsePendingOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <button disabled={false} aria-busy="false" onClick={handleDelete}>delete</button>
        </>;
      }
    `,
    'frontend/src/FalsePendingOwner.test.tsx': `
      test('FalsePendingOwner deleteItem pending and failure', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteItem.mockRejectedValue(new Error('failed'));
        expect(await findByText('failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/FalsePendingOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(actionErrors.some(({ message }) => message.includes('actual trigger control')), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action pending attributes must share the action pending state', () => {
  const subject = fixture({
    'frontend/src/UnlinkedPendingOwner.tsx': `
      export function UnlinkedPendingOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={selectedId} aria-busy={canDelete} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/BorrowedPendingOwner.tsx': `
      export function BorrowedPendingOwner(){
        const [isSaving, setIsSaving] = useState(false);
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          setIsSaving(true);
          setIsSaving(false);
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isSaving} aria-busy={isSaving} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    for (const action of actions) {
      assert.equal(action.signals.implementation.actionControlHasDisabled, false, action.owner);
      assert.equal(action.signals.implementation.actionControlHasAriaBusy, false, action.owner);
    }
  } finally {
    subject.cleanup();
  }
});

test('an action-specific object state can link its handler and concrete pending control', () => {
  const subject = fixture({
    'frontend/src/ObjectActionPending.tsx': `
      import { deleteReport } from './actions';
      export function ObjectActionPending(){
        const [reportAction, setReportAction] = useState(null);
        const reportActionPendingRef = useRef(false);
        const handleDelete = async () => {
          if (reportActionPendingRef.current) return;
          reportActionPendingRef.current = true;
          setReportAction({ type: 'delete' });
          try { await deleteReport(id); }
          finally { setReportAction(null); reportActionPendingRef.current = false; }
        };
        return <button
          disabled={reportAction !== null}
          aria-busy={reportAction?.type === 'delete' || undefined}
          onClick={handleDelete}
        >delete</button>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionControlHasDisabled, true);
    assert.equal(action?.signals.implementation.actionControlHasAriaBusy, true);
  } finally {
    subject.cleanup();
  }
});

test('a verb-specific joining state can link its handler and concrete pending control', () => {
  const subject = fixture({
    'frontend/src/JoinPending.tsx': `
      import { joinCommunity } from './actions';
      export function JoinPending(){
        const [isJoining, setJoining] = useState(false);
        const joinPendingRef = useRef(false);
        const handleJoin = async () => {
          if (joinPendingRef.current) return;
          joinPendingRef.current = true;
          setJoining(true);
          try { await joinCommunity(id); }
          finally { setJoining(false); joinPendingRef.current = false; }
        };
        return <button disabled={isJoining} aria-busy={isJoining} onClick={handleJoin}>join</button>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionControlHasDisabled, true);
    assert.equal(action?.signals.implementation.actionControlHasAriaBusy, true);
  } finally {
    subject.cleanup();
  }
});

test('distinct secondary actions cannot borrow one generic busy identity', () => {
  const subject = fixture({
    'frontend/src/SharedBusyOwner.tsx': `
      export function SharedBusyOwner(){
        const [isSaving, setIsSaving] = useState(false);
        const saveRequestRef = useRef(false);
        const deleteRequestRef = useRef(false);
        const handleSave = async () => {
          if (saveRequestRef.current) return;
          saveRequestRef.current = true;
          setIsSaving(true);
          try { await itemService.saveItem(); }
          catch { toast.error('save failed'); }
          finally { setIsSaving(false); saveRequestRef.current = false; }
        };
        const handleDelete = async () => {
          if (deleteRequestRef.current) return;
          deleteRequestRef.current = true;
          setIsSaving(true);
          try { await itemService.deleteItem(); }
          catch { toast.error('delete failed'); }
          finally { setIsSaving(false); deleteRequestRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <button disabled={isSaving} aria-busy={isSaving} onClick={handleSave}>save</button>
          <button disabled={isSaving} aria-busy={isSaving} onClick={handleDelete}>delete</button>
        </>;
      }
    `,
    'frontend/src/ScopedBusyOwner.tsx': `
      export function ScopedBusyOwner(){
        const [pendingAction, setPendingAction] = useState(null);
        const saveRequestRef = useRef(false);
        const deleteRequestRef = useRef(false);
        const handleSave = async () => {
          if (saveRequestRef.current) return;
          saveRequestRef.current = true;
          setPendingAction('save');
          try { await itemService.saveItem(); }
          catch { toast.error('save failed'); }
          finally { setPendingAction(null); saveRequestRef.current = false; }
        };
        const handleDelete = async () => {
          if (deleteRequestRef.current) return;
          deleteRequestRef.current = true;
          setPendingAction('delete');
          try { await itemService.deleteItem(); }
          catch { toast.error('delete failed'); }
          finally { setPendingAction(null); deleteRequestRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <button disabled={pendingAction !== null} aria-busy={pendingAction === 'save'} onClick={handleSave}>save</button>
          <button disabled={pendingAction !== null} aria-busy={pendingAction === 'delete'} onClick={handleDelete}>delete</button>
        </>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    const shared = actions.filter(({ owner }) => owner === 'SharedBusyOwner');
    const scoped = actions.filter(({ owner }) => owner === 'ScopedBusyOwner');
    assert.equal(shared.length, 2);
    assert.equal(shared.every(({ signals }) => !signals.implementation.actionControlHasDisabled
      && !signals.implementation.actionControlHasAriaBusy), true);
    assert.equal(scoped.length, 2);
    assert.equal(scoped.every(({ signals }) => signals.implementation.actionControlHasDisabled
      && signals.implementation.actionControlHasAriaBusy), true);
  } finally {
    subject.cleanup();
  }
});

test('composed child submit cannot borrow aggregate source locks without mutual parent-action guards', () => {
  const subject = fixture({
    'frontend/src/UnlinkedComposedOwner.tsx': `
      import { deleteItem, saveChild } from './actions';
      export function UnlinkedComposedOwner(){
        const [isChildPending, setIsChildPending] = useState(false);
        const [isDeletePending, setIsDeletePending] = useState(false);
        const childRequestRef = useRef(false);
        const deleteRequestRef = useRef(false);
        const onChildSubmit = async (values) => {
          if (childRequestRef.current) return;
          childRequestRef.current = true;
          setIsChildPending(true);
          try { await saveChild(values); }
          catch { toast.error('child failed'); }
          finally { setIsChildPending(false); childRequestRef.current = false; }
        };
        const handleDelete = async () => {
          if (deleteRequestRef.current) return;
          deleteRequestRef.current = true;
          setIsDeletePending(true);
          try { await deleteItem(); }
          catch { toast.error('delete failed'); }
          finally { setIsDeletePending(false); deleteRequestRef.current = false; }
        };
        return <>
          <input value={query} />
          <ChildForm onSubmit={onChildSubmit} isPending={isChildPending} externalBusy={isDeletePending} />
          <button disabled={isDeletePending} aria-busy={isDeletePending} onClick={handleDelete}>delete</button>
        </>;
      }
    `,
    'frontend/src/UnlinkedComposedOwner.test.tsx': `
      test('saveChild and deleteItem each have unrelated pending behavior', () => {
        expect(saveChild).toBeDefined();
        expect(deleteItem).toBeDefined();
      });
    `,
  });
  try {
    const aggregate = subject.discovery.candidates.find(({ kind }) => kind === 'formless-write');
    assert.ok(aggregate);
    assert.equal(aggregate.signals.implementation.sourceHasDisabledControl, true);
    assert.equal(aggregate.signals.implementation.sourceHasSynchronousRef, true);
    const [child] = aggregate.signals.implementation.composedChildContracts;
    assert.equal(child.hasOwnSynchronousRef, true);
    assert.equal(child.hasOwnPendingControl, true);
    assert.deepEqual(child.mutuallyLockedActionHandlers, []);

    const manifest = createDraftManifest(subject.discovery);
    const entry = manifest.entries.find(({ key }) => key === aggregate.key);
    Object.assign(entry, {
      status: 'compliant',
      validationMode: 'composed-child-form-validation',
      schemaSource: 'composed:ChildForm+parent-actions',
      errorNavigation: 'composed-child-summary-inline-focus-first-invalid',
      serverErrors: 'composed-child-field-errors-mapped-with-value-retention',
      pendingGuard: 'composed-child-submit-and-action-locks',
      testEvidence: ['frontend/src/UnlinkedComposedOwner.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === aggregate.key);
    assert.equal(errors.some(({ message }) => message.includes('must mutually lock every exact parent write action')), true);
    assert.equal(codes(errors).has('INCOMPLETE_COMPOSED_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action feedback must be emitted from its catch or onError branch', () => {
  const subject = fixture({
    'frontend/src/EmptyCatchOwner.tsx': `
      export function EmptyCatchOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try {
            await deleteService.deleteItem();
            toast('deleted');
          } catch {}
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionHandlerHasFailureFeedback, false);
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock must be claimed before the sink and released', () => {
  const subject = fixture({
    'frontend/src/LateLockOwner.tsx': `
      export function LateLockOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          try {
            await deleteService.deleteLateItem();
            if (deletePendingRef.current) return;
            deletePendingRef.current = true;
          } catch { setError('late failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/StickyLockOwner.tsx': `
      export function StickyLockOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteStickyItem(); }
          catch { setError('sticky failed'); }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/EarlyReleaseOwner.tsx': `
      export function EarlyReleaseOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { setError(null); }
          catch { setError('early failed'); }
          finally { deletePendingRef.current = false; }
          await deleteService.deleteEarlyItem();
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/PostAwaitReleaseOwner.tsx': `
      export function PostAwaitReleaseOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          await deleteService.deletePostAwaitItem();
          deletePendingRef.current = false;
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/MixedSinkLockOwner.tsx': `
      import { deleteItem, saveTelemetry } from './actions';
      export function MixedSinkLockOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          await deleteItem();
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await saveTelemetry(); }
          catch { setError('mixed failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/NegativeGuardOwner.tsx': `
      import { deleteNegativeItem } from './actions';
      export function NegativeGuardOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (!deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteNegativeItem(); }
          catch { setError('negative failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/ActionLocks.test.tsx': `
      test('LateLockOwner deleteLateItem', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteLateItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteLateItem.mockRejectedValue(new Error('late failed'));
        expect(await findByText('late failed')).toBeVisible();
      });
      test('StickyLockOwner deleteStickyItem', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteStickyItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteStickyItem.mockRejectedValue(new Error('sticky failed'));
        expect(await findByText('sticky failed')).toBeVisible();
      });
      test('EarlyReleaseOwner deleteEarlyItem', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteEarlyItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteEarlyItem.mockRejectedValue(new Error('early failed'));
        expect(await findByText('early failed')).toBeVisible();
      });
      test('PostAwaitReleaseOwner deletePostAwaitItem', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deletePostAwaitItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deletePostAwaitItem.mockRejectedValue(new Error('post-await failed'));
        expect(await findByText('post-await failed')).toBeVisible();
      });
      test('MixedSinkLockOwner deleteItem and saveTelemetry', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteItem.mockRejectedValue(new Error('mixed failed'));
        expect(await findByText('mixed failed')).toBeVisible();
      });
      test('NegativeGuardOwner deleteNegativeItem', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteNegativeItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
        deleteNegativeItem.mockRejectedValue(new Error('negative failed'));
        expect(await findByText('negative failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const actions = manifest.entries.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.length, 6);
    for (const candidate of subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action')) {
      assert.equal(candidate.signals.implementation.actionHandlerHasSynchronousRef, false, candidate.owner);
    }
    for (const action of actions) {
      Object.assign(action, {
        status: 'compliant',
        testEvidence: ['frontend/src/ActionLocks.test.tsx'],
      });
    }
    const errors = validateFormValidationCensus({ ...subject, manifest });
    for (const action of actions) {
      const actionErrors = errors.filter(({ key }) => key === action.key);
      assert.equal(actionErrors.some(({ message }) => message.includes('actual trigger handler')), true);
    }
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock can release through its matching mutation onSettled lifecycle', () => {
  const subject = fixture({
    'frontend/src/MutationLockOwner.tsx': `
      export function MutationLockOwner(){
        const deletePendingRef = useRef(false);
        const deleteMutation = useMutation({
          mutationFn: () => deleteService.deleteItem(),
          onError: () => setError('delete failed'),
          onSettled: () => { deletePendingRef.current = false; },
        });
        const handleDelete = () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          deleteMutation.mutate();
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionHandlerHasSynchronousRef, true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock can claim and release the same key in a Set ref', () => {
  const subject = fixture({
    'frontend/src/PerItemLockOwner.tsx': `
      export function PerItemLockOwner(){
        const pendingItemIdsRef = useRef(new Set());
        const handleDelete = async (item) => {
          if (pendingItemIdsRef.current.has(item.id)) return;
          pendingItemIdsRef.current.add(item.id);
          try { await deleteService.deleteItem(item.id); }
          catch { setError('delete failed'); }
          finally { pendingItemIdsRef.current.delete(item.id); }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={() => handleDelete(item)}>delete</button></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionHandlerHasSynchronousRef, true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock can claim an item id and release the null sentinel on settlement', () => {
  const subject = fixture({
    'frontend/src/ScalarItemLockOwner.tsx': `
      export function ScalarItemLockOwner(){
        const deletingItemIdRef = useRef(null);
        const deleteMutation = useMutation({
          mutationFn: (itemId) => deleteService.deleteItem(itemId),
          onError: () => setError('delete failed'),
          onSettled: () => { deletingItemIdRef.current = null; },
        });
        const handleDelete = (itemId) => {
          if (deletingItemIdRef.current !== null) return;
          deletingItemIdRef.current = itemId;
          deleteMutation.mutate(itemId);
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={() => handleDelete(item.id)}>delete</button></>;
      }
    `,
    'frontend/src/NegativeScalarItemLockOwner.tsx': `
      export function NegativeScalarItemLockOwner(){
        const deletingItemIdRef = useRef(null);
        const deleteMutation = useMutation({
          mutationFn: (itemId) => deleteService.deleteItem(itemId),
          onError: () => setError('delete failed'),
          onSettled: () => { deletingItemIdRef.current = null; },
        });
        const handleDelete = (itemId) => {
          if (deletingItemIdRef.current === null) return;
          deletingItemIdRef.current = itemId;
          deleteMutation.mutate(itemId);
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={() => handleDelete(item.id)}>delete</button></>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.find(({ owner }) => owner === 'ScalarItemLockOwner')
      ?.signals.implementation.actionHandlerHasSynchronousRef, true);
    assert.equal(actions.find(({ owner }) => owner === 'NegativeScalarItemLockOwner')
      ?.signals.implementation.actionHandlerHasSynchronousRef, false);
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock can use a positive shared pending predicate', () => {
  const subject = fixture({
    'frontend/src/SharedPredicateLockOwner.tsx': `
      export function SharedPredicateLockOwner(){
        const deletePendingRef = useRef(false);
        const savePendingRef = useRef(false);
        const hasPendingWrite = () => deletePendingRef.current || savePendingRef.current;
        const handleDelete = async () => {
          if (hasPendingWrite()) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/NegativeSharedPredicateLockOwner.tsx': `
      export function NegativeSharedPredicateLockOwner(){
        const deletePendingRef = useRef(false);
        const hasPendingWrite = () => deletePendingRef.current;
        const handleDelete = async () => {
          if (!hasPendingWrite()) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const actions = subject.discovery.candidates.filter(({ kind }) => kind === 'secondary-action');
    assert.equal(actions.find(({ owner }) => owner === 'SharedPredicateLockOwner')
      ?.signals.implementation.actionHandlerHasSynchronousRef, true);
    assert.equal(actions.find(({ owner }) => owner === 'NegativeSharedPredicateLockOwner')
      ?.signals.implementation.actionHandlerHasSynchronousRef, false);
  } finally {
    subject.cleanup();
  }
});

test('secondary action lock can delegate guard claim and finally release to exact helpers', () => {
  const subject = fixture({
    'frontend/src/HelperLockOwner.tsx': `
      export function HelperLockOwner(){
        const actionRequestRef = useRef(false);
        const beginAction = () => {
          if (actionRequestRef.current) return false;
          actionRequestRef.current = true;
          return true;
        };
        const finishAction = () => { actionRequestRef.current = false; };
        const handleDelete = async () => {
          if (!beginAction()) return;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { finishAction(); }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.equal(action?.signals.implementation.actionHandlerHasSynchronousRef, true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence must name its handler or write sink', () => {
  const subject = fixture({
    'frontend/src/GuardedOwner.tsx': `
      export function GuardedOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <button
            disabled={deletePendingRef.current}
            aria-busy={deletePendingRef.current}
            onClick={handleDelete}
          >delete</button>
        </>;
      }
    `,
    'frontend/src/GuardedOwner.test.tsx': `
      test('GuardedOwner save behavior', () => {
        expect('save').toBe('save');
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/GuardedOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('UNRELATED_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence must exercise pending and failure behavior', () => {
  const subject = fixture({
    'frontend/src/EvidencedOwner.tsx': `
      export function EvidencedOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <button
            disabled={deletePendingRef.current}
            aria-busy={deletePendingRef.current}
            onClick={handleDelete}
          >delete</button>
        </>;
      }
    `,
    'frontend/src/EvidencedOwner.test.tsx': `
      test('EvidencedOwner deleteItem', () => {
        expect('deleteItem').toBe('deleteItem');
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/EvidencedOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('INCOMPLETE_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence cannot borrow assertions from another test block', () => {
  const subject = fixture({
    'frontend/src/BlockOwner.tsx': `
      export function BlockOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/BlockOwner.test.tsx': `
      test('BlockOwner deleteItem is wired', () => {
        expect(deleteItem).toBeDefined();
      });
      test('unrelated save pending and failure behavior', async () => {
        fireEvent.click(save); fireEvent.click(save);
        expect(saveItem).toHaveBeenCalledTimes(1);
        expect(save).toBeDisabled();
        expect(save).toHaveAttribute('aria-busy', 'true');
        saveItem.mockRejectedValue(new Error('save failed'));
        expect(await findByText('save failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/BlockOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('INCOMPLETE_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence cannot use another write control in the same test block', () => {
  const subject = fixture({
    'frontend/src/WrongControlOwner.tsx': `
      import { deleteItem } from './actions';
      export function WrongControlOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/WrongControlOwner.test.tsx': `
      test('WrongControlOwner deleteItem behavior', async () => {
        fireEvent.click(save); fireEvent.click(save);
        expect(saveItem).toHaveBeenCalledTimes(1);
        expect(save).toBeDisabled();
        expect(save).toHaveAttribute('aria-busy', 'true');
        saveItem.mockRejectedValue(new Error('save failed'));
        expect(await findByText('save failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/WrongControlOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('INCOMPLETE_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence cannot attach exact sink failure to another pending control', () => {
  const subject = fixture({
    'frontend/src/WrongPendingSubjectOwner.tsx': `
      import { deleteItem } from './actions';
      export function WrongPendingSubjectOwner(){
        const [isDeleting, setIsDeleting] = useState(false);
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          setIsDeleting(true);
          try { await deleteItem(); }
          catch { setError('delete failed'); }
          finally { setIsDeleting(false); deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/WrongPendingSubjectOwner.test.tsx': `
      test('WrongPendingSubjectOwner handleDelete deleteItem behavior', async () => {
        deleteItem.mockRejectedValueOnce(new Error('delete failed'));
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(save).toBeDisabled();
        expect(save).toHaveAttribute('aria-busy', 'true');
        expect(await findByText('delete failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/WrongPendingSubjectOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('INCOMPLETE_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('secondary action evidence cannot split one behavioral contract across test blocks', () => {
  const subject = fixture({
    'frontend/src/SplitEvidenceOwner.tsx': `
      export function SplitEvidenceOwner(){
        const deletePendingRef = useRef(false);
        const handleDelete = async () => {
          if (deletePendingRef.current) return;
          deletePendingRef.current = true;
          try { await deleteService.deleteItem(); }
          catch { setError('delete failed'); }
          finally { deletePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isDeleting} aria-busy={isDeleting} onClick={handleDelete}>delete</button></>;
      }
    `,
    'frontend/src/SplitEvidenceOwner.test.tsx': `
      test('SplitEvidenceOwner deleteItem pending', async () => {
        fireEvent.click(remove); fireEvent.click(remove);
        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(remove).toBeDisabled();
        expect(remove).toHaveAttribute('aria-busy', 'true');
      });
      test('SplitEvidenceOwner deleteItem failure', async () => {
        deleteItem.mockRejectedValue(new Error('delete failed'));
        expect(await findByText('delete failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      testEvidence: ['frontend/src/SplitEvidenceOwner.test.tsx'],
    });
    const actionErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(codes(actionErrors).has('INCOMPLETE_ACTION_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('validated editable secondary actions cannot claim action-only metadata', () => {
  const subject = fixture({
    'frontend/src/ValidatedEditOwner.tsx': `
      import { updateItem } from './actions';
      export function ValidatedEditOwner(){
        const [isEditPending, setIsEditPending] = useState(false);
        const editPendingRef = useRef(false);
        const editValidation = useManualFormValidation(editItemSchema);
        const handleEdit = async () => {
          if (editPendingRef.current) return;
          const validated = editValidation.validate({ itemId, editCn });
          if (!validated) return;
          editPendingRef.current = true;
          setIsEditPending(true);
          try { await updateItem(validated); }
          catch { editValidation.setFormErrors({ editCn: 'failed' }); }
          finally { setIsEditPending(false); editPendingRef.current = false; }
        };
        return <>
          <form role="search"><input /></form>
          <FormErrorSummary errors={editValidation.errors} onNavigate={editValidation.focusError} />
          <textarea {...editValidation.fieldProps('editCn')} />
          <p {...editValidation.messageProps('editCn')} />
          <button disabled={isEditPending} aria-busy={isEditPending} onClick={handleEdit}>edit item</button>
        </>;
      }
    `,
    'frontend/src/ValidatedEditOwner.test.tsx': `
      test('ValidatedEditOwner updateItem pending and failure', async () => {
        fireEvent.click(edit); fireEvent.click(edit);
        expect(updateItem).toHaveBeenCalledTimes(1);
        expect(edit).toBeDisabled();
        expect(edit).toHaveAttribute('aria-busy', 'true');
        updateItem.mockRejectedValue(new Error('failed'));
        expect(await findByText('failed')).toBeVisible();
      });
    `,
  });
  try {
    const candidate = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.deepEqual(candidate?.validationSchemas, ['editItemSchema']);
    assert.deepEqual(candidate?.validatedFields, ['editCn', 'itemId']);
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      validationMode: 'action-only-no-editable-payload',
      schemaSource: 'not-applicable:no-editable-payload',
      errorNavigation: 'not-applicable-action-only',
      serverErrors: 'action-error-feedback-preserves-state',
      testEvidence: ['frontend/src/ValidatedEditOwner.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key }) => key === action.key);
    assert.equal(errors.some(({ message }) => message.includes('editable payload')), true);

    Object.assign(action, {
      validationMode: 'validated-secondary-ui-action',
      schemaSource: 'local:editItemSchema',
      validatedFields: ['editCn', 'itemId'],
      errorNavigation: 'summary-inline-focus-first-invalid',
      serverErrors: 'field-errors-mapped-with-value-retention',
    });
    const compliantErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key, code }) => key === action.key && code === 'INVALID_COMPLIANCE_METADATA');
    assert.deepEqual(compliantErrors, []);
  } finally {
    subject.cleanup();
  }
});

test('structured UI state writes require an exact payload ledger and invariant', () => {
  const subject = fixture({
    'frontend/src/HierarchyOwner.tsx': `
      import { saveHierarchy } from './actions';
      export function HierarchyOwner(){
        const [isSaving, setIsSaving] = useState(false);
        const savePendingRef = useRef(false);
        const handleSaveHierarchy = async () => {
          if (savePendingRef.current) return;
          savePendingRef.current = true;
          setIsSaving(true);
          try { await saveHierarchy(flattenedNodes); }
          catch { setError('hierarchy failed'); }
          finally { setIsSaving(false); savePendingRef.current = false; }
        };
        return <><form role="search"><input /></form><button disabled={isSaving} aria-busy={isSaving} onClick={handleSaveHierarchy}>구조 저장</button></>;
      }
    `,
    'frontend/src/HierarchyOwner.test.tsx': `
      test('HierarchyOwner saveHierarchy pending and failure', async () => {
        fireEvent.click(save); fireEvent.click(save);
        expect(saveHierarchy).toHaveBeenCalledTimes(1);
        expect(save).toBeDisabled();
        expect(save).toHaveAttribute('aria-busy', 'true');
        saveHierarchy.mockRejectedValue(new Error('failed'));
        expect(await findByText('failed')).toBeVisible();
      });
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const action = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    assert.ok(action);
    Object.assign(action, {
      status: 'compliant',
      validationMode: 'structured-ui-state-validation',
      schemaSource: 'structured-ui-state:hierarchy-membership',
      errorNavigation: 'structured-state-action-feedback',
      serverErrors: 'action-error-feedback-preserves-state',
      pendingGuard: 'action-pending-lock-and-disabled',
      testEvidence: ['frontend/src/HierarchyOwner.test.tsx'],
    });
    const missingErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key, code }) => key === action.key && code === 'INVALID_COMPLIANCE_METADATA');
    assert.equal(missingErrors.some(({ message }) => message.startsWith('stateInvariant:')), true);
    assert.equal(missingErrors.some(({ message }) => message.startsWith('structuredPayloads:')), true);

    Object.assign(action, {
      stateInvariant: 'each hierarchy node keeps one reviewed parent membership',
      structuredPayloads: ['flattenedNodes'],
    });
    const compliantErrors = validateFormValidationCensus({ ...subject, manifest })
      .filter(({ key, code }) => key === action.key && code === 'INVALID_COMPLIANCE_METADATA');
    assert.deepEqual(compliantErrors, []);
  } finally {
    subject.cleanup();
  }
});

test('delete-only write boundaries and the manual validation adapter are classified honestly', () => {
  const subject = fixture({
    'frontend/src/DeleteOnly.tsx': `
      export function DeleteOnly(){
        const deleteMutation = { mutate() {} };
        return <><input /><button onClick={() => deleteMutation.mutate()}>delete</button></>;
      }
    `,
    'frontend/src/ManualForm.tsx': `
      export function ManualForm(){
        const validation = useManualFormValidation(manualSchema);
        const sendingRef = useRef(false);
        const errors = extractFieldErrors(new Error());
        return <form onSubmit={() => saveService.create()}>
          <input />
          <button disabled={sendingRef.current}>save</button>
        </form>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const deleteEntry = manifest.entries.find(({ owner }) => owner === 'DeleteOnly');
    const manualEntry = manifest.entries.find(({ owner }) => owner === 'ManualForm');

    assert.equal(deleteEntry?.classification, 'destructive');
    assert.equal(manualEntry?.validationMode, 'useManualFormValidation-zod');
    assert.equal(manualEntry?.schemaSource, 'local:manualSchema');
    assert.equal(manualEntry?.errorNavigation, 'summary-inline-focus-first-invalid');
    assert.equal(manualEntry?.serverErrors, 'field-errors-mapped-with-value-retention');
    assert.equal(manualEntry?.pendingGuard, 'synchronous-submit-lock-and-disabled');
  } finally {
    subject.cleanup();
  }
});

test('local collection and URLSearchParams delete calls are not write boundaries', () => {
  const subject = fixture({
    'frontend/src/LocalDelete.tsx': `
      export function LocalDelete(){
        const params = new URLSearchParams();
        const selected = new Set();
        return <input onChange={() => { params.delete('q'); selected.delete('row'); }} />;
      }
    `,
  });
  try {
    assert.equal(subject.discovery.summary.formlessWriteBoundaries, 0);
    assert.equal(subject.discovery.summary.candidateCount, 0);
  } finally {
    subject.cleanup();
  }
});

test('axios delete transport calls remain concrete secondary write actions', () => {
  const subject = fixture({
    'frontend/src/AxiosDeleteOwner.tsx': `
      import axios from 'axios';
      export function AxiosDeleteOwner(){
        const handleDelete = async () => { await axios.delete('/items/1'); };
        return <><form><input /></form><button onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  try {
    const action = subject.discovery.candidates.find(({ kind }) => kind === 'secondary-action');
    assert.deepEqual(action?.writeSinks, ['axios.delete']);
  } finally {
    subject.cleanup();
  }
});

test('a FormLabel outside FormField context fails closed', () => {
  const subject = fixture({
    'frontend/src/BrokenLabel.tsx': `
      import { Form, FormItem, FormLabel } from '@/components/ui/form';
      export function BrokenLabel(){
        return <Form><form><FormItem><FormLabel>이름</FormLabel><input /></FormItem></form></Form>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('FORM_CONTEXT_VIOLATION'), true);
  } finally {
    subject.cleanup();
  }
});

test('messageProps inline errors cannot duplicate the summary alert live region', () => {
  const subject = fixture({
    'frontend/src/DuplicateAlertForm.tsx': `
      export function DuplicateAlertForm(){
        const validation = useManualFormValidation(schema);
        return <form noValidate>
          <FormErrorSummary errors={validation.errors} />
          <input {...validation.fieldProps('name')} />
          <p {...validation.messageProps('name')} role="alert">{validation.errors.name}</p>
        </form>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('DUPLICATE_INLINE_ALERT_LIVE_REGION'), true);
  } finally {
    subject.cleanup();
  }
});

test('a direct write cannot be disguised as a search/filter form', () => {
  const subject = fixture({
    'frontend/src/Spoof.tsx': `
      export function Spoof(){
        const saveMutation = { mutate() {} };
        return <form onSubmit={() => saveMutation.mutate()}><input /></form>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    manifest.entries[0].classification = 'search-filter';
    manifest.entries[0].status = 'compliant';
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('CLASSIFICATION_CONTRADICTION'), true);
  } finally {
    subject.cleanup();
  }
});

test('an expired exception is red and cannot hide a noncompliant mutation', () => {
  const subject = fixture({
    'frontend/src/Excepted.tsx': `
      export function Excepted(){
        const updateMutation = { mutate() {} };
        return <form onSubmit={() => updateMutation.mutate()}><input /></form>;
      }
    `,
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    manifest.entries[0].status = 'exception';
    manifest.exceptions = [{
      id: 'FORM-WAIVER-EXPIRED',
      candidateKey: manifest.entries[0].key,
      reason: 'Temporary migration gap.',
      owner: 'frontend-platform',
      expiresAt: '2025-01-01',
    }];
    const errors = validateFormValidationCensus({
      ...subject,
      manifest,
      now: new Date('2026-08-26T00:00:00.000Z'),
    });
    assert.equal(codes(errors).has('EXPIRED_EXCEPTION'), true);
  } finally {
    subject.cleanup();
  }
});

test('a compile-time disabled 501 write exception becomes red when the feature is enabled', () => {
  const makeSubject = (disabled) => fixture({
    'frontend/src/DisabledWrite.tsx': `
      import { deleteItem } from './actions';
      function Search(){ return <form role="search"><input /></form>; }
      export function DisabledWrite(){
        const WRITE_NOT_IMPLEMENTED = ${disabled};
        const handleDelete = () => deleteItem(id);
        return <><Search /><div>501 Not Implemented</div><button disabled={WRITE_NOT_IMPLEMENTED} onClick={handleDelete}>delete</button></>;
      }
    `,
  });
  const except = (subject) => {
    const manifest = createDraftManifest(subject.discovery);
    const entry = manifest.entries.find(({ kind }) => kind === 'secondary-action');
    Object.assign(entry, {
      status: 'exception',
      validationMode: 'not-applicable-disabled-write',
      schemaSource: 'not-applicable:backend-write-501',
      errorNavigation: 'not-applicable-disabled-write',
      serverErrors: 'not-applicable-disabled-write',
      pendingGuard: 'compile-time-disabled-write',
      testEvidence: ['frontend/src/DisabledWrite.tsx'],
    });
    manifest.exceptions = [{
      id: 'FORM-DISABLED-WRITE-1',
      candidateKey: entry.key,
      reason: 'Backend write is explicitly 501 Not Implemented.',
      owner: 'backend-foundation',
      expiresAt: '2026-12-31',
      disabledBy: 'WRITE_NOT_IMPLEMENTED',
    }];
    return manifest;
  };
  const disabled = makeSubject('true');
  try {
    assert.deepEqual(validateFormValidationCensus({
      ...disabled,
      manifest: except(disabled),
      now: new Date('2026-08-26T00:00:00.000Z'),
    }), []);
  } finally {
    disabled.cleanup();
  }
  const enabled = makeSubject('false');
  try {
    const errors = validateFormValidationCensus({
      ...enabled,
      manifest: except(enabled),
      now: new Date('2026-08-26T00:00:00.000Z'),
    });
    assert.equal(codes(errors).has('INACTIVE_DISABLED_WRITE_EXCEPTION'), true);
  } finally {
    enabled.cleanup();
  }
});

test('a form-less disabled-write exception requires every write entry control to use the flag', () => {
  const makeSubject = (editDisabled) => fixture({
    'frontend/src/DisabledComposition.tsx': `
      import { saveNode } from './actions';
      function Search(){ return <form role="search"><input /></form>; }
      export function DisabledComposition(){
        const WRITE_NOT_IMPLEMENTED = true;
        const handleCreate = () => setMode('create');
        const handleEdit = () => setMode('edit');
        const handleDelete = () => setMode('delete');
        const handleSubmit = (values) => saveNode(values);
        return <>
          <Search />
          <div>501 Not Implemented</div>
          <button disabled={WRITE_NOT_IMPLEMENTED} onClick={handleCreate}>register</button>
          <button disabled={${editDisabled}} onClick={handleEdit}>edit</button>
          <button disabled={WRITE_NOT_IMPLEMENTED} onClick={handleDelete}>delete</button>
          <NetworkForm onSubmit={handleSubmit} />
        </>;
      }
    `,
  });
  const except = (subject) => {
    const manifest = createDraftManifest(subject.discovery);
    const entry = manifest.entries.find(({ kind }) => kind === 'formless-write');
    Object.assign(entry, {
      status: 'exception',
      validationMode: 'not-applicable-disabled-write',
      schemaSource: 'not-applicable:backend-write-501',
      errorNavigation: 'not-applicable-disabled-write',
      serverErrors: 'not-applicable-disabled-write',
      pendingGuard: 'compile-time-disabled-write',
      testEvidence: ['frontend/src/DisabledComposition.tsx'],
    });
    manifest.exceptions = [{
      id: 'FORM-DISABLED-COMPOSITION-1',
      candidateKey: entry.key,
      reason: 'Backend write is explicitly 501 Not Implemented.',
      owner: 'backend-foundation',
      expiresAt: '2026-12-31',
      disabledBy: 'WRITE_NOT_IMPLEMENTED',
    }];
    return manifest;
  };

  const fullyDisabled = makeSubject('WRITE_NOT_IMPLEMENTED');
  try {
    assert.deepEqual(validateFormValidationCensus({
      ...fullyDisabled,
      manifest: except(fullyDisabled),
      now: new Date('2026-08-26T00:00:00.000Z'),
    }), []);
  } finally {
    fullyDisabled.cleanup();
  }

  const partiallyDisabled = makeSubject('false');
  try {
    const errors = validateFormValidationCensus({
      ...partiallyDisabled,
      manifest: except(partiallyDisabled),
      now: new Date('2026-08-26T00:00:00.000Z'),
    });
    assert.equal(codes(errors).has('INACTIVE_DISABLED_WRITE_EXCEPTION'), true);
  } finally {
    partiallyDisabled.cleanup();
  }
});

test('unrelated executable evidence cannot certify a mutation boundary', () => {
  const subject = fixture({
    'frontend/src/ProfileForm.tsx': `
      export function ProfileForm(){
        const saveMutation = { mutate() {} };
        return <form onSubmit={() => saveMutation.mutate()}><input /></form>;
      }
    `,
    'frontend/src/Unrelated.test.tsx': 'test("unrelated", () => {});',
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    Object.assign(manifest.entries[0], {
      status: 'compliant',
      validationMode: 'useAppForm-zod',
      schemaSource: 'generated:ProfileDto',
      errorNavigation: 'focus-first-invalid',
      serverErrors: 'field-errors-mapped',
      pendingGuard: 'submission-pending-disabled',
      testEvidence: ['frontend/src/Unrelated.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('UNRELATED_TEST_EVIDENCE'), true);
  } finally {
    subject.cleanup();
  }
});

test('generic reviewed claims cannot certify concrete form behavior', () => {
  const subject = fixture({
    'frontend/src/ProfileForm.tsx': `
      export function ProfileForm(){
        const saveMutation = { mutate() {} };
        return <form noValidate onSubmit={() => saveMutation.mutate()}><input /></form>;
      }
    `,
    'frontend/src/ProfileForm.test.tsx': 'test("ProfileForm", () => {});',
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    Object.assign(manifest.entries[0], {
      status: 'compliant',
      validationMode: 'reviewed-form-boundary',
      schemaSource: 'manual-reviewed-rules',
      errorNavigation: 'focus-first-invalid',
      serverErrors: 'field-errors-mapped-or-inline',
      pendingGuard: 'sync-lock-or-disabled',
      testEvidence: ['frontend/src/ProfileForm.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('INVALID_COMPLIANCE_METADATA'), true);
  } finally {
    subject.cleanup();
  }
});

test('generic useAppForm calls are detected as concrete adapter consumers', () => {
  const subject = fixture({
    'frontend/src/GenericProfileForm.tsx': `
      const profileSchema = {};
      declare const z: { infer: unknown };
      declare function useAppForm<T, U>(schema: unknown): { handleSubmit(cb: () => void): () => void };
      export function GenericProfileForm(){
        const form = useAppForm<typeof profileSchema, z.infer<typeof profileSchema>>(profileSchema);
        const saveProfile = () => {};
        return <form noValidate onSubmit={form.handleSubmit(saveProfile)}><input /></form>;
      }
    `,
  });
  try {
    const [candidate] = subject.discovery.candidates;
    assert.equal(candidate.signals.implementation.sourceUsesAppForm, true);
    assert.equal(candidate.signals.implementation.usesAppForm, true);
    assert.equal(candidate.signals.implementation.schemaIdentifier, 'profileSchema');
  } finally {
    subject.cleanup();
  }
});

test('an action-only boundary must prove feedback and a synchronous pending lock', () => {
  const subject = fixture({
    'frontend/src/DeleteOnly.tsx': `
      export function DeleteOnly(){
        const deleteMutation = { mutate() {} };
        return <><input /><button onClick={() => deleteMutation.mutate()}>delete</button></>;
      }
    `,
    'frontend/src/DeleteOnly.test.tsx': 'test("DeleteOnly", () => {});',
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    Object.assign(manifest.entries[0], {
      status: 'compliant',
      validationMode: 'action-only-no-editable-payload',
      schemaSource: 'not-applicable:no-editable-payload',
      errorNavigation: 'not-applicable-action-only',
      serverErrors: 'toast-or-inline-state-retained',
      pendingGuard: 'submission-pending-disabled',
      testEvidence: ['frontend/src/DeleteOnly.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('INVALID_COMPLIANCE_METADATA'), true);
  } finally {
    subject.cleanup();
  }
});

test('a compliant custom-validated form must disable native browser validation', () => {
  const subject = fixture({
    'frontend/src/ProfileForm.tsx': `
      export function ProfileForm(){
        const saveMutation = { mutate() {} };
        return <form onSubmit={() => saveMutation.mutate()}><input /></form>;
      }
    `,
    'frontend/src/ProfileForm.test.tsx': 'test("ProfileForm", () => {});',
  });
  try {
    const manifest = createDraftManifest(subject.discovery);
    Object.assign(manifest.entries[0], {
      status: 'compliant',
      validationMode: 'useAppForm-zod',
      schemaSource: 'local:profileSchema',
      errorNavigation: 'summary-inline-focus-first-invalid',
      serverErrors: 'field-errors-mapped-with-value-retention',
      pendingGuard: 'synchronous-submit-lock-and-disabled',
      testEvidence: ['frontend/src/ProfileForm.test.tsx'],
    });
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('INVALID_COMPLIANCE_METADATA'), true);
  } finally {
    subject.cleanup();
  }
});

test('empty discovery and stale manifest entries fail closed', () => {
  const subject = fixture({
    'frontend/src/Plain.tsx': 'export const Plain = () => <div />;',
  });
  try {
    const manifest = {
      schemaVersion: 1,
      expected: subject.discovery.summary,
      entries: [{
        key: 'native-form:frontend/src/Ghost.tsx#Ghost[1]',
        kind: 'native-form',
        file: 'frontend/src/Ghost.tsx',
        owner: 'Ghost',
        classification: 'mutation',
        status: 'noncompliant',
        validationMode: 'none',
        schemaSource: 'unverified',
        errorNavigation: 'missing',
        serverErrors: 'missing',
        pendingGuard: 'missing',
        testEvidence: [],
      }],
      exceptions: [],
    };
    const errors = validateFormValidationCensus({ ...subject, manifest });
    assert.equal(codes(errors).has('EMPTY_DISCOVERY'), true);
    assert.equal(codes(errors).has('EMPTY_NATIVE_POPULATION'), true);
    assert.equal(codes(errors).has('STALE_ENTRY'), true);
  } finally {
    subject.cleanup();
  }
});
