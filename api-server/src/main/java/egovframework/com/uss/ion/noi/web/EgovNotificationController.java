package egovframework.com.uss.ion.noi.web;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.notification.EgovNotificationService;
import com.company.project.service.notification.dto.NotificationDto;
import com.company.project.web.adapter.NotificationAdapter;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.noi.service.NotificationVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 정보알림이 Controller (JPA 전환)
 */
@Controller
@RequiredArgsConstructor
public class EgovNotificationController {

    private final EgovNotificationService egovNotificationService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * 정보알림이 목록 조회
     */
    @IncludedInfo(name = "정보알림이", order = 680, gid = 60)
    @RequestMapping(value = "/uss/ion/noi/selectNotificationList.do")
    public String selectNotificationList(@ModelAttribute("searchVO") NotificationVO searchVO, ModelMap model)
            throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
        Page<NotificationDto> pageResult = egovNotificationService.getNotificationList(
                searchVO.getSearchWrd(),
                PageRequest.of(pageIndex, searchVO.getPageUnit(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm")));

        List<NotificationVO> resultList = pageResult.stream()
                .map(NotificationAdapter::toVO)
                .collect(Collectors.toList());

        model.addAttribute("resultList", resultList);
        paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/uss/ion/noi/EgovNotificationList";
    }

    /**
     * 정보알림이 상세 조회
     */
    @RequestMapping("/uss/ion/noi/selectNotification.do")
    public String selectNotification(@ModelAttribute("searchVO") NotificationVO searchVO, ModelMap model)
            throws Exception {

        NotificationDto dto = egovNotificationService.getNotification(searchVO.getNtfcNo());
        NotificationVO vo = NotificationAdapter.toVO(dto);
        model.addAttribute("notification", vo);

        return "egovframework/com/uss/ion/noi/EgovNotificationDetail";
    }

    /**
     * 정보알림이 등록 화면
     */
    @RequestMapping("/uss/ion/noi/addNotification.do")
    public String addNotificationView(@ModelAttribute("searchVO") NotificationVO searchVO, ModelMap model)
            throws Exception {
        System.out.println("DEBUG: Entering addNotificationView");

        model.addAttribute("notification", new NotificationVO());
        return "egovframework/com/uss/ion/noi/EgovNotificationRegist";
    }

    /**
     * 정보알림이 등록
     */
    @RequestMapping("/uss/ion/noi/insertNotification.do")
    public String insertNotification(@ModelAttribute("notification") NotificationVO notificationVO,
            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            return "egovframework/com/uss/ion/noi/EgovNotificationRegist";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
        notificationVO.setUniqId(userId);

        NotificationDto dto = NotificationAdapter.toDto(notificationVO);
        egovNotificationService.createNotification(userId, dto);

        return "forward:/uss/ion/noi/selectNotificationList.do";
    }

    /**
     * 정보알림이 수정 화면
     */
    @RequestMapping("/uss/ion/noi/updtNotificationView.do")
    public String updtNotificationView(@ModelAttribute("searchVO") NotificationVO searchVO, ModelMap model)
            throws Exception {

        NotificationDto dto = egovNotificationService.getNotification(searchVO.getNtfcNo());
        NotificationVO vo = NotificationAdapter.toVO(dto);
        model.addAttribute("notification", vo);

        return "egovframework/com/uss/ion/noi/EgovNotificationUpdt";
    }

    /**
     * 정보알림이 수정
     */
    @RequestMapping("/uss/ion/noi/updtNotification.do")
    public String updtNotification(@ModelAttribute("notification") NotificationVO notificationVO,
            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            return "egovframework/com/uss/ion/noi/EgovNotificationUpdt";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        String userId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

        NotificationDto dto = NotificationAdapter.toDto(notificationVO);
        egovNotificationService.updateNotification(notificationVO.getNtfcNo(), userId, dto);

        return "forward:/uss/ion/noi/selectNotificationList.do";
    }

    /**
     * 정보알림이 삭제
     */
    @RequestMapping("/uss/ion/noi/deleteNotification.do")
    public String deleteNotification(@ModelAttribute("notification") NotificationVO notificationVO) throws Exception {

        egovNotificationService.deleteNotification(notificationVO.getNtfcNo());
        return "forward:/uss/ion/noi/selectNotificationList.do";
    }
}
