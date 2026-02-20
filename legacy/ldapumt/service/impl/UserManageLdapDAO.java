/*
 * eGovFrame LDAP議곗쭅?꾧?由?
 * Copyright The eGovFrame Open Community (http://open.egovframe.go.kr)).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ?꾩슦???덊띁媛쒕컻?륦3)
 */
package egovframework.com.ext.ldapumt.service.impl;

import java.util.List;

import javax.naming.directory.BasicAttribute;
import javax.naming.directory.SearchControls;

import org.springframework.ldap.NameNotFoundException;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.ext.ldapumt.service.UserVO;

/**
 *
 * ?ъ슜??愿??湲곕뒫???쒓났?섎뒗 DAO媛앹껜
 * 
 * @author ?꾩슦??
 * @since 2014.10.12
 * @version 1.0
 * @see
 *
 *      <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  -------    --------    ---------------------------
*   2014.10.12  ?꾩슦??         理쒖큹 ?앹꽦
 *
 *      </pre>
 */
@Repository("UserManageLdapDAO")
@org.springframework.context.annotation.Lazy
public class UserManageLdapDAO extends OrgManageLdapDAO {

	/**
	 *
	 * @param dn
	 * @return
	 */
	public List<Object> selectUserManageList(String dn) {
		List<Object> ucorgList = null;
		String filter = "objectclass=user";

		try {
			ucorgList = ldapTemplate.search(EgovWebUtil.removeLDAPInjectionRisk(dn), filter,
					SearchControls.ONELEVEL_SCOPE, new ObjectMapper<>(
							UserVO.class));
		} catch (NameNotFoundException e) {
			logger.error("[NameNotFoundException] : search fail");// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		}

		return ucorgList;

	}

	/**
	 * ?ъ슜?먮? 異붽??쒕떎.
	 * 
	 * @param vo
	 */
	public void insertUserManage(UserVO vo) {
		BasicAttribute ocattr = new BasicAttribute("objectclass");
		ocattr.add("top");
		ocattr.add("user");

		insertOrgManage(vo, ocattr);

	}

	/**
	 * ?ъ슜?먮? ?대룞?쒕떎
	 * 
	 * @param oldDn ?대룞 ????ъ슜??
	 * @param newDn ?대룞 遺??
	 */
	public void moveUserManage(String oldDn, String newDn) {
		ldapTemplate.rename(oldDn, newDn);
	}

	/**
	 * ?깅줉???ъ슜?먮? 議고쉶?쒕떎
	 * 
	 * @param dn
	 * @return
	 */
	public UserVO selectUserManageByDn(String dn) {
		return (UserVO) selectOrgManageByDn(dn, UserVO.class);
	}

	/**
	 * ?ъ슜???뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param vo
	 */
	public void updateUserManage(UserVO vo) {
		updateOrg(vo);
	}

}
