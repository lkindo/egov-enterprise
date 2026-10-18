package nuri.business.service.addressbook.loginid;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 주소록의 열람·수정·삭제는 등록자 {@code frst_rgtr_id}(로그인 ID)로 판정한다({@code AddressBookService}). 사용자를 지울
 * 때 작성자({@code wrter_id}, esntlId)는 시스템 계정으로 넘기지만 등록자 컬럼은 그대로 남는다.
 */
@Component
public class AddressBookLoginIdReferenceContributor implements LoginIdReferenceContributor {

    @Override
    public Collection<Reference> loginIdReferences() {
        return List.of(new Reference("tb_adbk_manage", "frst_rgtr_id"));
    }
}
