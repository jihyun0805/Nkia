// 인수인계 메모: 채팅 세션/메시지 저장 계층입니다. 사용자별 대화 목록과 메시지 이력을 DB에 보존합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.repository;

import com.nkia.Orbis.domain.chatbot.session.entity.ChatSession;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    @Query("SELECT s FROM ChatSession s WHERE s.userId = :userId AND s.deleted = false ORDER BY s.updatedAt DESC")
    List<ChatSession> findByUserIdAndNotDeleted(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM ChatSession s WHERE s.id = :id AND s.userId = :userId AND s.deleted = false")
    Optional<ChatSession> findByIdAndUserIdAndNotDeleted(@Param("id") UUID id, @Param("userId") String userId);
}
