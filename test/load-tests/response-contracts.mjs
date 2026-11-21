/** ApiResponse<PageResponse<T>>. Empty result pages are valid; an old result/content envelope is not. */
export function hasPageResponse(body) {
  try {
    const envelope = JSON.parse(body);
    const page = envelope?.data;
    return envelope?.success === true
      && Array.isArray(page?.list)
      && Number.isInteger(page.total) && page.total >= 0
      && Number.isInteger(page.page) && page.page >= 1
      && Number.isInteger(page.size) && page.size > 0
      && Number.isInteger(page.totalPage) && page.totalPage >= 0;
  } catch {
    return false;
  }
}

function matchesDashboardWidget(items, total, unavailable, reference, allowNewPosts, previousTotal = 0) {
  const lowerBound = Math.max(reference.total, previousTotal);
  if (unavailable !== false || !Number.isSafeInteger(total) || total < lowerBound
      || !Array.isArray(items) || items.length < Math.min(5, lowerBound) || items.length > Math.min(5, total)) return false;
  if (!items.every(item => item?.bbsId === reference.boardId && Number.isSafeInteger(item.pstSn) && item.pstSn > 0)) return false;
  const ids = new Set(items.map(item => item.pstSn));
  if (ids.size !== items.length) return false;
  if (total === reference.total) {
    return ids.size === reference.ids.length && reference.ids.every(id => ids.has(id));
  }
  // SELECT and COUNT can see different commits. Each new post can displace at most one
  // setup item, and only after the initial page has filled all five slots.
  const displaced = reference.ids.filter(id => !ids.has(id)).length;
  return allowNewPosts && displaced <= Math.max(0, total - Math.max(5, reference.total));
}

export function hasDashboardResponse(body, references, allowNewNotices = false, previousNoticeTotal = 0) {
  try {
    const envelope = JSON.parse(body);
    const data = envelope?.data;
    return envelope?.success === true && data != null
      && matchesDashboardWidget(data.taskList, data.taskListTotal, data.taskListUnavailable, references.task, false)
      && matchesDashboardWidget(data.notiList, data.notiListTotal, data.notiListUnavailable, references.notice, allowNewNotices, previousNoticeTotal);
  } catch {
    return false;
  }
}

export function verifySettledDashboard(readReferences, readDashboard) {
  let references = readReferences();
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (hasDashboardResponse(readDashboard(), references)) return;
    if (attempt === 3) break;
    const next = readReferences();
    if (JSON.stringify(next) === JSON.stringify(references)) break;
    references = next;
  }
  throw new Error('Dashboard does not match the reference boards');
}
