package nuri.business.service.file;

import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Component;

/**
 * 새 업무 참조에 첨부를 할당할 때 사용하는 공용 인가 경계.
 *
 * <p>열람 가능 여부와 새 참조를 만들 수 있는 권한은 다르다. 이 정책은 첨부 마스터의 존재를
 * 확인한 뒤 {@link FileAccessPolicy#assertAttachable(FileMaster)}에 위임하여 원 업로더만 할당할 수
 * 있도록 한다. 첨부 해제({@code null})와 동일 첨부 유지 여부는 현재 업무 자원을 아는 호출부가
 * 먼저 판정해야 한다.
 */
@Component
public class AttachmentAssignmentPolicy {

    private final FileMasterRepository fileMasterRepository;
    private final FileAccessPolicy fileAccessPolicy;

    public AttachmentAssignmentPolicy(
            FileMasterRepository fileMasterRepository,
            FileAccessPolicy fileAccessPolicy) {
        this.fileMasterRepository = fileMasterRepository;
        this.fileAccessPolicy = fileAccessPolicy;
    }

    /**
     * 현재 인증 주체가 존재하는 첨부를 새 업무 참조에 할당할 수 있는지 검증한다.
     *
     * @param atchFileSn 새로 할당할 첨부 식별자
     * @throws IllegalArgumentException 호출부가 첨부 해제({@code null})를 이 메서드에 넘긴 경우
     * @throws BusinessException 첨부가 없거나 원 업로더가 아닌 경우
     */
    public void assertAssignable(Long atchFileSn) {
        if (atchFileSn == null) {
            throw new IllegalArgumentException("atchFileSn 은 null 일 수 없습니다");
        }

        FileMaster master = fileMasterRepository.findById(atchFileSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        fileAccessPolicy.assertAttachable(master);
    }
}
