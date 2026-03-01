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

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.ext.ldapumt.service.EgovOrgManageLdapService;
import egovframework.com.ext.ldapumt.service.LdapTreeObject;
import egovframework.com.ext.ldapumt.service.UcorgVO;
import egovframework.com.ext.ldapumt.service.UserVO;
import jakarta.annotation.Resource;

/**
 *
 * 議곗쭅??湲곕뒫 愿???쒕퉬??媛앹껜
 * 
 * @author ?꾩슦??
 * @since 2014.10.12
 * @version 1.0
 * @see
 *
 *      <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*  ?섏젙??              ?섏젙??            ?섏젙?댁슜
*  ----------   --------   ---------------------------
*  2014.10.12   ?꾩슦??           理쒖큹 ?앹꽦
*  2020.08.28   ?뺤쭊??           ?쒖??꾨젅?꾩썙??v3.10 媛쒖꽑
*  2023.08.10   ?좎슜??           LDAP ?ㅻ쪟 ?섏젙
 *
 *      </pre>
 */
@Service("orgManageLdapService")
@org.springframework.context.annotation.Lazy
public class EgovOrgManageLdapServiceImpl extends EgovAbstractServiceImpl implements EgovOrgManageLdapService {

	@Resource(name = "DeptManageLdapDAO")
	private DeptManageLdapDAO deptManageLdapDAO;

	@Resource(name = "UserManageLdapDAO")
	private UserManageLdapDAO userManageLdapDAO;

	/**
	 * ?깅줉??遺?쒖쓽 ?뺣낫瑜?議고쉶?쒕떎.
	 */
	@Override
	public Map<Object, Object> selectDeptManage(String dn) {
		UcorgVO vo = deptManageLdapDAO.selectDeptManageByDn(dn);

		Map<Object, Object> map = new org.apache.commons.beanutils.BeanMap(vo);

		return map;
	}

	/**
	 * ?깅줉???ъ슜?먯쓽 ?뺣낫瑜?議고쉶?쒕떎.
	 */
	@Override
	public Map<Object, Object> selectUserManage(String dn) {
		UserVO vo = userManageLdapDAO.selectUserManageByDn(dn);

		Map<Object, Object> map = new org.apache.commons.beanutils.BeanMap(vo);

		return map;
	}

	/**
	 * ?깅줉??遺?쒖쓽 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public Map<Object, Object> selectDeptManageSubList(String dn) throws Exception {
		UcorgVO u = deptManageLdapDAO.selectDeptManageByDn(dn);

		LdapTreeObject object = new LdapTreeObject(u.getOu(), dn);

		List<Object> list = deptManageLdapDAO.selectDeptManageSubList(dn);

		for (Object o : list) {
			UcorgVO vo = (UcorgVO) o;
			boolean hasChildren = deptManageLdapDAO.hasChildren(vo.getDn());
			object.addChild(vo, hasChildren);
		}

		List<Object> userList = userManageLdapDAO.selectUserManageList(dn);

		for (Object o : userList) {
			UserVO vo = (UserVO) o;
			object.addChild(vo);
		}

		Map<Object, Object> map = new org.apache.commons.beanutils.BeanMap(object);

		return map;
	}

	/**
	 * ouCode濡??섏쐞遺?쒖쓽 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<Object> selectDeptManageSubListByOuCode(String ouCode) throws Exception {
		return deptManageLdapDAO.selectDeptManageSubListByOuCode(ouCode);
	}

	/**
	 * VO??議곌굔??遺?⑺븯??遺?쒕? 議고쉶?쒕떎.
	 */
	@Override
	public UcorgVO selectDeptManage(UcorgVO vo) throws Exception {
		return deptManageLdapDAO.selectDeptManage(vo);
	}

	/**
	 * 湲곕벑濡앸맂 遺?쒖젙蹂대? ?섏젙?쒕떎.
	 */
	@Override
	public void updateDeptManage(UcorgVO vo) throws Exception {
		deptManageLdapDAO.updateDeptManage(vo);
	}

	/**
	 * 遺?쒕? 異붽??쒕떎.
	 */
	@Override
	public Map<Object, Object> insertDeptManage(String parentDn, String ou) throws Exception {
		UcorgVO vo = new UcorgVO();
		if ("j1_1".equals(parentDn)) { // Root?먯꽌 ?앹꽦
			vo.setDn("ou=" + ou);
		} else { // Root?먯꽌 ?앹꽦
			vo.setDn("ou=" + ou + ", " + parentDn);
		}
		vo.setOu(ou);
		vo.setOuCode("0000000");

		deptManageLdapDAO.insertDeptManage(vo);
		LdapTreeObject object = new LdapTreeObject(vo.getOu(), vo.getDn());

		Map<Object, Object> map = new org.apache.commons.beanutils.BeanMap(object);

		return map;
	}

	/**
	 * ?ъ슜?먮? 異붽??쒕떎.
	 */
	@Override
	public Map<Object, Object> insertUserManage(String parentDn, String cn) throws Exception {
		UserVO vo = new UserVO();
		vo.setDn("cn=" + cn + ", " + parentDn);
		vo.setCn(cn);

		userManageLdapDAO.insertUserManage(vo);

		LdapTreeObject object = new LdapTreeObject(vo.getOu(), vo.getDn());

		Map<Object, Object> map = new org.apache.commons.beanutils.BeanMap(object);

		return map;
	}

	/**
	 * ?ъ슜???뺣낫瑜???젣?쒕떎.
	 */
	@Override
	public void deleteDeptManage(String dn) {
		deptManageLdapDAO.deleteDeptManage(dn);
	}

	/**
	 * 遺?쒖쓽 ?대쫫??蹂寃쏀븳??
	 */
	@Override
	public void renameDeptManage(String dn, String name) {
		String[] nodes = dn.split(",");
		nodes[0] = "ou=" + name;

		String newDn = "";
		for (String node : nodes) {
			newDn = newDn + "," + node;
		}

		newDn = newDn.substring(1);
		deptManageLdapDAO.moveDeptManage(dn, newDn);
	}

	/**
	 * ?ъ슜?먯쓽 ?대쫫??蹂寃쏀븳??
	 */
	@Override
	public void renameUserManage(String dn, String name) {
		String[] nodes = dn.split(",");
		nodes[0] = "cn=" + name;

		String newDn = "";
		for (String node : nodes) {
			newDn = newDn + "," + node;
		}

		newDn = newDn.substring(1);
		userManageLdapDAO.moveUserManage(dn, newDn);
	}

	/**
	 * 議곗쭅???대룞?쒕떎.
	 */
	@Override
	public void moveOrgManage(String dn, String parentDn) {
		String name = dn.split(",")[0];

		deptManageLdapDAO.moveDeptManage(dn, name + "," + parentDn);
	}

	/**
	 * 遺?쒖젙蹂대? ?섏젙?쒕떎.
	 */
	@Override
	public void modifyDeptManage(UcorgVO ucorgVO) throws Exception {
		deptManageLdapDAO.updateDeptManage(ucorgVO);
	}

	/**
	 * ?ъ슜?먯쓽 ?뺣낫瑜??섏젙?쒕떎.
	 */
	@Override
	public void modifyUserManage(UserVO userVO) {
		userManageLdapDAO.updateUserManage(userVO);
	}

}
