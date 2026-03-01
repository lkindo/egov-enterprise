package egovframework.com.sec.gmt.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 洹몃９愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *   2025.06.26  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(硫붿꽌??諛섑솚 ?대? 諛곗뿴), ArrayIsStoredDirectly(諛곗뿴??吏곸젒 ??λ맖)
 *
 *      </pre>
 */
public class GroupManageVO extends GroupManage {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 洹몃９ 紐⑸줉
	 */
	List<GroupManageVO> groupManageList;
	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	String[] delYn;

	/**
	 * groupManageList attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return List<GroupManageVO>
	 */
	public List<GroupManageVO> getGroupManageList() {
		return groupManageList;
	}

	/**
	 * groupManageList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param groupManageList List<GroupManageVO>
	 */
	public void setGroupManageList(List<GroupManageVO> groupManageList) {
		this.groupManageList = groupManageList;
	}

}
