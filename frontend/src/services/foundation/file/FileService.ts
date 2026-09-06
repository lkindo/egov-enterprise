import { ApiService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';
import {
  deleteFileOperation,
  downloadFileOperation,
  getFileListOperation,
  uploadFilesOperation,
} from '@/types/generated-operations';

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
    const fileList = files instanceof FileList ? Array.from(files) : files;

    return this.executeGeneratedMultipart(uploadFilesOperation, {
      body: { files: fileList },
      config,
    });
  }

  /**
   * 파일 목록 조회
   * @param atchFileSn 첨부파일 일련번호
   */
  async getFileList(atchFileSn: number, config?: AxiosRequestConfig): Promise<FileVO[]> {
    if (!atchFileSn) return [];
    return this.executeGenerated(getFileListOperation, {
      path: { atchFileSn },
      config,
    }) as Promise<FileVO[]>;
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
  /**
   * 첨부를 인증 상태로 내려받는다.
   *
   * <p>[고친 결함] 종전 구현은 `NEXT_PUBLIC_API_URL` 로 URL 을 직접 만들어 `window.open` 했다.
   * 그 경로는 axios 인터셉터를 타지 않아 `Authorization` 이 붙지 않고, 값이 절대 URL 인 배포에서는
   * same-origin `proxy.ts` 의 쿠키→Bearer 주입까지 우회한다 — 즉 인증 다운로드가 401 로 죽는다.
   * 상대 경로 설정에서 우연히 동작하던 것이라 설정에 따라 조용히 깨지는 형태였다.
   *
   * <p>이제 {@link fetchBlob} 의 인증 axios 로 바이트를 받아 object URL 로 저장한다. 인증 경로가
   * 하나로 모이므로 상대·절대 어느 설정에서도 같게 동작한다.
   */
  async downloadFile(atchFileSn: number, fileSn: number, fileName?: string): Promise<void> {
    if (!atchFileSn) return;

    const blob = await this.fetchBlob(atchFileSn, fileSn);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName?.trim() || `attachment-${atchFileSn}-${fileSn}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // 클릭 직후 revoke 하면 브라우저가 저장을 시작하기 전에 URL 이 사라질 수 있다.
    // 다음 매크로태스크로 미뤄 다운로드 시작을 보장한 뒤 회수한다.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  /**
   * 첨부 바이트를 Blob 으로 가져온다 — `<img src>` 로는 인증할 수 없는 경로를 대신한다.
   *
   * <p>generated binary operation이 인증 axios 경로와 `responseType: 'blob'`을 고정한다.
   * 응답은 JSON envelope로 해석하지 않고 Blob 여부만 검증하므로 원시 바이트를 변조하지 않는다.
   */
  async fetchBlob(atchFileSn: number, fileSn: number, config?: AxiosRequestConfig): Promise<Blob> {
    return this.executeGenerated(downloadFileOperation, {
      path: { atchFileSn, fileSn },
      config,
    });
  }

  /**
   * 첨부 단건 삭제 — `DELETE /api/v1/files/{atchFileSn}/{fileSn}`.
   *
   * <p>[이력] 2026-08-05 에 같은 이름의 메서드를 제거했었다 — 백엔드에 DELETE 매핑이 없어 항상 405 였고,
   * 메서드만 되살리면 다음 사람이 '무가드 엔드포인트 추가' 를 자명한 해법으로 택하게 된다는 위험 때문이었다.
   * 2026-09-05(DEC-OPS-034) 백엔드가 인가와 함께 엔드포인트를 신설했다: 삭제 판정은 열람 정책과 별개의
   * {@code FileAccessPolicy#assertDeletable} — 업로더 본인·참조 행 소유자·(개인 귀속이 아닌 첨부의) 관리자만
   * 지울 수 있고, 공유 열람 근거는 삭제 근거가 아니다. 거부는 403 으로 돌아오므로 호출부는 그것을 삼키지 않는다.
   */
  async deleteFile(atchFileSn: number, fileSn: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteFileOperation, {
      path: { atchFileSn, fileSn },
      config,
    });
  }
}

export const fileService = new FileService();
