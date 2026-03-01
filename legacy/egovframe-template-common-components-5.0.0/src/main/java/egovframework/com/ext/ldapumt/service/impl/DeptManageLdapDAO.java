*
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

import static org.springframework.ldap.query.LdapQueryBuilder.query;

import java.util.List;
import java.util.Map;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.BasicAttribute;
import javax.naming.directory.DirContext;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;

import org.apache.commons.beanutils.BeanMap;
import org.springframework.ldap.NameNotFoundException;
import org.springframework.ldap.core.ContextSource;
import org.springframework.ldap.core.LdapTemplate;
import org.springframework.ldap.query.ContainerCriteria;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.ext.ldapumt.service.UcorgVO;
import jakarta.annotation.Resource;

/**
*
* 遺??愿??湲곕뒫???쒓났?섎뒗 DAO媛앹껜
* @author ?꾩슦??
* @since 2014.10.12
* @version 1.0
* @see
*
* <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*  ?섏젙??              ?섏젙??           ?섏젙?댁슜
*  ----------   --------   ---------------------------
*  2014.10.12   ?꾩슦??           理쒖큹 ?앹꽦
*  2017-02-13   ?댁젙?            ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
*  2020.08.28   ?뺤쭊??           ?쒖??꾨젅?꾩썙??v3.10 媛쒖꽑
*
* </pre>
*/
@Repository("DeptManageLdapDAO")
public class DeptManageLdapDAO extends OrgManageLdapDAO {

	@Resource(name = "ldapTemplate")
	public LdapTemplate ldapTemplate;

	/**
	 * DN???섏쐞遺??紐⑸줉??議고쉶
	 * @param dn 議고쉶??媛앹껜??Distinguished Name
	 * @return
	 * @throws Exception
	 */
	public List<Object> selectDeptManageSubList(String dn) throws Exception {
		List<Object> ucorgList = null;
		String filter = "objectclass=ucorg2";

		try {
			ucorgList = ldapTemplate.search(EgovWebUtil.removeLDAPInjectionRisk(dn), filter,
				SearchControls.ONELEVEL_SCOPE, new ObjectMapper<>(
					UcorgVO.class));
		} catch (NameNotFoundException e) {
			logger.error("[NameNotFoundException] : search fail");//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		}

		return ucorgList;
	}

	/**
	 * ouCode瑜??쒖슜?섏뿬 ?섏쐞 遺?쒕? 議?
	 * @param ouCode
	 * @return
	 * @throws Exception
	 */
	public List<Object> selectDeptManageSubListByOuCode(String ouCode) throws Exception {
		ContainerCriteria criteria = query().where("objectclass").is("ucorg2").and("parentoucode").is(ouCode);

		List<Object> list = ldapTemplate.search(criteria, new ObjectMapper<>(UcorgVO.class));

		return list;
	}

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param vo 遺??Vo
	 * @return deptManageVO 遺??Vo
	 * @param bannerVO
	 */
	public UcorgVO selectDeptManage(UcorgVO vo) throws Exception {
		final ContainerCriteria criteria = query().where("objectclass").is("ucorg2");

		Map<Object, Object> introspected = new BeanMap(vo);

		for (Object key : introspected.keySet()) {
			if (key.equals("dn") || key.equals("class") || introspected.get(key) == null
				|| introspected.get(key).equals("")) {
				continue;
			}

			ContainerCriteria c = query().where((String)key).is(String.valueOf(introspected.get(key)));
			criteria.and(c);
		}

		List<Object> list = null;
		list = ldapTemplate.search(criteria, new ObjectMapper<>(UcorgVO.class));

		return list == null ? null : (UcorgVO)list.get(0);
	}

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dn
	 * @return
	 */
	public UcorgVO selectDeptManageByDn(String dn) {
		return (UcorgVO)selectOrgManageByDn(dn, UcorgVO.class);
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param vo 遺??vo
	 */
	public void updateDeptManage(UcorgVO vo) throws Exception {
		updateOrg(vo);
	}

	/**
	 * 遺?쒖젙蹂대? ?깊븳??
	 * @param vo 遺??vo
	 */
	public void insertDeptManage(UcorgVO vo) throws Exception {
		BasicAttribute ocattr = new BasicAttribute("objectclass");
		ocattr.add("top");
		ocattr.add("ucorg2");

		insertOrgManage(vo, ocattr);
	}

	/**
	 * 遺?쒕? ?대룞?쒕떎.
	 * @param oldDn ?대룞???遺??
	 * @param newDn ?대룞??遺??
	 */
	public void moveDeptManage(String oldDn, String newDn) {
		ldapTemplate.rename(oldDn, newDn);
	}

	/**
	 * 遺?쒕? ??븳??
	 * @param vo 遺??vo
	 */
	public void deleteDeptManage(String dn) {
		ldapTemplate.unbind(dn, true);
	}

	/**
	 * ?섏쐞 遺??議댁옱?щ?瑜??뺤씤?쒕떎.
	 * @param vo 遺??vo
	 */
	public boolean hasChildren(String dn) throws NamingException {
		ContextSource contextSource = ldapTemplate.getContextSource();
		DirContext ctx = contextSource.getReadOnlyContext();

		String filter = "objectclass=*";
		SearchControls control = new SearchControls();
		control.setSearchScope(SearchControls.ONELEVEL_SCOPE);

		NamingEnumeration<SearchResult> n = ctx.search(EgovWebUtil.removeLDAPInjectionRisk(dn), filter, control);//2022.01 Potential LDAP Injection

		if (n != null && n.hasMore()) {
			return true;
		}

		return false;
	}
}
