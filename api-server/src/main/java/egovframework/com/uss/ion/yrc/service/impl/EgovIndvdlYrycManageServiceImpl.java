package egovframework.com.uss.ion.yrc.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.vacation.AnnualLeave;
import com.company.project.domain.vacation.AnnualLeaveRepository;

import egovframework.com.uss.ion.yrc.service.EgovIndvdlYrycManageService;
import jakarta.annotation.Resource;

@Service("egovIndvdlYrycManageService")
public class EgovIndvdlYrycManageServiceImpl extends EgovAbstractServiceImpl
		implements egovframework.com.uss.ion.yrc.service.EgovIndvdlYrycManageService {

	@Resource(name = "annualLeaveRepository")
	private AnnualLeaveRepository annualLeaveRepository;

	@Override
	public List<egovframework.com.uss.ion.yrc.service.IndvdlYrycManage> selectIndvdlYrycManageList(
			egovframework.com.uss.ion.yrc.service.IndvdlYrycManage indvdlYrycManage) throws Exception {
		Pageable pageable = PageRequest.of(indvdlYrycManage.getPageIndex() - 1, indvdlYrycManage.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "id.occrrncYear"));
		Page<AnnualLeave> page = annualLeaveRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectIndvdlYrycManageListTotCnt(egovframework.com.uss.ion.yrc.service.IndvdlYrycManage indvdlYrycManage)
			throws Exception {
		return (int) annualLeaveRepository.count();
	}

	@Override
	public void insertIndvdlYrycManage(egovframework.com.uss.ion.yrc.service.IndvdlYrycManage indvdlYrycManage)
			throws Exception {
		AnnualLeave entity = AnnualLeave.builder()
				.id(new AnnualLeave.AnnualLeaveId(indvdlYrycManage.getMberId(), indvdlYrycManage.getOccrrncYear()))
				.occrncYrycCo(indvdlYrycManage.getOccrncYrycCo())
				.useYrycCo(indvdlYrycManage.getUseYrycCo())
				.remndrYrycCo(indvdlYrycManage.getRemndrYrycCo())
				.frstRegisterId(indvdlYrycManage.getMberId())
				.build();
		annualLeaveRepository.save(entity);
	}

	@Override
	public void updtIndvdlYrycManage(egovframework.com.uss.ion.yrc.service.IndvdlYrycManage indvdlYrycManage)
			throws Exception {
		annualLeaveRepository
				.findById(
						new AnnualLeave.AnnualLeaveId(indvdlYrycManage.getMberId(), indvdlYrycManage.getOccrrncYear()))
				.ifPresent(entity -> {
					entity.updateUsage(indvdlYrycManage.getUseYrycCo(), indvdlYrycManage.getRemndrYrycCo(),
							indvdlYrycManage.getMberId());
					annualLeaveRepository.save(entity);
				});
	}

	@Override
	public void deleteIndvdlYrycManage(egovframework.com.uss.ion.yrc.service.IndvdlYrycManage indvdlYrycManage)
			throws Exception {
		annualLeaveRepository.deleteById(
				new AnnualLeave.AnnualLeaveId(indvdlYrycManage.getMberId(), indvdlYrycManage.getOccrrncYear()));
	}

	private egovframework.com.uss.ion.yrc.service.IndvdlYrycManage toVO(AnnualLeave entity) {
		egovframework.com.uss.ion.yrc.service.IndvdlYrycManage vo = new egovframework.com.uss.ion.yrc.service.IndvdlYrycManage();
		vo.setMberId(entity.getId().getUserId());
		vo.setOccrrncYear(entity.getId().getOccrrncYear());
		vo.setOccrncYrycCo(entity.getOccrncYrycCo());
		vo.setUseYrycCo(entity.getUseYrycCo());
		vo.setRemndrYrycCo(entity.getRemndrYrycCo());
		return vo;
	}
}
