package com.nkia.Orbis.domain.uploadfile.repository;

import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadFileRepository extends JpaRepository<UploadFile, Long> {
}
