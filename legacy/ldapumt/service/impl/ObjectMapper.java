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

import java.beans.BeanInfo;
import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.InvocationTargetException;

import javax.naming.NamingException;
import javax.naming.directory.Attributes;

import org.apache.commons.beanutils.PropertyUtils;
import org.springframework.ldap.core.ContextMapper;
import org.springframework.ldap.core.DirContextAdapter;

import egovframework.com.ext.ldapumt.service.LdapObject;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 *
 * LDAP?먯꽌 議고쉶??寃곌낵瑜?vo??留듯븨?댁＜???대옒
 * 
 * @author ?꾩슦??
 * @since 2014.10.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.10.12  ?꾩슦??         理쒖큹 ?앹꽦
 *   2017-02-13  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2025.06.21  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ImmutableField(遺덈??꾨뱶), UselessParentheses(?몃え?녿뒗 愿꾪샇)
 *
 *      </pre>
 */
public class ObjectMapper<T> implements ContextMapper<Object> {

	private final Class<T> type;

	public ObjectMapper(Class<T> class1) {
		this.type = class1;
	}

	/**
	 * ContextAdapter?먯꽌 諛쏆븘??媛앹껜瑜?vo濡?蹂?섑븳??
	 */
	@Override
	public Object mapFromContext(Object arg0) throws NamingException {
		DirContextAdapter adapter = (DirContextAdapter) arg0;
		Attributes attrs = adapter.getAttributes();

		LdapObject vo = null;

		try {
			vo = (LdapObject) type.getDeclaredConstructor().newInstance();
			// 2017-02-13 ?댁젙? ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
		} catch (InstantiationException | IllegalAccessException | IllegalArgumentException | InvocationTargetException
				| NoSuchMethodException | SecurityException e2) {
			throw new RuntimeException(e2);
		}

		vo.setDn(adapter.getDn().toString());

		BeanInfo beanInfo;
		try {
			beanInfo = Introspector.getBeanInfo(type);
		} catch (IntrospectionException e1) {
			throw new RuntimeException(e1);
		}

		PropertyDescriptor[] propertyDescriptors = beanInfo.getPropertyDescriptors();

		if (propertyDescriptors != null) {
			for (PropertyDescriptor descriptor : propertyDescriptors) {
				if (attrs.get(descriptor.getName()) != null) {
					try {
						Class<?> o = descriptor.getPropertyType();
						if (o == int.class) {
							// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
							PropertyUtils.setProperty(vo, descriptor.getName(), Integer
									.valueOf(EgovStringUtil.isNullToString(attrs.get(descriptor.getName()).get())));
						}
						if (o == String.class) {
							// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
							PropertyUtils.setProperty(vo, descriptor.getName(),
									attrs.get(EgovStringUtil.isNullToString(descriptor.getName())).get());
						}
						if (o == Boolean.class) {
							// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
							PropertyUtils.setProperty(vo, descriptor.getName(),
									"Y".equals(attrs.get(descriptor.getName()).get()));
						}

						// 2017-02-13 ?댁젙? ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
					} catch (IllegalAccessException e) {
						throw new RuntimeException(e);
					} catch (InvocationTargetException e) {
						throw new RuntimeException(e);
					} catch (NoSuchMethodException e) {
						throw new RuntimeException(e);
					}
				}

			}
		}

		return vo;
	}

}
