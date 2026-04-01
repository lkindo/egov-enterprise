import { cookies } from 'next/headers';
import client from '../../../../../lib/api/client';

/**
 * 寃뚯떆님紐⑸줉 ?곗씠?곕? ?쒕쾭 ?ъ씠?쒖뿉님媛?몄삤님?⑥닔
 */
export async function getInitialBoardData(params: {
 bbsId: string;
 page踰덊샇: number;
 searchWrd: string;
 searchCnd: string;
 orderBy: string;
 startDate?: string;
 endDate?: string;
}) {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;

 // ?좏겙님?녿뒗 寃쎌슦 API瑜님몄텧?섏? ?딄퀬 鍮님곗씠님諛섑솚 (401 ?먮윭 諛⑹?)
 if (!accessToken) {
  return { resultList: [], totalCount: 0, totalPages: 0 };
 }

 const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

 try {
  // 諛깆뿏님BoardController 매핑님留욎떠 寃쎈줈 蹂寃? /api/v1/boards/{bbsId}
  const { bbsId, page踰덊샇, ...restParams } = params;
  const queryParams = {
   page: page踰덊샇 - 1, // Spring Data Pageable? 0遺님?쒖옉
   size: 10,
   ...restParams
  };

   const [listResponse, masterResponse]: any = await Promise.all([
    client.get(`/boards/${bbsId}`, { ...axiosConfig, params: queryParams }),
    client.get(`/admin/system/board-masters/${bbsId}`, axiosConfig)
   ]);
 
   // Spring Data Page 媛앹껜 援ъ“님留욎떠 ?곗씠님異붿텧 (content, totalElements, totalPages)
   return {
    resultList: listResponse.content || [],
    totalCount: listResponse.totalElements || 0,
    totalPages: listResponse.totalPages || 0,
    masterInfo: masterResponse || null
   };
  } catch (error: any) {
  // 401 ?ㅻ쪟님?몄쬆님?꾩슂님?곹깭?대?濡님몄텧?먯뿉님redirect ?쒗궗 님?덈룄濡님ㅼ떆 ?섏쭚
  if (error.response?.status === 401) {
   throw error;
  }
  console.error('BoardListServer: Failed to fetch board list', error);
  return { resultList: [], totalCount: 0, totalPages: 0 };
 }
}
