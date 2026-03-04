package com.company.project.domain.sms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SmsRecptnRepository extends JpaRepository<SmsRecptn, SmsRecptnId> {
    List<SmsRecptn> findByIdSmsId(String smsId);
}