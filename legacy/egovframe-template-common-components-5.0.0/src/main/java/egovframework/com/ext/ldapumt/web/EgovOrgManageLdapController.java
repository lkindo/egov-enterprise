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
package egovframework.com.ext.ldapumt.web;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.ext.ldapumt.service.EgovOrgManageLdapService;
import egovframework.com.ext.ldapumt.service.UcorgVO;
import egovframework.com.ext.ldapumt.service.UserVO;
import jakarta.annotation.Resource;

@Controller
public class EgovOrgManageLdapController {

	@Autowired
	private EgovOrgManageLdapService orgManageLdapService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 遺?쒖쓽 ?섏쐞 遺??紐⑸줉??議고쉶 ?쒕떎.
     * @param dn
     * @param model
     * @return
     * @throws Exception
     */
	@RequestMapping(value = "/ext/ldapumt/dpt/getDeptManageSublist.do")
	public ModelAndView selectDeptManageSublist(@RequestParam("dn") String dn, ModelMap model) throws Exception {
		model.addAttribute("deptManage", orgManageLdapService.selectDeptManageSubList(dn));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);
		return modelAndView;
	}

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dn
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/getDeptManage.do")
	public ModelAndView selectDeptManage(@RequestParam("dn") String dn, ModelMap model) throws Exception {
		model.addAttribute("deptManage", orgManageLdapService.selectDeptManage(dn));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);
		return modelAndView;
	}

	/**
	 * ?깅줉???ъ슜?먯쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dn
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/getUserManage.do")
	public ModelAndView selectUserManage(@RequestParam("dn") String dn, ModelMap model) throws Exception {
		model.addAttribute("userManage", orgManageLdapService.selectUserManage(dn));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);
		return modelAndView;
	}

	/**
	 * 遺?쒕? ?깅줉?쒕떎.
	 * @param parentDn ?깅줉??遺?쒖쓽 ?곸쐞 遺??
	 * @param ou ?깅줉??遺?쒕챸
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/createNode.do")
	public ModelAndView createDeptManage(@RequestParam("dn") String parentDn, @RequestParam("text") String ou, ModelMap model) throws Exception {
		Map<Object, Object> map = orgManageLdapService.insertDeptManage(parentDn, ou);

		model.addAttribute("deptManage", map);

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * ?ъ슜?먮? ?깅줉?쒕떎.
	 * @param parentDn ?깅줉???ъ슜?먯쓽 ?곸쐞 遺??
	 * @param ou ?깅줉???ъ슜?먮챸
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/createUserNode.do")
	public ModelAndView createUserManage(@RequestParam("dn") String parentDn, @RequestParam("text") String cn, ModelMap model) throws Exception {
		Map<Object, Object> map = orgManageLdapService.insertUserManage(parentDn, cn);

		model.addAttribute("deptManage", map);

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * 遺?쒕? ??젣?쒕떎.
	 * @param dn ??젣??遺?쒖쓽 DN
	 * @param model
	 * @return
	 * @throws Exception
	 * ?섏쐞遺?쒓퉴吏 紐⑤몢 ??젣?쒕떎.
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/deleteNode.do")
	public ModelAndView removeDeptManage(@RequestParam("dn") String dn, ModelMap model) throws Exception {
		orgManageLdapService.deleteDeptManage(dn);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * 遺?쒖쓽 ?대쫫??蹂寃쏀븳??
	 * @param dn 蹂寃쎈맆 遺?쒖쓽 DN
	 * @param name 蹂寃쎈맆 ?대쫫
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/renameNode.do")
	public ModelAndView renameDeptManage(@RequestParam("id") String dn, @RequestParam("text") String name, ModelMap model) throws Exception {
		orgManageLdapService.renameDeptManage(dn, name);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * ?ъ슜?먯쓽 ?대쫫??蹂寃쏀븳??
	 * @param dn 蹂寃쎈맆 ?ъ슜?먯쓽 DN
	 * @param name 蹂寃쎈맆 ?대쫫
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/renameUserNode.do")
	public ModelAndView renameUserManage(@RequestParam("id") String dn, @RequestParam("text") String name, ModelMap model) throws Exception {
		orgManageLdapService.renameUserManage(dn, name);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * 議곗쭅???대룞?쒕떎.
	 * @param dn ?대룞?????DN
	 * @param parentDn ?대룞??DN
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/moveOrgNode.do")
	public ModelAndView moveOrgManage(@RequestParam("id") String dn, @RequestParam("parent") String parentDn, ModelMap model) throws Exception {
		orgManageLdapService.moveOrgManage(dn, parentDn);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * 遺?쒖젙蹂대? 蹂寃쏀븳??
	 * @param ucorgVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/modifyDeptManage.do")
	public ModelAndView modifyDeptManage(@ModelAttribute("ucorgVO") UcorgVO ucorgVO,
            ModelMap model) throws Exception {
		orgManageLdapService.modifyDeptManage(ucorgVO);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);

		return modelAndView;
	}

	/**
	 * ?ъ슜???뺣낫瑜?蹂寃쏀븳??
	 * @param userVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/ext/ldapumt/dpt/modifyUserManage.do")
	public ModelAndView modifyUserManage(@ModelAttribute("userVO") UserVO userVO,
			ModelMap model) throws Exception {
		orgManageLdapService.modifyUserManage(userVO);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

		ModelAndView modelAndView = new ModelAndView("jsonView", model);
		return modelAndView;
	}

	/**
	 * 議곗쭅???몃━?붾㈃?쇰줈 ?대룞
	 * @return
	 * @throws Exception
	 */
	@IncludedInfo(name="LDAP 議곗쭅???몃━",order = 3100 ,gid = 100)
    @RequestMapping("/ext/ldapumt/dpt/selectDeptManageTreeView.do")
    public String selectDeptManageTreeView() throws Exception {

        return "egovframework/com/ext/ldapumt/EgovDeptManageTree";
    }

    /**
     * 議곗쭅??洹몃옒?꾨줈 ?대룞
     * @return String
     * @exception Exception
     */
	@IncludedInfo(name="LDAP 議곗쭅??洹몃옒??,order = 3110 ,gid = 100)
    @RequestMapping("/ext/ldapumt/dpt/selectDeptManageOrgChartView.do")
    public String selectDeptManageOrgChartView() throws Exception {

    	return "egovframework/com/ext/ldapumt/EgovDeptManageOrgChart";
    }

}
