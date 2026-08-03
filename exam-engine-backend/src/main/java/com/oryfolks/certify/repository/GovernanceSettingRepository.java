package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.GovernanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GovernanceSettingRepository extends JpaRepository<GovernanceSetting, Long> {
}
