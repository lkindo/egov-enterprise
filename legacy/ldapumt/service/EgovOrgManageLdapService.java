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
package egovframework.com.ext.ldapumt.service;

import java.util.List;
import java.util.Map;

/**
*
* Controller?먯꽌 ?붿껌?섎뒗 ?쒕퉬?ㅻ? ?쒓났?섎뒗 Service媛앹껜???명꽣?섏씠?ㅻ? ?뺤쓽?쒕떎.
* @author ?꾩슦??
* @since 2014.10.12
* @version 1.0
* @see
*
* <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  -------    --------    ---------------------------
*   2014.10.12  ?꾩슦??         理쒖큹 ?앹꽦
*   2023.08.10  ?좎슜??         LDAP ?ㅻ쪟 ?섏젙

*
* </pre>
*/

public interface EgovOrgManageLdapService {

	/**
	 * ?섏쐞遺??紐⑸줉 議고쉶 
	 * @param dn 議고쉶??遺?쒖쓽 dn
	 * @return
	 * @throws Exception
	 */
	public Map<Object, Object> selectDeptManageSubList(String dn) throws Exception;

	/**
	 * ?섏쐞遺?쒖쓽 紐⑸줉 議고쉶
	 * @param ouCode 議고쉶??遺?쒖쓽  oucode 
	 * @return
	 * @throws Exception
	 */
	public List<Object> selectDeptManageSubListByOuCode(String ouCode) throws Exception;

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param vo - 遺??Vo
	 * @return deptManageVO - 遺??Vo
	 * @param bannerVO
	 */
	public UcorgVO selectDeptManage(UcorgVO vo) throws Exception;

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param vo - 遺??vo
	 */
	public void updateDeptManage(UcorgVO vo) throws Exception;

	/**
	 * ?좉퇋遺?쒕? ?깅줉 
	 * @param parentDn ?깅줉??遺?쒖쓽 ?곸쐞遺??
	 * @param ou 遺id
	 * @return
	 * @throws Exception
	 */
	public Map<Object, Object> insertDeptManage(String parentDn, String ou) throws Exception;
	
	/**
	 * ?좉퇋 ?ъ슜?먮? ?깅줉 
	 * @param parentDn ?ъ슜?먯쓽 遺??
	 * @param cn ?ъ슜?먯쓽 id
	 * @return
	 * @throws Exception
	 */
	public Map<Object, Object> insertUserManage(String parentDn, String cn) throws Exception;

	/**
	 * 遺???뺣낫 ??젣  
	 * @param dn
	 */
	public void deleteDeptManage(String dn);

	/**
	 * 遺???대쫫 蹂寃?
	 * @param dn
	 * @param name
	 */
	public void renameDeptManage(String dn, String name);

	/**
	 * ?ъ슜???대쫫 蹂寃?
	 * @param dn
	 * @param name
	 */
	public void renameUserManage(String dn, String name);

	/**
	 * 議곗쭅???대룞?쒕떎
	 * @param dn
	 * @param parentDn
	 */
	public void moveOrgManage(String dn, String parentDn);

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dn 遺?쒖쓽 DN
	 * @return
	 */
	public Map<Object, Object> selectDeptManage(String dn);

	/**
	 * ?깅줉???ъ슜?먯쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dn ?ъ슜?먯쓽 DN
	 * @return
	 */
	public Map<Object, Object> selectUserManage(String dn);

	/**
	 * ?깅줉??遺?쒖쓽 ?뺣낫瑜??섏젙?쒕떎.
	 * @param ucorgVO
	 * @throws Exception
	 */
	public void modifyDeptManage(UcorgVO ucorgVO) throws Exception;

	/**
	 * ?깅줉???ъ슜?먯쓽 ?뺣낫瑜??섏젙?쒕떎.
	 * @param ucorgVO
	 * @throws Exception
	 */
	public void modifyUserManage(UserVO userVO);
}
