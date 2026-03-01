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

import java.io.Serializable;
import java.util.ArrayList;

/**
 *
 * Ldap?곗씠?곕? HTML jsTree?꾨젅?꾩썙?ъ뿉???ъ슜?????덈룄濡?蹂?섑븳 媛앹껜
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
 *
 * 
 *      </pre>
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.10.12  ?꾩슦??         理쒖큹 ?앹꽦
 *   2025.06.20  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
public class LdapTreeObject implements Serializable {
	private static final long serialVersionUID = 1L;

	public String getText() {
		return text;
	}

	public void setText(String text) {
		this.text = text;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public Icon getIcon() {
		return icon;
	}

	public void setIcon(Icon icon) {
		this.icon = icon;
	}

	public State getState() {
		return state;
	}

	public void setState(State state) {
		this.state = state;
	}

	public ArrayList<Child> getChildren() {
		return children;
	}

	public void setChildren(ArrayList<Child> children) {
		this.children = children;
	}

	public String text;
	public String id;
	public Icon icon = Icon.DEPT;

	public State state = new State();
	public ArrayList<Child> children = new ArrayList<Child>();

	enum Icon {
		USER, DEPT
	}

	@SuppressWarnings("unused")
	private class State implements Serializable {
		private static final long serialVersionUID = 9002883980244257854L;
		boolean opened = true;

		public boolean isOpened() {
			return opened;
		}

		public void setOpened(boolean opened) {
			this.opened = opened;
		}

		public boolean isDisabled() {
			return disabled;
		}

		public void setDisabled(boolean disabled) {
			this.disabled = disabled;
		}

		boolean disabled = false;
	}

	public LdapTreeObject(String text, String id) {
		this.text = text;
		this.id = id;
	}

	@SuppressWarnings("unused")
	private class Child implements Serializable {
		private static final long serialVersionUID = 5457240443272184153L;

		public Child(String dn, String ou, boolean hasChildren, Icon icon) {
			this.id = dn;
			this.text = ou;
			this.children = hasChildren;
			this.icon = icon;
		}

		String id;

		public String getId() {
			return id;
		}

		public void setId(String id) {
			this.id = id;
		}

		public String getText() {
			return text;
		}

		public void setText(String text) {
			this.text = text;
		}

		public boolean isChildren() {
			return children;
		}

		public void setChildren(boolean children) {
			this.children = children;
		}

		public Icon getIcon() {
			return icon;
		}

		public void setIcon(Icon icon) {
			this.icon = icon;
		}

		String text;
		boolean children = false;
		Icon icon = Icon.DEPT;
	}

	public void addChild(UcorgVO vo, boolean b) {
		children.add(new Child(vo.getDn(), vo.getOu(), b, Icon.DEPT));
	}

	public void addChild(UserVO vo) {
		children.add(new Child(vo.getDn(), vo.getCn(), false, Icon.USER));

	}
}
