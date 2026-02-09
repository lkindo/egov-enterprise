package egovframework.com.uss.ion.uas.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.vacation.UserAbsence;
import com.company.project.domain.vacation.UserAbsenceDomainRepository;

import egovframework.com.uss.ion.uas.service.EgovUserAbsnceService;
// import egovframework.com.uss.ion.uas.service.UserAbsnceVO;
import jakarta.annotation.Resource;

@Service("egovUserAbsnceService")
public class EgovUserAbsnceServiceImpl extends EgovAbstractServiceImpl implements EgovUserAbsnceService {

	@Resource(name = "commonUserAbsenceRepository")
	private UserAbsenceDomainRepository userAbsenceRepository;

	@Override
	public List<egovframework.com.uss.ion.uas.service.UserAbsnceVO> selectUserAbsnceList(
			egovframework.com.uss.ion.uas.service.UserAbsnceVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "lastUpdateDate"));
		Page<UserAbsence> page = userAbsenceRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectUserAbsnceListTotCnt(egovframework.com.uss.ion.uas.service.UserAbsnceVO searchVO)
			throws Exception {
		return (int) userAbsenceRepository.count();
	}

	@Override
	public egovframework.com.uss.ion.uas.service.UserAbsnceVO selectUserAbsnce(
			egovframework.com.uss.ion.uas.service.UserAbsnceVO searchVO) throws Exception {
		return userAbsenceRepository.findById(searchVO.getUserId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public egovframework.com.uss.ion.uas.service.UserAbsnceVO insertUserAbsnce(
			egovframework.com.uss.ion.uas.service.UserAbsnce userAbsnce,
			egovframework.com.uss.ion.uas.service.UserAbsnceVO userAbsnceVO) throws Exception {
		UserAbsence entity = UserAbsence.builder()
				.userId(userAbsnce.getUserId())
				.userAbsnceAt(userAbsnce.getUserAbsnceAt())
				.frstRegisterId(userAbsnce.getLastUpdusrId())
				.lastUpdusrId(userAbsnce.getLastUpdusrId())
				.build();
		userAbsenceRepository.save(entity);
		return toVO(entity);
	}

	@Override
	public void updateUserAbsnce(egovframework.com.uss.ion.uas.service.UserAbsnce searchVO) throws Exception {
		userAbsenceRepository.findById(searchVO.getUserId()).ifPresent(entity -> {
			entity.updateAbsence(searchVO.getUserAbsnceAt(), searchVO.getLastUpdusrId());
			userAbsenceRepository.save(entity);
		});
	}

	@Override
	public void deleteUserAbsnce(egovframework.com.uss.ion.uas.service.UserAbsnce searchVO) throws Exception {
		userAbsenceRepository.deleteById(searchVO.getUserId());
	}

	@Override
	public egovframework.com.uss.ion.uas.service.UserAbsnceVO selectUserAbsnceResult(
			egovframework.com.uss.ion.uas.service.UserAbsnceVO searchVO) throws Exception {
		return selectUserAbsnce(searchVO);
	}

	private egovframework.com.uss.ion.uas.service.UserAbsnceVO toVO(UserAbsence entity) {
		egovframework.com.uss.ion.uas.service.UserAbsnceVO vo = new egovframework.com.uss.ion.uas.service.UserAbsnceVO();
		vo.setUserId(entity.getUserId());
		vo.setUserAbsnceAt(entity.getUserAbsnceAt());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}
}
