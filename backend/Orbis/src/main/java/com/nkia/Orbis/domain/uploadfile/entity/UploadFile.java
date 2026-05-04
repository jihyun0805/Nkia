package com.nkia.Orbis.domain.uploadfile.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class UploadFile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. 원본 파일명: 사용자가 다운로드할 때 원래 이름으로 돌려주기 위해 필요
    @Column(nullable = false)
    private String originalFileName;

    // 2. MinIO Object Key: MinIO 버킷 내에 저장된 실제 경로와 파일명 (UUID 포함)
    // 예: "estimates/2026/04/550e8400-e29b-41d4-a716-446655440000.pdf"
    @Column(nullable = false, unique = true)
    private String objectKey;

    // 3. 파일 MIME 타입: 웹에서 파일을 다운로드하거나 브라우저에 띄울 때 헤더 설정용
    // 예: "application/pdf", "image/png"
    @Column(nullable = false)
    private String contentType;

    // 4. 파일 크기: 바이트(Byte) 단위, 화면에 용량을 표시하거나 정책 관리용
    @Column(nullable = false)
    private Long fileSize;

    @Builder
    public UploadFile(String originalFileName, String objectKey, String contentType, Long fileSize) {
        this.originalFileName = originalFileName;
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.fileSize = fileSize;
    }
}