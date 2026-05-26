// 인수인계: 챗봇 세션 JPA repository입니다.
// 핵심 흐름: ownerId와 soft delete 조건으로 현재 사용자의 대화 목록/상세를 조회합니다.
// 같이 확인: 세션 노출 범위 변경 시 ChatSessionService.getOwnedSession을 같이 확인하세요.
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
