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

import java.util.ArrayList;
import java.util.Map;

import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.BasicAttribute;
import javax.naming.directory.BasicAttributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.ModificationItem;

import org.apache.commons.beanutils.BeanMap;
import org.springframework.ldap.core.LdapTemplate;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.ext.ldapumt.service.LdapObject;
import jakarta.annotation.Resource;

/**
*
* 議곗쭅??湲곕뒫 愿??DAO媛앹껜.
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
*  2020.08.28   ?뺤쭊??           ?쒖??꾨젅?꾩썙??v3.10 媛쒖꽑
*
* </pre>
*/
public class OrgManageLdapDAO extends EgovComAbstractDAO {
	@Resource(name = "ldapTemplate")
	public LdapTemplate ldapTemplate;

	/**
	 * 議곗쭅?뺣낫瑜?蹂寃쏀븯??硫붿냼??
	 * @param vo
	 * vo??dn??媛앹껜瑜??몄옄濡??섏뼱??媛앹껜濡??낅뜲?댄듃.
	 */
	protected void updateOrg(LdapObject vo) {
		String dn = vo.getDn();

		final ArrayList<ModificationItem> itemList = new ArrayList<>();

		introspect(vo, new Executable(){
			@Override
			public void execute(String key, Object value) {
				Attribute attr = new BasicAttribute(key, value);
				ModificationItem item = new ModificationItem(DirContext.REPLACE_ATTRIBUTE, attr);
				itemList.add(item);
			}
		});

		ModificationItem[] items = new ModificationItem[itemList.size()];
		itemList.toArray(items);
		ldapTemplate.modifyAttributes(dn, items);
	}

	/**
	 * DN???대떦?섎뒗 媛앹껜瑜?return?쒕떎.
	 * @param dn 議고쉶??媛앹껜??Distinguished Names
	 * @param lookupClass lookup??vo class
	 * @return lookup??vo媛앹껜
	 */
	@SuppressWarnings("unchecked")
	protected LdapObject selectOrgManageByDn(String dn, @SuppressWarnings("rawtypes") Class lookupClass) {
		LdapObject vo = null;

		vo = (LdapObject) ldapTemplate.lookup(EgovWebUtil.removeLDAPInjectionRisk(dn), new ObjectMapper<Object>(lookupClass));//2022.01 Potential LDAP Injection

		return vo;
	}

	/**
	 * 議곗쭅?뺣낫瑜?ldap????ν븳??
	 * @param vo ??ν븷 vo
	 * @param attr
	 */
	protected void insertOrgManage(LdapObject vo, BasicAttribute attr) {
		final Attributes attrs = new BasicAttributes();
		attrs.put(attr);

		introspect(vo, new Executable(){
			@Override
			public void execute(String key, Object value) {
				attrs.put(key, value);
			}
		});

		ldapTemplate.bind(vo.getDn(), null, attrs);
	}

	/**
	 * vo??field蹂꾨줈 ?뱀젙 紐낅졊???섑뻾
	 * @param vo
	 * @param e
	 */
	private void introspect(LdapObject vo, Executable e) {
		Map<Object, Object> introspected = new BeanMap(vo);

		for (Object key : introspected.keySet()) {
			if (key.equals("dn") || key.equals("class") || introspected.get(key) == null
					|| introspected.get(key).equals("")) {
				continue;
			}

			e.execute((String) key, introspected.get(key));
		}

	}

}
