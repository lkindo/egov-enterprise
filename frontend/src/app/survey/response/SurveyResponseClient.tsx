'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQustnrRespondInfoList, deleteQustnrRespondInfo } from '@/lib/api/survey';
import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-modal';

export default function SurveyResponseClient() {
  const [pageNo, setPageNo] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deletingResponseId, setDeletingResponseId] = useState<number | null>(null);
  const deletingResponseIdRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // ⚠ `as any` 를 걷어냈다. 종전에는 이 한 줄이 타입 검사를 통째로 무력화해서
  //   ① 백엔드가 `PageResponse{list,total,...}` 를 주는데 화면이 `content`/`totalElements`
  //      (Spring Page 형태)를 읽어 **항상 0건**으로 렌더됐고,
  //   ② 응답 항목 필드도 실재하지 않는 이름(`respondNm`·`respondAnswerCn`·`qestnrQesitmId`)을
  //      읽고 있었는데 tsc 가 아무것도 잡지 못했다.
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['survey-responses', pageNo, searchKeyword],
    // [2026-08-29] Spring Data Pageable 은 0부터 시작한다. 종전에는 1-base 인 pageNo 를 그대로
    //   실어 보내 **첫 화면이 곧 2페이지 요청**이었다. 응답이 한 페이지뿐이면 표는 비고 페이저는
    //   '1 / 1'(양쪽 비활성)이 되는데, 머리말만 '총 N건의 응답이 조회되었습니다.' 라고 말해
    //   사용자는 있는 데이터에 영영 닿지 못한 채 화면을 의심하게 된다.
    //   저장소의 다른 목록(AddressBookListClient:59, MailHistoryHubClient:81, BoardListServer:56)은
    //   모두 `page - 1` 로 보정한다 — 이 화면만 어긋나 있었다.
    queryFn: () => getQustnrRespondInfoList({ page: pageNo - 1, size: 10, keyword: searchKeyword }),
    retry: false,
  });

  const responses = data?.list ?? [];
  const totalCount = data?.total ?? 0;
  const totalPage = data?.totalPage ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (srvyRspnsSn: number) => deleteQustnrRespondInfo(srvyRspnsSn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-responses'] });
      toast.success('삭제되었습니다.');
    },
    onError: (err) => {
      toast.error(`삭제 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    },
    onSettled: () => {
      deletingResponseIdRef.current = null;
      setDeletingResponseId(null);
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setPageNo(1);
  };

  const handleDelete = async (srvyRspnsSn: number, name: string) => {
    if (deletingResponseIdRef.current !== null) return;
    deletingResponseIdRef.current = srvyRspnsSn;
    // [2026-09-06 DEC-OPS-038] 네이티브 confirm → useConfirm 모달. 동기 잠금(ref)은 확인 대기 중에도 유지된다.
    const ok = await confirm({
      title: '응답 삭제',
      message: `${name}님의 응답을 삭제하시겠습니까? 삭제한 응답은 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (!ok) {
      deletingResponseIdRef.current = null;
      return;
    }
    setDeletingResponseId(srvyRspnsSn);
    deleteMutation.mutate(srvyRspnsSn);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설문조사 응답 관리</h1>
          <p className="text-muted-foreground mt-1">
            시스템에 등록된 설문조사 응답 현황을 확인하고 관리합니다.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/survey/stats">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              통계 보기
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">응답 목록</CardTitle>
            <div className="relative w-64">
              <label htmlFor="survey-response-search" className="sr-only">응답자 이름 검색</label>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="survey-response-search"
                type="search"
                placeholder="응답자 이름 검색..."
                value={searchKeyword}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            총 {totalCount}건의 응답이 조회되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px] font-semibold">응답자</TableHead>
                  <TableHead className="font-semibold">응답 내용</TableHead>
                  <TableHead className="w-[180px] font-semibold">등록 일시</TableHead>
                  <TableHead className="w-[120px] font-semibold text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-destructive-emphasis">
                      연결 오류: {error instanceof Error ? error.message : '데이터를 가져올 수 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  responses.map((item) => (
                    <TableRow key={item.srvyRspnsSn} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium">{item.rspnsNm}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="line-clamp-1">{item.rspdntAnsCn}</span>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {item.crtDt}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-1">
                          <Link href={`/survey/response/${item.srvyRspnsSn}`}>
                            <Button variant="ghost" size="icon" aria-label={`${item.rspnsNm || '설문'} 응답 상세보기`} className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${item.rspnsNm || '설문'} 응답 ${deletingResponseId === item.srvyRspnsSn ? '삭제 중' : '삭제'}`}
                            aria-busy={deletingResponseId === item.srvyRspnsSn || undefined}
                            disabled={deletingResponseId !== null}
                            className="h-8 w-8 text-destructive-emphasis hover:text-destructive-emphasis hover:bg-destructive/10"
                            onClick={() => { void handleDelete(item.srvyRspnsSn, item.rspnsNm); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pageNo} / {totalPage} 페이지
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageNo === 1 || isFetching}
                onClick={() => setPageNo(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> 이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                // 종전엔 "현재 페이지가 10건 미만이면 마지막" 이라는 추정이었다.
                // 봉투에 totalPage 가 실려 오므로 추정할 이유가 없다.
                disabled={pageNo >= totalPage || isFetching}
                onClick={() => setPageNo(p => p + 1)}
              >
                다음 <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
