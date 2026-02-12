package egovframework.com.cop.sms.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.company.project.service.sms.EgovSmsService;
import com.company.project.service.sms.dto.SmsDto;

import egovframework.com.cop.sms.service.EgovSmsInfoService;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsConnection;
import egovframework.com.cop.sms.service.SmsRecptn;
import egovframework.com.cop.sms.service.SmsVO;
import lombok.RequiredArgsConstructor;

/**
 * 문자메시지를 위한 서비스 구현 클래스
 * 
 * @author 공통컴포넌트개발팀 한성곤
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.06.18  한성곤          최초 생성
 *
 *      </pre>
 */
@Service("EgovSmsInfoService")
@RequiredArgsConstructor
public class EgovSmsInfoServiceImpl extends EgovAbstractServiceImpl implements EgovSmsInfoService {

    private final EgovSmsService smsService;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovSmsInfoServiceImpl.class);

    private String formatPhoneNumber(String number) {
        if (number == null || number.trim().equals("")) {
            return "";
        }

        StringBuilder buffer = new StringBuilder();

        if (number.length() == 9) { // 02-500-1234 형식
            buffer.append(number.substring(0, 2));
            buffer.append("-");
            buffer.append(number.substring(2, 2 + 3));
            buffer.append("-");
            buffer.append(number.substring(2 + 3, 2 + 3 + 4));

        } else if (number.length() == 10) {
            if (number.startsWith("02")) { // 02-5000-1234 형식
                buffer.append(number.substring(0, 2));
                buffer.append("-");
                buffer.append(number.substring(2, 2 + 4));
                buffer.append("-");
                buffer.append(number.substring(2 + 4, 2 + 4 + 4));

            } else { // 031-500-1234 형식
                buffer.append(number.substring(0, 3));
                buffer.append("-");
                buffer.append(number.substring(3, 3 + 3));
                buffer.append("-");
                buffer.append(number.substring(3 + 3, 3 + 3 + 4));
            }

        } else if (number.length() == 11) { // 031-5000-1234 형식
            buffer.append(number.substring(0, 3));
            buffer.append("-");
            buffer.append(number.substring(3, 3 + 4));
            buffer.append("-");
            buffer.append(number.substring(3 + 4, 3 + 4 + 4));

        } else if (number.length() == 12) { // 0505-5000-1234 형식
            buffer.append(number.substring(0, 4));
            buffer.append("-");
            buffer.append(number.substring(4, 4 + 4));
            buffer.append("-");
            buffer.append(number.substring(4 + 4, 4 + 4 + 4));

        } else {
            return number;
        }

        return buffer.toString();
    }

    @Override
    public Map<String, Object> selectSmsInfs(SmsVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize());
        Page<SmsDto> page = smsService.getSmsList(searchVO.getSearchCnd(), searchVO.getSearchWrd(), pageable);

        List<SmsVO> result = EgovSmsAdapter.toVOList(page);

        // 전화번호 포맷 처리
        for (SmsVO element : result) {
            String phone = element.getTrnsmitTelno();
            element.setTrnsmitTelno(formatPhoneNumber(phone));
        }

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", Long.toString(page.getTotalElements()));

        return map;
    }

    @Override
    public void insertSmsInf(Sms sms) throws Exception {
        smsService.sendSms(sms.getFrstRegisterId(), EgovSmsAdapter.toDto(sms));
    }

    @Override
    public SmsVO selectSmsInf(SmsVO searchVO) throws Exception {
        SmsDto dto = smsService.getSms(searchVO.getSmsId());
        SmsVO vo = EgovSmsAdapter.toVO(dto);

        // 전화번호 포맷 처리
        if (vo != null) {
            vo.setTrnsmitTelno(formatPhoneNumber(vo.getTrnsmitTelno()));
            if (vo.getRecptn() != null) {
                for (SmsRecptn element : vo.getRecptn()) {
                    element.setRecptnTelno(formatPhoneNumber(element.getRecptnTelno()));
                }
            }
        }

        return vo;
    }

    @Override
    public SmsConnection sendRequsest(SmsConnection smsConn) throws Exception {
        // Direct request sending is deprecated in favor of SmsService.sendSms
        return smsConn;
    }

    @Override
    public SmsConnection[] sendRequsest(SmsConnection[] smsConn) throws Exception {
        // Direct multiple request sending is deprecated in favor of SmsService.sendSms
        return smsConn;
    }
}
