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
