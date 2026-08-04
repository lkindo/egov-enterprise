import { ApiService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * 파일 정보 인터페이스
 */
interface FileVO {
  atchFileId: string;
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
  async uploadFiles(files: File[] | FileList, config?: AxiosRequestConfig): Promise<string> {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;
    fileList.forEach(file => formData.append('files', file));

    return this.post<string>('', formData, {
      ...config,
      headers: { 
        ...config?.headers,
        'Content-Type': 'multipart/form-data' 
      }
    });
  }

  /**
   * 파일 목록 조회
   * @param atchFileId 통합 파일 ID
   */
  async getFileList(atchFileId: string, config?: AxiosRequestConfig): Promise<FileVO[]> {
    if (!atchFileId) return [];
    return this.get<FileVO[]>(`/${atchFileId}`, config);
  }

  /**
   * 파일 다운로드
   * @param atchFileId 통합 파일 ID
   * @param fileSn 파일 순번
   *
   * ⚠ 이 경로는 `window.open` 이라 **Authorization 헤더가 실리지 않는다**.
   * 백엔드 `JwtTokenProvider.resolveToken` 은 헤더만 읽고 쿠키 폴백이 없으므로 401 이 된다.
   * (Next 의 `/api/v1/:path*` rewrite 는 헤더를 주입하지 않는 투명 프록시다.)
   * 이미지처럼 화면에 그리는 용도는 {@link fetchBlob} 을 쓴다 — 그쪽은 axios 라 헤더가 실린다.
   * 이 메서드의 근본 해결은 FE 인증 방식 결정이 선행돼야 하며,
   * `docs/04-operations/wave2-carryover.md` §2 A-3(b) 에 선택지와 함께 기록돼 있다.
   */
  downloadFile(atchFileId: string, fileSn: number) {
    if (!atchFileId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/files/${atchFileId}/${fileSn}`;
    window.open(url, '_blank');
  }

  /**
   * 첨부 바이트를 Blob 으로 가져온다 — `<img src>` 로는 인증할 수 없는 경로를 대신한다.
   *
   * <p>axios 요청이므로 인터셉터가 `Authorization` 헤더를 붙인다. 응답 본문은 `ApiResponse`
   * 봉투가 아니라 원시 바이트라서, 봉투를 벗기는 `extractData` 는 `success` 키가 없는 값을
   * 그대로 통과시킨다(설계상 안전).
   */
  async fetchBlob(atchFileId: string, fileSn: number, config?: AxiosRequestConfig): Promise<Blob> {
    return this.get<Blob>(`/${atchFileId}/${fileSn}`, { ...config, responseType: 'blob' });
  }

  /**
   * 파일 개별 삭제
   */
  async deleteFile(atchFileId: string, fileSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${atchFileId}/${fileSn}`, config);
  }
}

export const fileService = new FileService();
