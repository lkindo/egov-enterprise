package nuri.foundation.core.user;

import java.util.Collection;
import java.util.regex.Pattern;

/**
 * 기능 모듈이 <b>로그인 ID 로 소유·작성자를 판정하는 기록</b>이 어느 컬럼에 있는지 알려 주는 포트.
 *
 * <p>[왜 필요한가] 사용자는 물리 삭제된다({@code UserService#deleteUser}). 그런데 여러 기능이 기록의 주인을 감사 컬럼
 * {@code frst_rgtr_id}(로그인 ID) 같은 로그인 ID 축으로 판정한다 — 업무 보고·일정·메모 보고의 수정·삭제
 * ({@code SecurityUtil.assertOwnerOrPermission}), 담당자가 빈 부서 업무의 등록자 판정, 업로더 본인의 첨부 열람 등이다.
 * 삭제 뒤 같은 로그인 ID 로 새 계정을 만들면 그 계정이 남의 옛 기록을 제 것으로 물려받는다. 사용자 등록은 이 포트로
 * 모은 컬럼에 그 로그인 ID 가 아직 남아 있으면 일반 중복과 같은 오류로 거부한다(응답으로 더 드러내지 않는다).
 *
 * <p>[왜 포트인가] 기록 표는 선택 기능(business-app)에 흩어져 있다. 사용자 등록(business-core)이 그 표를 직접 알면
 * 모듈 방향이 뒤집힌다. 첨부 참조원 포트({@code AttachmentSourceContributor})·템플릿 참조 포트와 같이 규칙의 소유권을
 * 기록을 가진 기능에 둔다. 기능이 재사용 생성물에서 빠지면 이 기여도 함께 빠져 없는 표를 조회하지 않는다.
 *
 * <p>[무엇을 등록하는가] 접근·소유를 로그인 ID 로 판정하는 컬럼만이다. 감사용으로만 남는 {@code frst_rgtr_id}
 * (판정에 쓰지 않는 표)는 넣지 않는다 — 넣으면 재사용을 쓸데없이 막는다. 등록일과 계정 생성 시각을 대조해 재사용을
 * 이미 걸러 내는 기록(설문 응답, {@code SurveyResultService#cancelSubmission})도 넣지 않는다.
 */
public interface LoginIdReferenceContributor {

    /** 이 기능이 로그인 ID 를 소유·작성자로 담고 그 값으로 접근을 판정하는 컬럼들. 비어 있으면 안 된다. */
    Collection<Reference> loginIdReferences();

    /**
     * 로그인 ID 를 담은 컬럼 하나. 이름은 코드가 정한 상수이고 SQL 식별자로 그대로 쓰이므로 소문자 snake_case 만 받는다.
     *
     * @param table  물리 테이블 이름(예: {@code tb_rpt_info})
     * @param column 로그인 ID 를 담은 컬럼 이름(예: {@code frst_rgtr_id})
     */
    record Reference(String table, String column) {

        private static final Pattern IDENTIFIER = Pattern.compile("[a-z][a-z0-9_]{0,62}");

        public Reference {
            if (table == null || !IDENTIFIER.matcher(table).matches()) {
                throw new IllegalArgumentException("로그인 ID 참조 테이블 이름이 SQL 식별자가 아닙니다: " + table);
            }
            if (column == null || !IDENTIFIER.matcher(column).matches()) {
                throw new IllegalArgumentException("로그인 ID 참조 컬럼 이름이 SQL 식별자가 아닙니다: " + column);
            }
        }

        /** 로그에 남기는 이름. 값(로그인 ID)은 담지 않는다. */
        public String qualifiedName() {
            return table + "." + column;
        }
    }
}
