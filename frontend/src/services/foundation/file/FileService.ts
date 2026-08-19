import { ApiService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * 파일 정보 인터페이스
 */
interface FileVO {
  atchFileSn: number;
  fileSn: number;
  fileExtsn: string;
  fileMg: number;
  fileStreCours: string;
  orignlFileNm: string;
  streFileNm: string;
}

/**
 * 파일 관리 서비스
 * 백엔드 FileApiController 연동 (/api/v1/files)
 */
class FileService extends ApiService {
  constructor() {
    super('files');
  }

  /**
   * 파일 업로드
   * @param files 업로드할 파일 리스트
   */
  async uploadFiles(files: File[] | FileList, config?: AxiosRequestConfig): Promise<number> {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;
    fileList.forEach(file => formData.append('files', file));

    return this.post<number>('', formData, {
      ...config,
      headers: { 
        ...config?.headers,
        'Content-Type': 'multipart/form-data' 
      }
    });
  }

  /**
   * 파일 목록 조회
   * @param atchFileSn 첨부파일 일련번호
   */
  async getFileList(atchFileSn: number, config?: AxiosRequestConfig): Promise<FileVO[]> {
    if (!atchFileSn) return [];
    return this.get<FileVO[]>(`/${atchFileSn}`, config);
  }

  /**
   * 파일 다운로드
   * @param atchFileSn 첨부파일 일련번호
   * @param fileSn 파일 순번
   *
   * same-origin `/api/v1` 경로에서는 `proxy.ts`가 HttpOnly 쿠키를 Bearer 헤더로 바꿔 주므로 인증된다.
   * 반면 `NEXT_PUBLIC_API_URL`이 절대 URL이면 Next 프록시를 우회하고 `window.open`은 Authorization
   * 헤더를 직접 실을 수 없어 401이 될 수 있다. 이미지 렌더링은 axios를 쓰는 {@link fetchBlob} 경로다.
   * 상대·절대 설정의 비대칭은 `.agent/memory/known-gaps.md`의 `GAP-FILE-001`에서 관리한다.
   */
  downloadFile(atchFileSn: number, fileSn: number) {
    if (!atchFileSn) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/files/${atchFileSn}/${fileSn}`;
    window.open(url, '_blank');
  }

  /**
   * 첨부 바이트를 Blob 으로 가져온다 — `<img src>` 로는 인증할 수 없는 경로를 대신한다.
   *
   * <p>axios 요청이므로 인터셉터가 `Authorization` 헤더를 붙인다. 응답 본문은 `ApiResponse`
   * 봉투가 아니라 원시 바이트라서, 봉투를 벗기는 `extractData` 는 `success` 키가 없는 값을
   * 그대로 통과시킨다(설계상 안전).
   */
  async fetchBlob(atchFileSn: number, fileSn: number, config?: AxiosRequestConfig): Promise<Blob> {
    return this.get<Blob>(`/${atchFileSn}/${fileSn}`, { ...config, responseType: 'blob' });
  }

  /*
   * 첨부 삭제 메서드는 두지 않는다 (2026-08-05 제거).
   *
   * 종전 `deleteFile` 은 `DELETE /api/v1/files/{atchFileSn}/{fileSn}` 을 쳤는데 백엔드
   * `FileApiController` 에는 DELETE 매핑이 없어(POST 1 + GET 2 가 전부) 항상 405 였다.
   * 앱 호출부도 0개소였다 — 즉 동작한 적이 없다.
   *
   * 다시 넣기 전에 **백엔드 엔드포인트를 인가와 함께 먼저 설계할 것.** 첨부 삭제는
   * 읽기보다 위험하다. A-3(b) 의 `FileAccessPolicy` 는 **도달성(읽기)** 만 판정하며
   * 삭제 권한은 별개 명제다(업로더 본인만? 참조 행의 소유자도? 관리자는?).
   * 여기에 메서드만 되살리면 405 를 만난 다음 사람이 '무가드 엔드포인트 추가' 를
   * 자명한 해법으로 택하게 된다 — 그것이 이 자리에 있던 실제 위험이었다.
   */
}

export const fileService = new FileService();
