package nuri.business.service.deptjob;

import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.deptjob.DeptJob;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.business.service.deptjob.dto.DeptJobMapper;
import nuri.business.domain.deptjob.QDeptJob;
import com.querydsl.core.BooleanBuilder;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeptJobService extends BaseAbstractService {

    private final DeptJobRepository deptJobRepository;
    private final DeptJobBoxRepository deptJobBoxRepository;
    private final UserRepository userRepository;
    private final OrganizationManageRepository organizationManageRepository;
    private final DeptJobMapper deptJobMapper;

    public DeptJobService(DeptJobRepository deptJobRepository,
            DeptJobBoxRepository deptJobBoxRepository,
            UserRepository userRepository,
            OrganizationManageRepository organizationManageRepository,
            DeptJobMapper deptJobMapper) {
        this.deptJobRepository = required(deptJobRepository, "DeptJobRepository 는 null 일 수 없습니다");
        this.deptJobBoxRepository = required(deptJobBoxRepository, "DeptJobBoxRepository 는 null 일 수 없습니다");
        this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
        this.organizationManageRepository = required(organizationManageRepository,
                "OrganizationManageRepository 는 null 일 수 없습니다");
        this.deptJobMapper = required(deptJobMapper, "DeptJobMapper 는 null 일 수 없습니다");
    }

    /**
     * 부서 업무 목록.
     *
     * <p><b>[소유 스코프]</b> {@code mineOnly=true}(화면 기본값)면 <b>내가 담당자인 업무</b>만 돌려준다.
     * 부서 전체 열람은 호출자가 명시적으로 {@code false} 를 줄 때만 열린다(화면의 스코프 토글).</p>
     *
     * <p><b>⚠ 식별자 축</b> — {@code pic_id} 에 저장되는 값은 <b>esntlId</b> 다
     * ({@link #createDeptJob} 이 {@code CustomUserDetails.getEsntlId()} 를 넣고,
     * {@link #toDto} 가 {@code userRepository.findByEsntlId(picId)} 로 이름을 푼다).
     * 반면 감사 컬럼 {@code frstRgtrId} 는 <b>loginId</b> 다({@code LoginUserAuditorAware}).
     * 두 축을 뒤바꿔 비교하면 예외 없이 조용히 0건이 되어 "내 업무가 하나도 안 보이는" 증상이 된다 —
     * 이 저장소에서 반복된 실패 유형이라 축을 각각 명시해 비교한다.</p>
     *
     * <p><b>[담당자 없는 레거시 행]</b> {@code pic_id} 는 물리 스키마상 nullable 이고, 등록 폼에
     * 담당자 지정 UI 가 없던 시절이나 직접 INSERT 로 들어온 행은 담당자가 비어 있을 수 있다.
     * 그런 행을 {@code picId = 나} 로만 거르면 <b>아무에게도 보이지 않는 유령 데이터</b>가 된다.
     * 그래서 담당자가 비어 있으면 <b>등록자(frstRgtrId, loginId)</b> 를 담당자로 간주해 되살린다.
     * (쓰기 인가의 폴백 규칙과 동일하다 — {@link #assertPicOrAdmin} 참조.)</p>
     */
    public Page<DeptJobDto> getDeptJobList(String deptId, Long deptTaskBoxSn, String searchCondition, String keyword,
            boolean mineOnly, Pageable pageable) {
        QDeptJob deptJob = QDeptJob.deptJob;
        BooleanBuilder builder = new BooleanBuilder();

        if (mineOnly) {
            String myEsntlId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId().orElse(null);
            String myLoginId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse(null);

            BooleanBuilder mine = new BooleanBuilder();
            if (myEsntlId != null) {
                mine.or(deptJob.picId.eq(myEsntlId));
            }
            if (myLoginId != null) {
                mine.or(deptJob.picId.isNull().and(deptJob.frstRgtrId.eq(myLoginId)));
            }

            // 신원을 확정할 수 없으면 fail-closed. 조건을 붙이지 않으면 "내 업무만" 요청이
            // 전체 목록으로 조용히 승격되어 스코프가 무력화된다(이 엔드포인트는 인증 필수라
            // 정상 경로에서는 도달하지 않는다).
            if (!mine.hasValue()) {
                return Page.empty(required(pageable, "pageable 는 null 일 수 없습니다"));
            }
            builder.and(mine);
        }

        if (deptTaskBoxSn != null) {
            builder.and(deptJob.deptTaskBoxSn.eq(deptTaskBoxSn));
        } else if (deptId != null && !deptId.isEmpty()) {
            List<Long> boxSns = deptJobBoxRepository.findByDeptId(deptId).stream()
                    .map(box -> box.getDeptTaskBoxSn())
                    .collect(Collectors.toList());
            if (!boxSns.isEmpty()) {
                builder.and(deptJob.deptTaskBoxSn.in(boxSns));
            } else {
                return Page.empty(required(pageable, "pageable 는 null 일 수 없습니다"));
            }
        }

        if (keyword != null && !keyword.isEmpty()) {
            if ("0".equals(searchCondition)) { // 부서업무명
                builder.and(deptJob.deptTaskNm.contains(keyword));
            } else if ("1".equals(searchCondition)) { // 부서업무내용
                builder.and(deptJob.deptTaskCn.contains(keyword));
            } else if ("2".equals(searchCondition)) { // 담당자ID
                builder.and(deptJob.picId.contains(keyword));
            }
        }
        return deptJobRepository.findAll(builder, required(pageable, "pageable 는 null 일 수 없습니다")).map(this::toDto);
    }

    public DeptJobDto getDeptJob(Long deptTaskSn) {
        DeptJob deptJob = deptJobRepository.findById(required(deptTaskSn, "deptTaskSn 은 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return toDto(deptJob);
    }

    @Transactional
    public Long createDeptJob(String userId, DeptJobDto dto) {
        // [담당자 기본값] 등록 폼에 담당자 지정 UI 가 아직 없다. 미지정 시 등록자를 담당자로 둔다
        //   (null 로 두면 목록의 담당자 칸이 비고 검색조건 '담당자ID'가 무의미해진다).
        //   축은 이 컨트롤러의 형제 메서드들과 동일하게 esntlId 다. 담당자 지정 UI 가 생기면
        //   그때 사용자 선택 값을 그대로 받는다.
        String picId = (dto.getPicId() != null && !dto.getPicId().isBlank()) ? dto.getPicId() : userId;

        DeptJob deptJob = DeptJob.builder()
                .deptTaskBoxSn(dto.getDeptTaskBoxSn())
                .deptTaskNm(dto.getDeptTaskNm())
                .deptTaskCn(dto.getDeptTaskCn())
                .picId(picId)
                .prrtyRnk(dto.getPrrtyRnk())
                .atchFileSn(dto.getAtchFileSn())
                .build();
        return deptJobRepository.save(deptJob).getDeptTaskSn();
    }

    @Transactional
    public void updateDeptJob(Long deptTaskSn, DeptJobDto dto) {
        DeptJob deptJob = deptJobRepository.findById(required(deptTaskSn, "deptTaskSn 은 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 담당자 본인 또는 관리자만 수정 가능.
        // URL 의 id 만으로 남의 업무를 고칠 수 없게 한다.
        assertPicOrAdmin(deptJob);

        // [담당자 보존] dto.picId 가 비어 오면 기존 담당자를 유지한다.
        //   update() 는 전달값을 그대로 덮어쓰므로, 담당자 필드를 보내지 않는 폼이 저장을 한 번만 해도
        //   pic_id 가 null 로 지워진다. 그러면 그 업무는 소유 스코프에서 이탈하고
        //   (담당자 공석 → 등록자 폴백) 담당자 본인이 되레 수정 권한을 잃는다.
        //   담당자 변경은 값을 실제로 담아 보낼 때만 일어나야 한다.
        String picId = (dto.getPicId() != null && !dto.getPicId().isBlank())
                ? dto.getPicId()
                : deptJob.getPicId();

        deptJob.update(
                dto.getDeptTaskBoxSn(),
                dto.getDeptTaskNm(),
                dto.getDeptTaskCn(),
                picId,
                dto.getPrrtyRnk(),
                dto.getAtchFileSn());
    }

    @Transactional
    public void deleteDeptJob(Long deptTaskSn) {
        // 종전에는 deleteById 로 존재 여부도 소유권도 확인하지 않고 지웠다.
        // 없는 id 는 404 로, 남의 업무는 인가 실패로 되돌린다.
        DeptJob deptJob = deptJobRepository.findById(required(deptTaskSn, "deptTaskSn 은 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        assertPicOrAdmin(deptJob);

        deptJobRepository.delete(deptJob);
    }

    /**
     * 부서 업무 쓰기 인가 — <b>담당자 본인 또는 관리자</b>(백엔드 헌법 제8조: 서비스 레이어 재검증).
     *
     * <p>컨트롤러의 {@code @PreAuthorize("isAuthenticated()")} 는 "로그인했는가"만 본다.
     * 그것만으로는 로그인한 아무나 URL 의 id 를 바꿔 남의 업무를 고칠 수 있으므로(IDOR),
     * 실제 소유 판정은 반드시 이 계층에서 한다.</p>
     *
     * <p><b>[담당자 축 = esntlId]</b> {@code pic_id} 에는 esntlId 가 저장되므로
     * {@code getCurrentEsntlId()} 와 비교한다. 감사 컬럼용
     * {@link nuri.business.security.util.SecurityUtil#assertOwnerOrAdmin(String)}(loginId 기준)을
     * 여기에 쓰면 축이 어긋나 담당자 본인이 상시 403 을 맞는다.</p>
     *
     * <p><b>[담당자 공석 폴백]</b> {@code pic_id} 는 nullable 이다. 담당자가 비어 있는 행에
     * 담당자 검사만 걸면 <b>관리자 외에는 아무도 손댈 수 없는 고아 데이터</b>가 된다.
     * 그래서 담당자가 없을 때만 등록자(frstRgtrId=loginId) 기준으로 판정한다.
     * 담당자가 지정돼 있으면 등록자라도 통과시키지 않는다 — 승인된 규칙이 "담당자 본인 또는 관리자"이고,
     * 등록자를 상시 허용하면 업무를 넘겨받은 담당자가 원 등록자의 수정을 막을 수 없기 때문이다.</p>
     *
     * @throws BusinessException ACCESS_DENIED(403) — 담당자도 관리자도 아닐 때.
     *         존재하지 않는 id 는 호출부에서 이미 RESOURCE_NOT_FOUND(404)로 갈린다.
     */
    private void assertPicOrAdmin(DeptJob deptJob) {
        String picId = deptJob.getPicId();
        if (picId == null || picId.isBlank()) {
            // 담당자 공석 — 등록자 기준(loginId)으로 판정한다.
            nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(deptJob.getFrstRgtrId());
            return;
        }

        nuri.business.security.util.SecurityUtil.assertOwnerOrAdminByEsntlId(picId);
    }

    private DeptJobDto toDto(DeptJob entity) {
        DeptJobDto dto = deptJobMapper.toDto(entity);

        // [nullable 데이터에 required() 를 걸지 않는다]
        // dept_task_box_sn·dept_id·pic_id 는 모두 물리 스키마상 nullable 이다. 그런데 종전에는
        // 세 곳 모두 required()(null 이면 즉시 예외)로 감싸고 있어, 업무함을 지정하지 않은 업무가
        // 하나라도 있으면 목록·상세 조회가 통째로 400 으로 떨어졌다.
        // 등록 폼에는 업무함 선택 UI 가 없어 새로 만든 업무는 항상 이 상태가 된다 —
        // 즉 "데이터가 생기는 순간 조회가 깨지는" 구조였다. (컨트롤러 매핑이 없어 등록 자체가
        // 불가능했던 탓에 이 모순이 지금까지 드러나지 않았다.)
        // required() 는 프로그래밍 오류를 잡는 가드이지, 비어 있을 수 있는 도메인 값에 쓸 것이 아니다.
        // 아래 ifPresent 들이 이미 부재를 정상 흐름으로 다루므로 id 가 없으면 조회를 건너뛴다.
        if (entity.getDeptTaskBoxSn() != null) {
            deptJobBoxRepository.findById(entity.getDeptTaskBoxSn())
                    .ifPresent(box -> {
                        dto.setDeptTaskBoxNm(box.getDeptTaskBoxNm());
                        dto.setDeptId(box.getDeptId());
                        if (box.getDeptId() != null) {
                            organizationManageRepository.findById(box.getDeptId())
                                    .ifPresent(org -> dto.setDeptNm(org.getOgnzNm()));
                        }
                    });
        }

        if (entity.getPicId() != null) {
            userRepository.findByEsntlId(entity.getPicId())
                    .ifPresent(user -> dto.setPicNm(user.getUserNm()));
        }

        return dto;
    }
}
