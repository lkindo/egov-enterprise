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
package egovframework.com.ext.ldapumt.service;

/**
 *
 * Ldap怨??명꽣?섏씠???섎뒗 媛앹껜??異붿긽?대옒??
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
 *   2025.06.20  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AbstractClassWithoutAbstractMethod(異붿긽 硫붿꽌?쒓? ?녿뒗 異붿긽 ?대옒??
 *
 *      </pre>
 */
public class LdapObject {
	private String dn = "";

	public String getDn() {
		return dn;
	}

	public void setDn(String dn) {
		this.dn = dn;
	}
}
