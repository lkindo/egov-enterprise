package egovframework.com.sec.gmt.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 洹몃９愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class GroupManage extends ComDefaultVO {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 洹몃９ 愿由?
	 */
	private GroupManage groupManage;
	/**
	 * 洹몃９ ID
	 */
	private String groupId;
	/**
	 * 洹몃９紐?
	 */
	private String groupNm;
	/**
	 * 洹몃９?깅줉?쇱떆
	 */
	private String groupCreatDe;
	/**
	 * 洹몃９?ㅻ챸
	 */
	private String groupDc;
	
	/**
	 * groupManage attribute 瑜?由ы꽩?쒕떎.
	 * @return GroupManage
	 */
	public GroupManage getGroupManage() {
		return groupManage;
	}
	/**
	 * groupManage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupManage GroupManage 
	 */
	public void setGroupManage(GroupManage groupManage) {
		this.groupManage = groupManage;
	}
	/**
	 * groupId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getGroupId() {
		return groupId;
	}
	/**
	 * groupId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupId String 
	 */
	public void setGroupId(String groupId) {
		this.groupId = groupId;
	}
	/**
	 * groupNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getGroupNm() {
		return groupNm;
	}
	/**
	 * groupNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupNm String 
	 */
	public void setGroupNm(String groupNm) {
		this.groupNm = groupNm;
	}
	/**
	 * groupCreatDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getGroupCreatDe() {
		return groupCreatDe;
	}
	/**
	 * groupCreatDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupCreatDe String 
	 */
	public void setGroupCreatDe(String groupCreatDe) {
		this.groupCreatDe = groupCreatDe;
	}
	/**
	 * groupDc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getGroupDc() {
		return groupDc;
	}
	/**
	 * groupDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param groupDc String 
	 */
	public void setGroupDc(String groupDc) {
		this.groupDc = groupDc;
	}
	


}
